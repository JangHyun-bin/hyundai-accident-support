from pathlib import Path
import base64
import copy
import datetime
import hashlib
import json
import re
import shutil
import tempfile
import zipfile

ROOT = Path.cwd()
CLEAN = Path('/tmp/hyundai-contract-repair/clean')
EVIDENCE = ROOT / 'evidence/contract-reliability-repair'
DESTINATION = EVIDENCE / 'web/raw'
RUNS = [
 ('targeted-first', ROOT / 'prototype/web/test-results/repair-targeted-fix2', 'web-targeted-fix2'),
 ('targeted', ROOT / 'prototype/web/test-results/repair-targeted-fix3', 'web-targeted-fix3'),
 ('full-initial', CLEAN / 'prototype/web/test-results/repair-full-clean', 'web-full-clean'),
 ('countdown', CLEAN / 'prototype/web/test-results/repair-countdown-fix1', 'web-countdown-fix1'),
 ('full-before-attachments', CLEAN / 'prototype/web/test-results/repair-full-clean-fix1', 'web-full-clean-fix1'),
 ('recorder-states', CLEAN / 'prototype/web/test-results/repair-recorder-states-final', 'web-recorder-states-final'),
 ('full-before-clip-fix', CLEAN / 'prototype/web/test-results/repair-full-final', 'web-full-final'),
 ('reconstruction-setup', ROOT / 'prototype/web/test-results/repair-reconstruction-causal-red', 'web-reconstruction-causal-red'),
 ('reconstruction-red', ROOT / 'prototype/web/test-results/repair-reconstruction-causal-red2', 'web-reconstruction-causal-red2'),
 ('reconstruction', ROOT / 'prototype/web/test-results/repair-reconstruction-fix1', 'web-reconstruction-fix1'),
 ('full', CLEAN / 'prototype/web/test-results/repair-full-final2', 'web-full-final2'),
]
RULES = [(str(ROOT), '$REPO'), (str(Path.home()), '$HOME')]
MAP = re.compile(r'data:application/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def plain(text):
    count = 0
    for original, replacement in RULES:
        count += text.count(original)
        text = text.replace(original, replacement)
    return text, count

def normalize(data):
    if not any(original.encode() in data for original, _ in RULES) and b'data:application/json' not in data:
        return data, 0
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        if any(original.encode() in data for original, _ in RULES):
            raise RuntimeError('Private path in binary evidence; refusing publication')
        return data, 0
    text, count = plain(text)
    def source_map(match):
        nonlocal count
        try:
            decoded = base64.b64decode(match.group(1), validate=True).decode('utf-8')
        except (ValueError, UnicodeDecodeError):
            return match.group(0)
        public, changed = plain(decoded)
        count += changed
        return match.group(0).replace(match.group(1), base64.b64encode(public.encode()).decode()) if changed else match.group(0)
    text = MAP.sub(source_map, text)
    return text.encode() if count else data, count

def publish_zip(source, destination):
    changes, total = [], 0
    with zipfile.ZipFile(source) as original:
        names = set(original.namelist())
        renames = {}
        # Playwright source filenames are SHA1(source path); keep the source pane usable after redaction.
        for info in original.infolist():
            if not info.filename.endswith('.stacks'):
                continue
            for filename in json.loads(original.read(info)).get('files', []):
                public, count = plain(filename)
                old = 'src/' + hashlib.sha1(filename.encode()).hexdigest() + Path(filename).suffix
                if count and old in names:
                    renames[old] = 'src/' + hashlib.sha1(public.encode()).hexdigest() + Path(filename).suffix
        payloads = []
        for info in original.infolist():
            raw = original.read(info)
            public, count = normalize(raw)
            if public != raw and info.filename.startswith('resources/'):
                old = hashlib.sha1(raw).hexdigest()
                if old not in Path(info.filename).name:
                    raise RuntimeError('Unsupported changed resource identifier: ' + info.filename)
                renames[info.filename] = info.filename.replace(old, hashlib.sha1(public).hexdigest(), 1)
            payloads.append((info, raw, public, count))
        for index, (info, raw, public, count) in enumerate(payloads):
            if info.filename.endswith(('.trace', '.network', '.stacks')):
                for old, new in renames.items():
                    public = public.replace(old.encode(), new.encode())
                    if old.startswith('resources/'):
                        public = public.replace(Path(old).name.encode(), Path(new).name.encode())
                if info.filename.endswith('.stacks'):
                    json.loads(public)
                else:
                    for line in public.splitlines():
                        if line.strip(): json.loads(line)
            new_name = renames.get(info.filename, info.filename)
            if raw != public or new_name != info.filename:
                changes.append({'entry': info.filename, 'publicEntry': new_name, 'pathRedactions': count, 'originalSha256': sha(raw), 'sha256': sha(public)})
            total += count
            payloads[index] = (info, raw, public, count)
        if not changes:
            shutil.copyfile(source, destination)
        else:
            with zipfile.ZipFile(destination, 'w') as public_zip:
                public_zip.comment = normalize(original.comment)[0]
                for info, raw, public, count in payloads:
                    cloned = copy.copy(info)
                    cloned.filename = renames.get(info.filename, info.filename)
                    public_zip.writestr(cloned, public)
    with zipfile.ZipFile(destination) as verify:
        assert verify.testzip() is None
        for info in verify.infolist():
            assert normalize(verify.read(info))[1] == 0
    return total, changes

if DESTINATION.exists():
    raise SystemExit('Refusing to overwrite published raw evidence')
commands = {entry['id']: entry for entry in json.loads((EVIDENCE / 'run.json').read_text())['commands']}
files, runs = [], []
with tempfile.TemporaryDirectory(prefix='contract-evidence-') as temporary:
    stage = Path(temporary) / 'raw'
    stage.mkdir()
    for name, source, gate in RUNS:
        if not source.is_dir(): raise RuntimeError('Missing completed output: ' + name)
        command = commands[gate]
        if command['status'] not in {'passed', 'failed'}: raise RuntimeError('Run not settled: ' + gate)
        base = '$REPO/' + str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else '$CLEAN/' + str(source.relative_to(CLEAN))
        runs.append({'name': name, 'gate': gate, 'testedCommit': command['testedCommit'], 'originalOutput': base, 'publicOutput': 'evidence/contract-reliability-repair/web/raw/' + name})
        for source_file in sorted(path for path in source.rglob('*') if path.is_file()):
            relative = Path(name) / source_file.relative_to(source)
            destination = stage / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            original = source_file.read_bytes()
            if source_file.suffix == '.zip':
                redactions, entries = publish_zip(source_file, destination)
            else:
                public, redactions = normalize(original)
                destination.write_bytes(public)
                entries = []
            public = destination.read_bytes()
            files.append({'run': name, 'originalOutput': base + '/' + str(source_file.relative_to(source)), 'path': 'evidence/contract-reliability-repair/web/raw/' + str(relative), 'originalSha256': sha(original), 'sha256': sha(public), 'bytes': len(public), 'pathRedactions': redactions, 'zipEntryChanges': entries})
    shutil.copytree(stage, DESTINATION)
program = Path(__file__).read_bytes()
(EVIDENCE / 'artifact-copy.py').write_bytes(program)
report = {'schemaVersion': 1, 'copiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'copierSha256': sha(program), 'policy': 'Retain every settled runtime output. Personal absolute repo/home paths and matching embedded JSON source maps are replaced by $REPO/$HOME; Playwright source-path and changed resource identifiers are renamed consistently. Numeric timing/frame payloads and binary media are not synthesized or edited. Original local output is not deleted. Unchanged archives are copied byte-for-byte.', 'legacyInlineAttachments': 'Early dot-reporter runs did not materialize inline-body attachments. Their output is retained as observed, without inventing missing JSON. The final recorder helper writes named raw JSON before attaching.', 'runs': runs, 'files': files}
(EVIDENCE / 'artifact-index.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'runs': len(runs), 'files': len(files), 'bytes': sum(item['bytes'] for item in files), 'pathRedactions': sum(item['pathRedactions'] for item in files), 'exactCopies': sum(item['sha256'] == item['originalSha256'] for item in files)}, indent=2))
