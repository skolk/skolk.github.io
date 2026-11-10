#!/usr/bin/env python3
"""Tests for the banjo server. Run: python3 _backend/banjo/test_server.py"""
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.port = free_port()
        env = dict(os.environ, BANJO_DIR=cls.dir, BANJO_PORT=str(cls.port))
        cls.proc = subprocess.Popen([sys.executable, os.path.join(HERE, "server.py")],
                                    env=env, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                socket.create_connection(("127.0.0.1", cls.port), 0.1).close()
                break
            except OSError:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait()

    def req(self, method, path, body=None, origin=None):
        data = None if body is None else json.dumps(body).encode()
        r = urllib.request.Request("http://127.0.0.1:%d%s" % (self.port, path), data=data, method=method)
        if data is not None:
            r.add_header("Content-Type", "application/json")
        if origin:
            r.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(r) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    def test_empty_state(self):
        code, _, body = self.req("GET", "/api/state")
        self.assertEqual(code, 200)
        st = json.loads(body)
        self.assertIsInstance(st["log"], list)
        self.assertIsInstance(st["tunes"], dict)
        self.assertIsInstance(st["goal"], dict)

    def test_round_trip_and_backup(self):
        log = [{"ts": 1, "day": "2026-11-10", "song": "cabbage", "memory": True, "rating": "clean"}]
        code, _, body = self.req("PUT", "/api/log", log)
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body)["count"], 1)
        _, _, body = self.req("GET", "/api/state")
        self.assertEqual(json.loads(body)["log"], log)
        with open(os.path.join(self.dir, "log.json")) as f:
            self.assertEqual(json.load(f), log)
        # the second write keeps the first as the day's backup
        self.req("PUT", "/api/log", log + [{"ts": 2, "day": "2026-11-10", "song": "saints"}])
        backups = os.listdir(os.path.join(self.dir, "backups"))
        self.assertTrue(any(b.startswith("log-") for b in backups))

    def test_wrong_shape_refused(self):
        code, _, _ = self.req("PUT", "/api/log", {"not": "a list"})
        self.assertEqual(code, 400)
        code, _, _ = self.req("PUT", "/api/goal", [1, 2])
        self.assertEqual(code, 400)
        code, _, _ = self.req("PUT", "/api/other", [])
        self.assertEqual(code, 404)

    def test_cors_for_file_and_localhost_only(self):
        _, h, _ = self.req("GET", "/api/state", origin="null")
        self.assertEqual(h.get("Access-Control-Allow-Origin"), "null")
        _, h, _ = self.req("GET", "/api/state", origin="http://localhost:4000")
        self.assertEqual(h.get("Access-Control-Allow-Origin"), "http://localhost:4000")
        _, h, _ = self.req("GET", "/api/state", origin="https://example.com")
        self.assertIsNone(h.get("Access-Control-Allow-Origin"))
        code, h, _ = self.req("OPTIONS", "/api/log", origin="null")
        self.assertEqual(code, 204)
        self.assertIn("PUT", h.get("Access-Control-Allow-Methods", ""))

    def test_serves_page(self):
        code, h, body = self.req("GET", "/")
        self.assertEqual(code, 200)
        self.assertIn("text/html", h.get("Content-Type", ""))
        self.assertIn(b"Clawhammer", body)


if __name__ == "__main__":
    unittest.main(verbosity=1)
