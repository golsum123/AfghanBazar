#!/usr/bin/env python3
"""Builds scripts/seed-catalog/colab/generate_product_images.ipynb from seed-assets/product-images/manifest.json.

The manifest (prompts + exact file names) is embedded in the notebook, so it runs in Google Colab with no
uploads, no repo access and no credentials.   python3 scripts/seed-catalog/build_colab_notebook.py [--check]
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "seed-assets" / "product-images" / "manifest.json"
OUT = ROOT / "scripts" / "seed-catalog" / "colab" / "generate_product_images.ipynb"


def md(text, tags=None):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(keepends=True)}


def code(text, tags=None):
    meta = {"tags": tags} if tags else {}
    return {"cell_type": "code", "metadata": meta, "execution_count": None, "outputs": [], "source": text.strip("\n").splitlines(keepends=True)}


INTRO = """
# AfghanBazaar - generate the 30 sample product images (free Colab GPU)

Creates one image per product with **Stable Diffusion XL** (free to download, no account or token needed),
saves each under its exact file name, resizes to **1600 x 1600 JPEG**, validates them and builds a ZIP to download.

**How to run (about 5 clicks):**
1. Menu **Runtime > Change runtime type > T4 GPU > Save**.
2. Menu **Runtime > Run all**. First run downloads the model (~7 GB, a few minutes), then makes the images (~15-25 min).
3. When the last cell finishes, your browser downloads `afghanbazaar-product-images.zip`.
4. Look at the contact sheet. To redo a bad image, add its file name to `FORCE` in *Settings* and run the cells from *Settings* down again.

Nothing here uploads to Supabase and no credentials are used. Free GPU time is not guaranteed by Google: if you hit a limit,
wait and run again; finished images are kept and skipped (resume). Set `USE_DRIVE = True` in *Settings* to also keep progress in
your Google Drive if the session disconnects.
"""

GPU_CHECK = """
#@title 1. Check the GPU
import subprocess
_out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"], capture_output=True, text=True)
if _out.returncode != 0:
    raise SystemExit("No GPU found. Use the menu: Runtime > Change runtime type > T4 GPU > Save, then Runtime > Run all.")
print("GPU:", _out.stdout.strip())
"""

INSTALL = """
#@title 2. Install libraries (about 1 minute)
%pip install -q "diffusers>=0.30" transformers accelerate safetensors pillow tqdm
"""

SETTINGS = """
#@title 3. Settings
import hashlib, io, json, os, re, shutil, time, zipfile
from pathlib import Path
from PIL import Image, ImageStat, ImageDraw
from tqdm.auto import tqdm

MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"   # free, public, no token needed
GEN_SIZE = 1024        # SDXL's native size
OUT_SIZE = 1600        # final square size (images are upscaled from 1024)
STEPS = 30
GUIDANCE = 6.5
MAX_ATTEMPTS = 4       # tries per image (each uses a new random seed)
ONLY = None            # e.g. [1, 5, 9] = only these product numbers (1-30)
FORCE = []             # e.g. ["07-afghan-baluchi-prayer-rug.jpg"] = redo these files
USE_DRIVE = False      # True = keep progress in Google Drive (asks you to allow access)

if USE_DRIVE:
    from google.colab import drive
    drive.mount("/content/drive")
OUT_DIR = Path(os.environ.get("PRODUCT_IMAGES_DIR") or ("/content/drive/MyDrive/AfghanBazaar-product-images" if USE_DRIVE else "/content/product-images"))
OUT_DIR.mkdir(parents=True, exist_ok=True)
ZIP_PATH = OUT_DIR.parent / "afghanbazaar-product-images.zip"
print("Images are saved in:", OUT_DIR)
"""

MANIFEST_CELL = '''
#@title 4. Load the 30 prompts (copy of seed-assets/product-images/manifest.json)
MANIFEST_JSON = r"""__MANIFEST__"""
manifest = json.loads(MANIFEST_JSON)
_override = Path("/content/manifest.json")          # optional: upload your own manifest.json to /content to use it instead
if _override.exists():
    manifest = json.loads(_override.read_text(encoding="utf-8"))
    print("Using uploaded /content/manifest.json")

FILE_RE = re.compile(r"^[0-9]{2}-[a-z0-9-]+\\.jpg$")
ITEMS = manifest["items"]
assert len(ITEMS) == 30, f"expected 30 products, found {len(ITEMS)}"
assert len({i["file"] for i in ITEMS}) == 30, "duplicate file names in manifest"
assert all(FILE_RE.match(i["file"]) for i in ITEMS), "unexpected file name in manifest"
NEGATIVE = manifest["negativePrompt"]
STYLE = manifest["compactStyle"]
for _i in ITEMS:
    _i["final_prompt"] = f'{_i["subject"]}, {STYLE}'
print(f"{len(ITEMS)} prompts loaded. First: {ITEMS[0]['file']}")
print("Example prompt:", ITEMS[0]["final_prompt"])
'''

HELPERS = """
#@title 5. Helper functions (checks, resize, progress log)
LOG_PATH = OUT_DIR / "generation-log.json"
log = json.loads(LOG_PATH.read_text()) if LOG_PATH.exists() else []

