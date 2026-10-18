"""Offline tests for fetch_images.py using a local stub server (no internet, no real provider).
Run:  python3 -m unittest scripts/seed-catalog/test_fetch_images.py
"""
import importlib.util
import io
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from PIL import Image

spec = importlib.util.spec_from_file_location("fetch_images", Path(__file__).with_name("fetch_images.py"))
fi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fi)


def png(w=900, h=700) -> bytes:
    img = Image.new("RGB", (w, h))
    px = img.load()
    for x in range(w):
        for y in range(h):
            px[x, y] = ((x * 255) // w, (y * 255) // h, ((x + y) * 255) // (w + h))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


class Stub(BaseHTTPRequestHandler):
    responses: list = []  # items: (status, content_type, body)

    def do_GET(self):
        status, ctype, body = Stub.responses.pop(0) if len(Stub.responses) > 1 else Stub.responses[0]
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


class FetchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), Stub)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}/{{prompt}}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.manifest = self.tmp / "manifest.json"
        self.manifest.write_text(
            json.dumps(
                {
                    "items": [
                        {"file": "01-first-item.jpg", "productId": "p1", "prompt": "a test prompt"},
                        {"file": "02-second-item.jpg", "productId": "p2", "prompt": "another prompt"},
                    ]
                }
            )
        )
        self.out = self.tmp / "out"

    def run_fetch(self, *extra):
        return fi.main(
            ["--manifest", str(self.manifest), "--out-dir", str(self.out), "--base-url", self.base,
             "--size", "1024", "--retry-sleep", "0", "--delay", "0", "--attempts", "3", *extra]
        )

    def test_one_image_saved_with_exact_name_square_jpeg(self):
        Stub.responses = [(200, "image/png", png())]
        self.assertEqual(self.run_fetch("--only", "1"), 0)
        f = self.out / "01-first-item.jpg"
        self.assertTrue(f.exists())
        self.assertFalse((self.out / "02-second-item.jpg").exists())
        with Image.open(f) as im:
            self.assertEqual((im.format, im.size), ("JPEG", (1024, 1024)))
        log = json.loads((self.out / "generation-log.json").read_text())
        self.assertEqual(log[0]["file"], "01-first-item.jpg")
        self.assertEqual(len(log[0]["sha256"]), 64)

    def test_does_not_overwrite_without_force(self):
        Stub.responses = [(200, "image/png", png())]
        self.run_fetch("--only", "1")
        before = (self.out / "01-first-item.jpg").read_bytes()
        Stub.responses = [(200, "image/png", png(1000, 1000))]
        self.assertEqual(self.run_fetch("--only", "1"), 0)
        self.assertEqual((self.out / "01-first-item.jpg").read_bytes(), before)

    def test_non_image_response_fails_and_saves_nothing(self):
        Stub.responses = [(200, "text/html", b"<html>rate limited</html>")]
        self.assertEqual(self.run_fetch("--only", "1"), 1)
        self.assertFalse((self.out / "01-first-item.jpg").exists())

    def test_retries_after_server_error(self):
        Stub.responses = [(500, "text/plain", b"boom"), (200, "image/png", png())]
        self.assertEqual(self.run_fetch("--only", "1"), 0)
        self.assertTrue((self.out / "01-first-item.jpg").exists())

    def test_rejects_blank_and_tiny_images(self):
        buf = io.BytesIO()
        Image.new("RGB", (900, 900), (200, 200, 200)).save(buf, "PNG")
        Stub.responses = [(200, "image/png", buf.getvalue())]
        self.assertEqual(self.run_fetch("--only", "1"), 1)
        Stub.responses = [(200, "image/png", png(200, 200))]
        self.assertEqual(self.run_fetch("--only", "1"), 1)

    def test_rejects_unsafe_manifest_file_names(self):
        self.manifest.write_text(json.dumps({"items": [{"file": "../evil.jpg", "productId": "x", "prompt": "p"}]}))
        with self.assertRaises(SystemExit):
            self.run_fetch()

    def test_force_regenerates(self):
        Stub.responses = [(200, "image/png", png())]
        self.run_fetch("--only", "1")
        before = (self.out / "01-first-item.jpg").read_bytes()
        Stub.responses = [(200, "image/png", png(1100, 1100))]
        self.assertEqual(self.run_fetch("--only", "1", "--force"), 0)
        self.assertNotEqual((self.out / "01-first-item.jpg").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
