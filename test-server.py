from pathlib import Path
import hashlib
import http.client
import importlib.util
import json
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parent


class SaveTests(unittest.TestCase):
    def test_save_conflict_validation_and_origin(self):
        self.assertTrue((ROOT / 'serve.py').exists(), 'Local save server must exist')
        spec = importlib.util.spec_from_file_location('server', ROOT / 'serve.py')
        server_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(server_module)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            original = (ROOT / 'project.json').read_bytes()
            (root / 'project.json').write_bytes(original)
            server = server_module.create_server(root, 0)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
                def request(body, revision, origin=None):
                    headers = {'Content-Type': 'application/json', 'If-Match': revision, 'X-Local-Editor': '1'}
                    if origin: headers['Origin'] = origin
                    connection.request('PUT', '/api/project', body.encode() if isinstance(body, str) else body, headers)
                    response = connection.getresponse()
                    status = response.status
                    response.read()
                    return status
                revision = hashlib.sha256(original).hexdigest()
                self.assertEqual(request('{}', revision, 'https://example.com'), 403)
                invalid = json.loads(original)
                invalid['pages'][0]['objects'][0]['width'] = -1
                self.assertEqual(request(json.dumps(invalid), revision), 400)
                self.assertEqual((root/'project.json').read_bytes(), original)
                changed = json.loads(original)
                changed['pages'][1]['objects'][0]['name'] = 'Local save test'
                self.assertEqual(request(json.dumps(changed), revision), 200)
                self.assertEqual(json.loads((root/'project.json').read_text())['pages'][1]['objects'][0]['name'], 'Local save test')
                self.assertEqual(request(original, revision), 409)
                self.assertEqual(len(list((root/'.history').glob('*.json'))), 1)
            finally:
                server.shutdown()
                server.server_close()


if __name__ == '__main__':
    unittest.main()
