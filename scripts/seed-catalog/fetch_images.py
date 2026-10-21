#!/usr/bin/env python3
"""Generate the sample product images from seed-assets/product-images/manifest.json.

Designed to run on a GitHub Actions runner (this repo's agent sandbox cannot reach image providers).
No API key or secret is needed or read: the default provider (Pollinations) is free and keyless.

  python scripts/seed-catalog/fetch_images.py --config scripts/seed-catalog/generate.config.json

Each image is saved under the EXACT file name listed in manifest.json, as a square JPEG. Existing files
are never overwritten unless --force is given. Only files inside --out-dir are ever written.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageStat, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIR = ROOT / "seed-assets" / "product-images"
DEFAULT_BASE = "https://image.pollinations.ai/prompt/{prompt}"
FILE_RE = re.compile(r"^[0-9]{2}-[a-z0-9-]+\.jpg$")
USER_AGENT = "AfghanBazaar-sample-catalog/1.0 (capstone project)"


def load_items(manifest: Path) -> list[dict]:
    items = json.loads(manifest.read_text(encoding="utf-8"))["items"]
    for it in items:
        if not FILE_RE.match(it["file"]):
            raise SystemExit(f"Refusing unsafe or unexpected file name in manifest: {it['file']!r}")
    return items


def build_url(base: str, prompt: str, size: int, seed: int) -> str:
    url = base.replace("{prompt}", urllib.parse.quote(prompt, safe=""))
    query = urllib.parse.urlencode(
        {"width": size, "height": size, "seed": seed, "nologo": "true", "model": "flux", "private": "true", "enhance": "false"}
    )
    return url + ("&" if "?" in url else "?") + query


def download(url: str, timeout: int) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        ctype = resp.headers.get("Content-Type", "")
        if not ctype.startswith("image/"):
            raise ValueError(f"provider did not return an image (Content-Type: {ctype or 'none'})")
        return resp.read()


def to_square_jpeg(data: bytes, size: int) -> bytes:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"downloaded data is not a readable image: {exc}") from exc
    img = img.convert("RGB")
    if min(img.size) < 512:
        raise ValueError(f"image too small ({img.size[0]}x{img.size[1]})")
    if max(ImageStat.Stat(img).stddev) < 3:
        raise ValueError("image looks blank or uniform")
    w, h = img.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    img = img.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, "JPEG", quality=90, optimize=True)
    return out.getvalue()


def write_atomic(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", type=Path, help="JSON file with optional keys: only, force, size")
    ap.add_argument("--manifest", type=Path, default=DEFAULT_DIR / "manifest.json")
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_DIR)
    ap.add_argument("--only", type=int, nargs="*", help="1-based product numbers to generate (default: all)")
    ap.add_argument("--force", action="store_true", help="overwrite existing image files")
    ap.add_argument("--size", type=int, default=None, help="output size in px (square), default 1280")
    ap.add_argument("--base-url", default=DEFAULT_BASE, help="provider URL template containing {prompt}")
    ap.add_argument("--attempts", type=int, default=4)
    ap.add_argument("--retry-sleep", type=float, default=10.0)
    ap.add_argument("--delay", type=float, default=4.0, help="seconds to wait between images")
    ap.add_argument("--timeout", type=int, default=180)
    args = ap.parse_args(argv)

    cfg = json.loads(args.config.read_text(encoding="utf-8")) if args.config else {}
    only = args.only if args.only is not None else cfg.get("only")
    force = args.force or bool(cfg.get("force", False))
    size = args.size or int(cfg.get("size", 1280))
    if not 1024 <= size <= 2048:
        raise SystemExit("size must be between 1024 and 2048")

    items = load_items(args.manifest)
    wanted = [(i + 1, it) for i, it in enumerate(items) if not only or (i + 1) in only]
    if not wanted:
        raise SystemExit("No products selected")
    args.out_dir.mkdir(parents=True, exist_ok=True)

    log_path = args.out_dir / "generation-log.json"
    log = json.loads(log_path.read_text(encoding="utf-8")) if log_path.exists() else []
    failed: list[str] = []
    made = skipped = 0

    for pos, (n, it) in enumerate(wanted):
        target = args.out_dir / it["file"]
        if target.exists() and not force:
            print(f"skip  {it['file']} (already exists; use force to regenerate)")
            skipped += 1
            continue
        ok = False
        for attempt in range(1, args.attempts + 1):
            seed = n * 1000 + attempt
            try:
                raw = download(build_url(args.base_url, it["prompt"], size, seed), args.timeout)
                jpeg = to_square_jpeg(raw, size)
            except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
                print(f"  {it['file']} attempt {attempt}/{args.attempts} failed: {type(exc).__name__}: {str(exc)[:160]}")
                if attempt < args.attempts:
                    time.sleep(args.retry_sleep * attempt)
                continue
            write_atomic(target, jpeg)
            log.append(
                {
                    "file": it["file"],
                    "productId": it["productId"],
                    "provider": "pollinations" if args.base_url == DEFAULT_BASE else "custom",
                    "seed": seed,
                    "size": size,
                    "bytes": len(jpeg),
                    "sha256": hashlib.sha256(jpeg).hexdigest(),
                    "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
            )
            print(f"saved {it['file']} ({len(jpeg) // 1024} KB, seed {seed})")
            made += 1
            ok = True
            break
        if not ok:
            failed.append(it["file"])
        if pos < len(wanted) - 1 and args.delay:
            time.sleep(args.delay)

    write_atomic(log_path, (json.dumps(log, indent=2) + "\n").encode())
    print(f"\nsummary: saved={made} skipped={skipped} failed={len(failed)}")
    for f in failed:
        print(f"FAILED {f}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
