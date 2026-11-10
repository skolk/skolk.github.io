#!/usr/bin/env python3
"""banjo: serves the practice page and keeps its record as plain files.

The page (../practice.html) works on its own from disk, keeping everything in
the browser. With this running, it also saves to files that survive a cleared
browser, a new browser, or a new Mac:

    ~/banjo/log.json      every session you have logged
    ~/banjo/tunes.json    tunes you have written or edited
    ~/banjo/goal.json     the five, and the dates
    ~/banjo/backups/      the previous copy of each file, one per day

    GET  /                the practice page, read fresh on every request
    GET  /api/state       {"log": [...], "tunes": {...}, "goal": {...}, "dir": "..."}
    PUT  /api/log         replaces log.json   (a JSON array)
    PUT  /api/tunes       replaces tunes.json (a JSON object)
    PUT  /api/goal        replaces goal.json  (a JSON object)

Listens on 127.0.0.1 only. The page opened as a file (origin "null") or from any
localhost port may call the API, so the copy you open from disk saves here too.

    BANJO_DIR   where the files live (default ~/banjo)
    BANJO_PORT  port (default 4100)
"""
import datetime
import json
import os
import re
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.normpath(os.path.join(HERE, "..", "practice.html"))
KINDS = {"log": list, "tunes": dict, "goal": dict}
EMPTY = {"log": [], "tunes": {}, "goal": {}}
MAX_BODY = 8 * 1024 * 1024
LOCAL_ORIGIN = re.compile(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$")


def data_dir():
    return os.path.expanduser(os.environ.get("BANJO_DIR", "~/banjo"))


def path_for(kind):
    return os.path.join(data_dir(), kind + ".json")


def read_kind(kind):
    try:
        with open(path_for(kind), encoding="utf-8") as f:
            v = json.load(f)
        return v if isinstance(v, KINDS[kind]) else EMPTY[kind]
    except (OSError, ValueError):
        return EMPTY[kind]


def write_kind(kind, value):
    """Atomic replace, after keeping the day's first prior copy in backups/."""
    d = data_dir()
    os.makedirs(os.path.join(d, "backups"), exist_ok=True)
    target = path_for(kind)
    if os.path.exists(target):
        day = datetime.date.today().isoformat()
        backup = os.path.join(d, "backups", "%s-%s.json" % (kind, day))
        if not os.path.exists(backup):
            with open(target, "rb") as src, open(backup, "wb") as dst:
                dst.write(src.read())
    fd, tmp = tempfile.mkstemp(dir=d, prefix="." + kind + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, indent=1)
            f.write("\n")
        os.replace(tmp, target)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


class Handler(BaseHTTPRequestHandler):
    server_version = "banjo/1"

    def log_message(self, fmt, *args):  # quiet: launchd keeps stderr
        if os.environ.get("BANJO_VERBOSE"):
            super().log_message(fmt, *args)

    def cors(self):
        origin = self.headers.get("Origin")
        if origin and (origin == "null" or LOCAL_ORIGIN.match(origin)):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            # Chrome asks before a public-to-local request; say yes for the file:// page
            self.send_header("Access-Control-Allow-Private-Network", "true")

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.cors()
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/state":
            state = {k: read_kind(k) for k in KINDS}
            state["dir"] = data_dir()
            return self.send(200, state)
        if path.startswith("/api/"):
            return self.send(404, {"error": "no such endpoint"})
        if path in ("/", "/practice.html", "/_backend/practice.html", "/index.html"):
            try:
                with open(PAGE, "rb") as f:
                    return self.send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                return self.send(500, ("practice.html is not at %s. Is the repo on a branch "
                                       "that has it?" % PAGE).encode(), "text/plain; charset=utf-8")
        if path == "/favicon.ico":
            return self.send(204, b"", "image/x-icon")
        return self.send(404, b"not found", "text/plain; charset=utf-8")

    def do_PUT(self):
        m = re.match(r"^/api/(log|tunes|goal)$", self.path.split("?")[0])
        if not m:
            return self.send(404, {"error": "no such endpoint"})
        kind = m.group(1)
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = -1
        if n < 0 or n > MAX_BODY:
            return self.send(413, {"error": "body too large"})
        try:
            value = json.loads(self.rfile.read(n).decode("utf-8") or "null")
        except (ValueError, UnicodeDecodeError):
            return self.send(400, {"error": "not JSON"})
        if not isinstance(value, KINDS[kind]):
            return self.send(400, {"error": "%s must be a JSON %s" % (
                kind, "array" if KINDS[kind] is list else "object")})
        write_kind(kind, value)
        return self.send(200, {"ok": True, "kind": kind, "count": len(value)})


def main():
    port = int(os.environ.get("BANJO_PORT", "4100"))
    os.makedirs(data_dir(), exist_ok=True)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("banjo: http://localhost:%d  data in %s" % (port, data_dir()), file=sys.stderr, flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