def check_image(img):
    '''Return a problem description, or None if the raw image looks usable.'''
    if min(img.size) < 512:
        return f"too small {img.size}"
    if max(ImageStat.Stat(img.convert("RGB")).stddev) < 4:
        return "blank or uniform image"
    return None

def to_output_jpeg(img):
    img = img.convert("RGB")
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))
    img = img.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=92, optimize=True)
    return buf.getvalue()

def file_status(path):
    '''Return (ok, reason) for an image file on disk.'''
    try:
        with Image.open(path) as im:
            im.load()
            if im.format != "JPEG":
                return False, f"not a JPEG ({im.format})"
            if im.size != (OUT_SIZE, OUT_SIZE):
                return False, f"size {im.size}, expected {OUT_SIZE}x{OUT_SIZE}"
            if max(ImageStat.Stat(im.convert("RGB")).stddev) < 4:
                return False, "blank or uniform image"
    except Exception as exc:
        return False, f"unreadable: {exc}"
    if Path(path).stat().st_size > 5 * 1024 * 1024:
        return False, "larger than 5 MB"
    return True, "ok"

def save_log():
    tmp = LOG_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(log, indent=2))
    tmp.replace(LOG_PATH)
print("Ready.")
"""

LOAD_MODEL = """
#@title 6. Load the model (first run downloads ~7 GB)
import torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler

pipe = StableDiffusionXLPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float16, variant="fp16", use_safetensors=True).to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
pipe.enable_vae_slicing()

def generate(prompt, negative, seed):
    gen = torch.Generator("cuda").manual_seed(seed)
    return pipe(prompt=prompt, negative_prompt=negative, width=GEN_SIZE, height=GEN_SIZE,
                num_inference_steps=STEPS, guidance_scale=GUIDANCE, generator=gen).images[0]

# SDXL ignores words after ~77 tokens: warn if any prompt is that long.
for _i in ITEMS:
    _n = len(pipe.tokenizer(_i["final_prompt"]).input_ids)
    if _n > 77:
        print(f"WARNING: prompt for {_i['file']} has {_n} tokens; the end will be ignored")
print("Model ready.")
"""

GENERATE = """
#@title 7. Generate all images (safe to re-run: finished images are skipped)
def run_generation():
    wanted = [(n, it) for n, it in enumerate(ITEMS, 1) if not ONLY or n in ONLY]
    made, skipped, failed = 0, 0, []
    started = time.time()
    bar = tqdm(wanted, desc="images", unit="img")
    for n, it in bar:
        target = OUT_DIR / it["file"]
        if target.exists() and it["file"] not in FORCE:
            ok, why = file_status(target)
            if ok:
                skipped += 1
                continue
            print(f"  {it['file']} exists but is invalid ({why}); regenerating")
        done = False
        for attempt in range(1, MAX_ATTEMPTS + 1):
            seed = n * 1000 + attempt + (7919 if it["file"] in FORCE else 0)
            try:
                img = generate(it["final_prompt"], NEGATIVE, seed)
                problem = check_image(img)
                if problem:
                    print(f"  {it['file']} attempt {attempt}: rejected ({problem})")
                    continue
                data = to_output_jpeg(img)
                tmp = target.with_suffix(".tmp")
                tmp.write_bytes(data)
                tmp.replace(target)
                log.append({"file": it["file"], "productId": it["productId"], "model": MODEL_ID, "seed": seed,
                            "steps": STEPS, "guidance": GUIDANCE, "bytes": len(data),
                            "sha256": hashlib.sha256(data).hexdigest()})
                save_log()
                made += 1
                done = True
                break
            except Exception as exc:
                print(f"  {it['file']} attempt {attempt}/{MAX_ATTEMPTS} failed: {type(exc).__name__}: {str(exc)[:150]}")
                try:
                    import torch
                    torch.cuda.empty_cache()
                except Exception:
                    pass
                time.sleep(2)
        if not done:
            failed.append(it["file"])
        bar.set_postfix(made=made, skipped=skipped, failed=len(failed))
    mins = (time.time() - started) / 60
    print(f"\\nDone in {mins:.1f} min: made={made} skipped={skipped} failed={len(failed)}")
    for f in failed:
        print("FAILED:", f, "(re-run this cell to try again)")
    return failed

