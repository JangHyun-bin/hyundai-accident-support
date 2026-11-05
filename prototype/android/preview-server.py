#!/usr/bin/env python3
"""Local-only browser mirror for the dedicated Android PoC emulator."""
import json
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8766
SERIAL = "emulator-5554"
AVD = "accident-support-poc"
PACKAGE = "com.example.accidentpoc"
ORIGIN = f"http://127.0.0.1:{PORT}"
PAGE = b'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compose PoC - emulator</title><style>body{margin:0;background:#101215;color:#f4f5f6;font:15px system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:20px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:16px}h1{font-size:18px;margin:0}p{margin:5px 0;color:#a4a8ae;font-size:13px}span{font-size:12px;color:#9fa8ae}img{display:block;width:100%;height:auto;border:1px solid #3c4148;border-radius:14px;cursor:pointer}#error{color:#ffc777;margin-top:12px}</style></head><body><main><header><div><h1>Compose PoC \xc2\xb7 Android emulator</h1><p>\xed\x99\x94\xeb\xa9\xb4\xec\x9d\x84 \xed\x81\xb4\xeb\xa6\xad\xed\x95\x98\xec\x97\xac \xec\xa1\xb0\xec\x9e\x91\xed\x95\x98\xec\x84\xb8\xec\x9a\x94. \xea\xb0\x80\xec\x83\x81 \xec\x83\x81\xed\x99\xa9\xec\x9d\xb4\xeb\xa9\xb0 \xec\x8b\xa4\xec\xa0\x9c \xec\x8b\xa0\xea\xb3\xa0\xeb\x8a\x94 \xec\x8b\xa4\xed\x96\x89\xed\x95\x98\xec\xa7\x80 \xec\x95\x8a\xec\x95\x84\xec\x9a\x94.</p></div><span>LOCAL PREVIEW</span></header><img id="screen" alt="Android emulator \xed\x99\x94\xeb\xa9\xb4. \xed\x81\xb4\xeb\xa6\xad\xed\x95\x98\xec\x97\xac \xec\xa1\xb0\xec\x9e\x91" draggable="false"><p id="error"></p></main><script>const img=document.getElementById('screen'), error=document.getElementById('error');let busy=false;async function refresh(){if(busy)return;busy=true;try{const r=await fetch('/frame',{cache:'no-store'});if(!r.ok)throw Error(await r.text());const blob=await r.blob(), url=URL.createObjectURL(blob),old=img.src;img.src=url;if(old.startsWith('blob:'))URL.revokeObjectURL(old);error.textContent=''}catch(e){error.textContent='Emulator \xed\x99\x94\xeb\xa9\xb4\xec\x9d\x84 \xea\xb0\x80\xec\xa0\xb8\xec\x98\xac \xec\x88\x98 \xec\x97\x86\xec\x96\xb4\xec\x9a\x94. PoC app\xec\x9d\xb4 \xec\x8b\xa4\xed\x96\x89 \xec\xa4\x91\xec\x9d\xb8\xec\xa7\x80 \xed\x99\x95\xec\x9d\xb8\xed\x95\xb4\xec\xa3\xbc\xec\x84\xb8\xec\x9a\x94.'}finally{busy=false}}img.onclick=async e=>{let b=img.getBoundingClientRect();await fetch('/tap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height})});refresh()};refresh();setInterval(refresh,900);</script></body></html>'''


def adb(*args):
    return subprocess.run(["adb", "-s", SERIAL, *args], capture_output=True, check=True, timeout=8).stdout


def active_poc():
    avd = adb("emu", "avd", "name").decode(errors="replace").splitlines()[0].strip()
    activity = adb("shell", "dumpsys", "activity", "activities").decode(errors="replace")
    return avd == AVD and any("topResumedActivity=" in line and PACKAGE in line for line in activity.splitlines())


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, body, kind="text/plain; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.headers.get("Host") != f"127.0.0.1:{PORT}":
            return self.respond(403, b"Invalid host")
        if self.path == "/":
            return self.respond(200, PAGE, "text/html; charset=utf-8")
        if self.path != "/frame":
            return self.respond(404, b"Not found")
        try:
            if not active_poc():
                return self.respond(409, b"PoC is not in the foreground")
            self.respond(200, adb("exec-out", "screencap", "-p"), "image/png")
        except (subprocess.SubprocessError, OSError, IndexError):
            self.respond(503, b"Emulator unavailable")

    def do_POST(self):
        if self.path != "/tap" or self.headers.get("Host") != f"127.0.0.1:{PORT}" or self.headers.get("Origin") != ORIGIN or self.headers.get("Content-Type") != "application/json":
            return self.respond(403, b"Forbidden")
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 128:
                raise ValueError("Invalid request")
            payload = json.loads(self.rfile.read(length))
            x, y = payload["x"], payload["y"]
            if type(x) not in (int, float) or type(y) not in (int, float) or not 0 <= x <= 1 or not 0 <= y <= 1:
                raise ValueError("Invalid coordinates")
            if not active_poc():
                return self.respond(409, b"PoC is not in the foreground")
            size = adb("shell", "dumpsys", "window", "displays").decode(errors="replace")
            # shortcut: this PoC uses a fixed landscape display, query rotation for other orientations.
            import re
            match = re.search(r"cur=(\d+)x(\d+)", size)
            if not match:
                raise ValueError("Display size unavailable")
            width, height = map(int, match.groups())
            adb("shell", "input", "tap", str(min(int(x * width), width - 1)), str(min(int(y * height), height - 1)))
            self.respond(204, b"")
        except (subprocess.SubprocessError, OSError, IndexError, ValueError, KeyError, json.JSONDecodeError):
            self.respond(400, b"Invalid request or emulator unavailable")


if __name__ == "__main__":
    print(f"PoC preview: {ORIGIN}/", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
