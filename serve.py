"""Loopback-only editor with atomic, revision-checked saves."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hashlib
import json
import os
import subprocess
import tempfile
import threading
import time
from urllib.parse import urlparse, unquote

CODE_ROOT = Path(__file__).resolve().parent


def create_server(root, port=8765):
    root = Path(root).resolve()
    lock = threading.Lock()

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def allowed(self):
            origin = self.headers.get('Origin')
            expected = f'http://127.0.0.1:{self.server.server_port}'
            return self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}' and origin in (None, expected)

        def json_response(self, status, value):
            data = json.dumps(value, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if not self.allowed():
                return self.json_response(403, {'error': 'Local origin만 허용합니다.'})
            path = unquote(urlparse(self.path).path)
            if path == '/api/project':
                data = (root / 'project.json').read_bytes()
                return self.json_response(200, {'revision': hashlib.sha256(data).hexdigest(), 'project': json.loads(data)})
            if path == '/':
                self.path = '/editor/index.html'
            elif not path.startswith(('/editor/', '/assets/')) or '..' in path.split('/'):
                return self.json_response(404, {'error': 'file을 찾을 수 없습니다.'})
            resolved = (root / self.path.lstrip('/').split('?')[0]).resolve()
            if not resolved.is_relative_to(root):
                return self.json_response(404, {'error': 'file을 찾을 수 없습니다.'})
            super().do_GET()

        def do_PUT(self):
            if not self.allowed() or self.path != '/api/project' or self.headers.get('X-Local-Editor') != '1':
                return self.json_response(403, {'error': 'Local editor 요청만 허용합니다.'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 25_000_000:
                    raise ValueError('file 크기는 25 MB 이하여야 합니다.')
                incoming = self.rfile.read(length)
                # One validator serves browser imports and disk writes.
                validation = subprocess.run(['node', '--input-type=module', '-e',
                    "import {validateProject} from './editor/model.mjs';import fs from 'node:fs';validateProject(JSON.parse(fs.readFileSync(0,'utf8')));"],
                    input=incoming, cwd=CODE_ROOT, capture_output=True, timeout=15)
                if validation.returncode:
                    raise ValueError('Project validation에 실패했습니다. 편집 내용은 저장하지 않았습니다.')
                value = json.loads(incoming)
                data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
                with lock:
                    target = root / 'project.json'
                    old = target.read_bytes()
                    revision = hashlib.sha256(old).hexdigest()
                    if self.headers.get('If-Match') != revision:
                        return self.json_response(409, {'error': '다른 창이나 file에서 변경했습니다. JSON을 내려받아 보관한 뒤 다시 여세요.'})
                    history = root / '.history'
                    history.mkdir(exist_ok=True)
                    (history / f'{time.time_ns()}-{revision[:10]}.json').write_bytes(old)
                    temp_path = None
                    try:
                        with tempfile.NamedTemporaryFile(dir=root, delete=False) as temporary:
                            temp_path = Path(temporary.name)
                            temporary.write(data)
                            temporary.flush()
                            os.fsync(temporary.fileno())
                        os.replace(temp_path, target)
                    finally:
                        if temp_path and temp_path.exists():
                            temp_path.unlink()
                self.json_response(200, {'revision': hashlib.sha256(data).hexdigest()})
            except (ValueError, OSError, subprocess.TimeoutExpired) as error:
                self.json_response(400, {'error': str(error)})

    return ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(root)))


if __name__ == '__main__':
    server = create_server(CODE_ROOT)
    print(f'Local editor: http://127.0.0.1:{server.server_port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
