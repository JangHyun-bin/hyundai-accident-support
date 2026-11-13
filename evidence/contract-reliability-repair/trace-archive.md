# PR #11 trace 보관과 복원

2026-11-13 정리에서 `artifact-index.json`에 등록된 `trace.zip` 96개를 [GitHub 보관 release](https://github.com/JangHyun-bin/hyundai-accident-support/releases/tag/evidence-contract-repair-2026-11-13)로 분리했다. 이미 공개 repo에 있던 정규화된 ZIP을 바이트 변경 없이 TAR에 넣었다. 제품 release나 새 수용 검사 결과가 아니다.

ZIP 합계는 445,091,835 bytes다. 나머지 원시 파일 461개는 Git에 유지한다. 여기에는 screenshot, frame JSON, 실제 녹음 WebM, 실패 문맥이 포함된다. `requirements.json`, `run.json`, `artifact-index.json`과 과거 source 지문은 수정하지 않는다. Git 이력을 재작성하지 않았으므로 기존 clone의 `.git` 용량은 줄지 않는다.

[보관 metadata](trace-archive.json)는 release, TAR 크기, SHA-256과 원본 index의 SHA-256을 기록한다. 파일별 원래 경로·크기·SHA-256은 기존 [artifact index](artifact-index.json)의 `files`에서 확인한다. 보관 대상은 그중 경로가 `/trace.zip`으로 끝나는 파일 전부다. 복원한 ZIP은 `.gitignore`가 다시 추적하지 않도록 한다.

## ZIP을 원래 경로에 복원

GitHub CLI `gh`, `shasum`, `tar`가 필요하다. repository root에서 실행한다. 복원 경로에 다른 내용의 `trace.zip`을 직접 만들었다면 먼저 옮긴다.

```sh
repo="$PWD"
archive_dir="$(mktemp -d)"
gh release download evidence-contract-repair-2026-11-13 \
  --repo JangHyun-bin/hyundai-accident-support \
  --pattern contract-reliability-repair-traces-2026-11-13.tar \
  --dir "$archive_dir" &&
(cd "$archive_dir" && shasum -a 256 -c "$repo/evidence/contract-reliability-repair/trace-archive.sha256") &&
tar -xf "$archive_dir/contract-reliability-repair-traces-2026-11-13.tar" -C "$repo"
```

원래 분석 문서가 가리키는 `web/raw/full-before-clip-fix/journey-reconstruction-jou-67cea-ithout-losing-urgent-drafts/trace.zip`도 이 방식으로 복원한다. Playwright trace viewer에 복원한 파일을 연다.

## 전체 원시 파일 대조

복원 후 repository root에서 실행한다. Python 3.9 이상을 사용한다. 누락 파일이나 바이트 변경이 있으면 실패한다.

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib
import json

index = json.loads(Path('evidence/contract-reliability-repair/artifact-index.json').read_text())
for item in index['files']:
    path = Path(item['path'])
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
        assert source.tell() == item['bytes'], str(path)
    assert digest.hexdigest() == item['sha256'], str(path)
print(f"Verified {len(index['files'])} original artifacts")
PY
```

원래 557개 파일을 검증할 때는 ZIP 복원이 필요하다. ZIP을 받지 않은 상태에서 기존 manifest 경로가 없다는 이유만으로 과거 증거를 유실 처리하지 않는다. 새 제품 검사의 trace는 `prototype/web/test-results/`에 local 산출물로 남기며 이 역사 보관본에 덧붙이지 않는다.