FAILED = run_generation()
"""

CONTACT = """
#@title 8. Contact sheet - LOOK at every image and check it matches its product
def contact_sheet(cols=6, thumb=260):
    present = [(n, it) for n, it in enumerate(ITEMS, 1) if (OUT_DIR / it["file"]).exists()]
    rows = max(1, (len(present) + cols - 1) // cols)
    sheet = Image.new("RGB", (cols * thumb, rows * (thumb + 28)), "white")
    d = ImageDraw.Draw(sheet)
    for k, (n, it) in enumerate(present):
        with Image.open(OUT_DIR / it["file"]) as im:
            t = im.convert("RGB").resize((thumb, thumb))
        x, y = (k % cols) * thumb, (k // cols) * (thumb + 28)
        sheet.paste(t, (x, y))
        d.text((x + 4, y + thumb + 6), f"{n}. {it['file'][3:34]}", fill="black")
    return sheet

SHEET = contact_sheet()
try:
    from IPython.display import display
    display(SHEET)
except Exception:
    pass
print("Check for: wrong object, garbled text, logos, distorted shapes, people/hands, near-duplicates.")
print("To redo some: put their file names in FORCE (Settings cell), then run Settings and the cells below it again.")
"""

VALIDATE = """
#@title 9. Validate all 30 files
def dhash(path, size=8):
    with Image.open(path) as im:
        g = im.convert("L").resize((size + 1, size))
    px = list(g.tobytes())
    return sum(1 << i for i, (a, b) in enumerate(((px[r * (size + 1) + c], px[r * (size + 1) + c + 1]) for r in range(size) for c in range(size))) if a > b)

def validate_all():
    problems, sha, hashes = [], {}, {}
    for n, it in enumerate(ITEMS, 1):
        p = OUT_DIR / it["file"]
        if not p.exists():
            problems.append(f"missing: {it['file']}")
            continue
        ok, why = file_status(p)
        if not ok:
            problems.append(f"{it['file']}: {why}")
            continue
        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        if digest in sha:
            problems.append(f"{it['file']} is byte-identical to {sha[digest]}")
        sha[digest] = it["file"]
        hashes[it["file"]] = dhash(p)
    names = list(hashes)
    for a in range(len(names)):
        for b in range(a + 1, len(names)):
            if bin(hashes[names[a]] ^ hashes[names[b]]).count("1") <= 3:
                problems.append(f"{names[a]} and {names[b]} look almost identical")
    return problems

PROBLEMS = validate_all()
present = sum((OUT_DIR / i["file"]).exists() for i in ITEMS)
print(f"{present}/30 images present")
if PROBLEMS:
    print("PROBLEMS:")
    for p in PROBLEMS:
        print(" -", p)
else:
    print("ALL 30 images are valid, correctly named, 1600x1600 JPEG and distinct.")
"""

ZIP = """
#@title 10. Build the ZIP
def build_zip():
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        for it in ITEMS:
            p = OUT_DIR / it["file"]
            if p.exists():
                z.write(p, arcname=it["file"])
        if LOG_PATH.exists():
            z.write(LOG_PATH, arcname="generation-log.json")
    return ZIP_PATH

build_zip()
with zipfile.ZipFile(ZIP_PATH) as z:
    names = [n for n in z.namelist() if n.endswith(".jpg")]
print(f"{ZIP_PATH.name}: {len(names)} images, {ZIP_PATH.stat().st_size // 1024 // 1024} MB")
if PROBLEMS:
    print("NOTE: the validation cell reported problems - fix those before using these images.")
"""

DOWNLOAD = """
#@title 11. Download the ZIP
from google.colab import files
files.download(str(ZIP_PATH))
"""

NEXT = """
## After the download
Unzip into `seed-assets/product-images/` in the project (the 30 `.jpg` files go directly in that folder), then:
`node scripts/seed-catalog/validate.mjs --require-images`. Tell Claude when the files are in place, and the images get reviewed
and uploaded to the private bucket with the existing upload script. Review each image yourself first.
"""


def build():
    manifest_text = MANIFEST.read_text(encoding="utf-8")
    assert '"""' not in manifest_text
    json.loads(manifest_text)
    cells = [
        md(INTRO),
        code(GPU_CHECK, ["colab-only"]),
        code(INSTALL, ["colab-only"]),
        code(SETTINGS),
        code(MANIFEST_CELL.replace("__MANIFEST__", manifest_text.strip())),
        code(HELPERS),
        code(LOAD_MODEL, ["gpu"]),
        code(GENERATE),
        code(CONTACT),
        code(VALIDATE),
        code(ZIP),
        code(DOWNLOAD, ["colab-only"]),
        md(NEXT),
    ]
    nb = {
        "cells": cells,
        "metadata": {
            "colab": {"provenance": [], "gpuType": "T4", "name": "AfghanBazaar product images"},
            "accelerator": "GPU",
            "kernelspec": {"display_name": "Python 3", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 0,
    }
    return json.dumps(nb, indent=1, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    text = build()
    if "--check" in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("notebook in sync" if ok else f"STALE: {OUT}")
        sys.exit(0 if ok else 1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({len(text) // 1024} KB, manifest sha256 {hashlib.sha256(MANIFEST.read_bytes()).hexdigest()[:12]})")
