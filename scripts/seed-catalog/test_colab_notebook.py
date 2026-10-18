"""Offline test of the Colab notebook's logic (resume, retries, validation, zip) with a stub image generator.
No GPU, no model, no internet. Run:  python3 -m unittest scripts/seed-catalog/test_colab_notebook.py
Cells tagged "colab-only" (GPU check, pip install, download) and "gpu" (model loading) are replaced/skipped.
"""
import json
import os
import random
import sys
import tempfile
import types
import unittest
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
NOTEBOOK = ROOT / "scripts" / "seed-catalog" / "colab" / "generate_product_images.ipynb"
MANIFEST = ROOT / "seed-assets" / "product-images" / "manifest.json"


class FakeBar:
    def __init__(self, it, **kw):
        self.it = it
    def __iter__(self):
        return iter(self.it)
    def set_postfix(self, **kw):
        pass


def stub_images(seed):
    rnd = random.Random(seed)
    img = Image.new("RGB", (16, 16))
    img.putdata([(rnd.randrange(256), rnd.randrange(256), rnd.randrange(256)) for _ in range(256)])
    return img.resize((1024, 1024), Image.NEAREST)


class NotebookTests(unittest.TestCase):
    def setUp(self):
        tmp = Path(tempfile.mkdtemp())
        os.environ["PRODUCT_IMAGES_DIR"] = str(tmp / "out")
        pkg = types.ModuleType("tqdm"); auto = types.ModuleType("tqdm.auto"); auto.tqdm = FakeBar
        sys.modules["tqdm"], sys.modules["tqdm.auto"] = pkg, auto
        self.calls = []
        self.fail_plan = {}  # product number -> list of behaviours for successive calls

        def generate(prompt, negative, seed):
            self.calls.append(seed)
            n = seed // 1000
            plan = self.fail_plan.get(n)
            if plan:
                step = plan.pop(0)
                if step == "error":
                    raise RuntimeError("simulated CUDA out of memory")
                if step == "blank":
                    return Image.new("RGB", (1024, 1024), (128, 128, 128))
            return stub_images(seed)

        nb = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
        self.ns = {"__name__": "notebook"}
        for cell in nb["cells"]:
            if cell["cell_type"] != "code":
                continue
            tags = cell["metadata"].get("tags", [])
            if "colab-only" in tags:
                continue
            if "gpu" in tags:
                self.ns["generate"] = generate
                continue
            src = "".join(cell["source"]).replace("FAILED = run_generation()", "FAILED = []")  # tests call it explicitly
            exec(compile(src, "cell", "exec"), self.ns)
        self.out = Path(os.environ["PRODUCT_IMAGES_DIR"])

    def test_embedded_manifest_matches_repo_manifest(self):
        repo = json.loads(MANIFEST.read_text())
        self.assertEqual([i["file"] for i in self.ns["ITEMS"]], [i["file"] for i in repo["items"]])
        self.assertEqual([i["subject"] for i in self.ns["ITEMS"]], [i["subject"] for i in repo["items"]])
        self.assertEqual(len(self.ns["ITEMS"]), 30)
        self.assertTrue(all(len(i["final_prompt"].split()) <= 60 for i in self.ns["ITEMS"]))

    def test_full_run_retries_resume_force_validate_zip(self):
        self.fail_plan[3] = ["error", "blank"]  # product 3: error, then blank image, then success
        self.assertEqual(self.ns["run_generation"](), [])
        files = sorted(p.name for p in self.out.glob("*.jpg"))
        self.assertEqual(files, sorted(i["file"] for i in self.ns["ITEMS"]))
        self.assertEqual(sum(1 for s in self.calls if s // 1000 == 3), 3)
        for p in self.out.glob("*.jpg"):
            with Image.open(p) as im:
                self.assertEqual((im.format, im.size), ("JPEG", (1600, 1600)))
        self.assertEqual(len(json.loads((self.out / "generation-log.json").read_text())), 30)
        self.ns["PROBLEMS"] = self.ns["validate_all"]()
        self.assertEqual(self.ns["PROBLEMS"], [])

        self.calls.clear()  # resume: nothing to do
        self.assertEqual(self.ns["run_generation"](), [])
        self.assertEqual(self.calls, [])

        victim = self.ns["ITEMS"][6]["file"]  # deleted file is regenerated, nothing else is
        (self.out / victim).unlink()
        self.ns["run_generation"]()
        self.assertEqual(len(self.calls), 1)
        self.assertTrue((self.out / victim).exists())

        self.calls.clear()  # corrupt file is detected and regenerated
        (self.out / self.ns["ITEMS"][9]["file"]).write_bytes(b"not an image")
        self.ns["run_generation"]()
        self.assertEqual(len(self.calls), 1)

        self.calls.clear()  # FORCE redoes the file with a different seed
        name = self.ns["ITEMS"][0]["file"]
        before = (self.out / name).read_bytes()
        self.ns["FORCE"] = [name]
        self.ns["run_generation"]()
        self.assertEqual(len(self.calls), 1)
        self.assertNotEqual((self.out / name).read_bytes(), before)

        self.ns["build_zip"]()
        with zipfile.ZipFile(self.ns["ZIP_PATH"]) as z:
            jpgs = sorted(n for n in z.namelist() if n.endswith(".jpg"))
        self.assertEqual(jpgs, files)
        self.assertNotIn("/", "".join(jpgs))

    def test_gives_up_after_max_attempts_and_reports_failure(self):
        self.fail_plan[2] = ["error"] * 10
        failed = self.ns["run_generation"]()
        self.assertEqual(failed, [self.ns["ITEMS"][1]["file"]])
        self.assertEqual(sum(1 for s in self.calls if s // 1000 == 2), self.ns["MAX_ATTEMPTS"])
        self.assertEqual(len(list(self.out.glob("*.jpg"))), 29)
        self.assertIn(f"missing: {failed[0]}", self.ns["validate_all"]())

    def test_validation_flags_duplicates_and_wrong_size(self):
        self.ns["run_generation"]()
        a, b = self.ns["ITEMS"][0]["file"], self.ns["ITEMS"][1]["file"]
        (self.out / b).write_bytes((self.out / a).read_bytes())
        self.assertTrue(any("identical" in p or "almost identical" in p for p in self.ns["validate_all"]()))
        Image.new("RGB", (800, 800), (10, 200, 30)).save(self.out / b, "JPEG")
        self.assertTrue(any("size" in p for p in self.ns["validate_all"]()))


if __name__ == "__main__":
    unittest.main()
