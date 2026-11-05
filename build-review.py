"""Generate the review document from its versioned review data."""
from pathlib import Path
from collections import Counter
import hashlib
import json

ROOT = Path(__file__).resolve().parent


def cell(text):
    return str(text).replace('|', '\\|').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')


def build():
    data = json.loads((ROOT/'assets/flow-review-v1.2.json').read_text())
    graph = json.loads((ROOT/'e2e/integrated-graph.json').read_text())
    if hashlib.sha256((ROOT/'project.json').read_bytes()).hexdigest() != data['baseline']['projectSha256']:
        raise SystemExit('The source project changed. Preserve v1.2 and create a new review against the new baseline.')
    counts = Counter(n['status'] for n in data['nodes'].values())
    lines = [f"# {data['title']}", '',
        f"검토일: {data['date']} · 기준 commit: `{data['baseline']['commit'][:7]}`", '',
        f"48개 node·70개 connector를 대조하였다. 분류 결과는 유지 {counts['유지']}개, 보완 필요 {counts['보완 필요']}개, 결정 필요 {counts['결정 필요']}개다. 보완 근거 8개와 미결정 사항 5개를 기록하였다. 기존 `project.json`의 문구·ID·위치·연결은 변경하지 않았다.", '',
        '## 검토 범위', '', data['scope'], '',
        '검수본 v1.2는 기존 통합 flow v1.1의 검토본이다. 제안 분기는 현재 diagram에 적용하지 않았다. 기존 연결과 제안 연결을 구분하였다. Scenario의 경로는 기존 연결의 존재 여부를 확인한 정적 검토이며, program을 실행한 시험 결과가 아니다. 실제 사고 대응의 적합성이나 효과를 확정하지 않는다.', '',
        '기준 자료: [전체 board](../../project.json), [통합 graph](../../e2e/integrated-graph.json), [검토 data](../../assets/flow-review-v1.2.json), [검토 검사](../../test-review.mjs).', '',
        '## 분류 기준', '', '| 분류 | 의미 |', '| --- | --- |']
    for status, definition in data['statusDefinitions'].items():
        lines.append(f'| {status} | {cell(definition)} |')
    lines += ['', '## 우선 검토 항목', '', '| 항목 | 판단 대상 | 관련 결정 |', '| --- | --- | --- |']
    for f in data['findings']:
        decisions = ', '.join(d['id'] for d in data['decisions'] if f['id'] in d['findingIds']) or '기존 의도에 따른 분기 보완'
        lines.append(f"| [{f['id']}](#{f['id']}) · {f['priority']} | {f['title']} | {decisions} |")
    lines += ['', '## Node별 검토 결과', '',
        'ID의 link는 실행 중인 local editor에서 해당 node를 연다. 실행 절차는 [README](../../README.md)를 따른다. 동일한 보완 항목이 여러 node에 적용될 수 있으므로 node 분류 수와 보완 항목 수는 다르다.', '',
        '| ID · native ID | 분류 | 검토 근거 | 관련 항목 |', '| --- | --- | --- | --- |']
    for semantic, n in data['nodes'].items():
        url = f"http://127.0.0.1:8765/?page={data['pageId']}&node={n['nodeId']}&review=1"
        refs = ' · '.join(f'[{k}](#{k})' for k in n['findingIds'] + n['decisionIds']) or '원칙 유지'
        lines.append(f"| [{semantic}]({url})<br>`{n['nodeId']}` | {n['status']} | {cell(n['reason'])} | {refs} |")
    lines += ['', '## 보완 항목 상세', '']
    for f in data['findings']:
        lines += [f'<a id="{f["id"]}"></a>', '', f"### {f['id']} · {f['title']}", '',
            f"관련 node: {', '.join('`'+n+'`' for n in f['nodes'])} · 우선순위: {f['priority']}", '',
            '**관찰**', '', f['observation'], '', '**판단 영향**', '', f['impact'], '', '**보완 제안**', '', f['proposal'], '',
            '| 기존 연결 | 현재 문구 · 유형 |', '| --- | --- |']
        for start, end in f['evidenceEdges']:
            edge = next(e for e in graph['edges'] if e['from']==start and e['to']==end)
            lines.append(f"| `{start}` → `{end}` | {cell(edge['label'] or '문구 없음')} · {edge['kind']} |")
        if f.get('candidates'):
            lines += ['', '다음 연결은 개정안이며 현재 diagram에 적용하지 않았다.', '', '| 제안 연결 | 진입 조건 |', '| --- | --- |']
            for edge in f['candidates']:
                lines.append(f"| `{edge['from']}` → `{edge['to']}` | {cell(edge['guard'])} |")
        lines.append('')
    lines += ['## Scenario별 검토', '', '| Scenario | 가정한 상황 | 정적 검토 결과 | 관련 항목 |', '| --- | --- | --- | --- |']
    for s in data['scenarios']:
        refs = ' · '.join(s['findingIds'] + s['decisionIds'])
        lines.append(f"| [{s['id']}](#{s['id']}) | {s['title']} | {s['verdict']} | {refs} |")
    lines.append('')
    for s in data['scenarios']:
        lines += [f'<a id="{s["id"]}"></a>', '', f"### {s['id']} · {s['title']}", '', '**가정**', '']
        lines += ['- '+t for t in s['assumptions']]
        lines += ['', '**기대 동작**', ''] + ['- '+t for t in s['expected']]
        for trace in s['traces']:
            lines += ['', '**'+trace['label']+'**', '', ' → '.join('`'+n+'`' for n in trace['nodes'])]
        lines += ['', f"**판정: {s['verdict']}**", '', s['result'], '', '**보완 후 확인 사항**', '', s['nextCheck'], '']
    lines += ['## 미결정 사항', '', '아래 권고안은 검토를 위한 제안이며 확정된 운영 규칙이 아니다.', '']
    for d in data['decisions']:
        lines += [f'<a id="{d["id"]}"></a>', '', f"### {d['id']} · {d['title']}", '',
            f"상태: {d['status']} · 관련 항목: {', '.join(d['findingIds'])}", '', d['question'], '',
            '| 대안 | 내용 |', '| --- | --- |']
        for i, option in enumerate(d['options'], 1): lines.append(f'| 안 {i} | {cell(option)} |')
        lines += ['', '**권고안**', '', d['recommendation'], '', '**확정에 필요한 확인**', '', d['confirmation'], '']
    lines += ['## 검토 정합성과 후속 범위', '',
        '- 모든 node 분류를 원래 native ID·문구와 대조한다.',
        '- 70개 native endpoint·문구·선 유형과 통합 graph의 일치를 확인한다.',
        '- Scenario와 보완 근거에서 기존 경로로 제시한 모든 연결이 존재하는지 확인한다.',
        '- 기존 문구·연결이 바뀌면 editor의 검수 분류를 재검토 필요로 표시한다. 위치 변경만으로 분류를 무효화하지 않는다.',
        '- D01–D05의 결정 후 관련 분기와 문구를 별도 개정하고 핵심 상황의 HTML prototype으로 사용자 이해를 확인한다.', '',
        '공모전 제출요강, 실제 차량·기관 연계, 안전 안내 문구와 정보 처리 조건은 이번 정적 검토에서 확정하지 않았다.', '', 'EOD', '']
    output = ROOT/'docs/reviews/flow-review-v1.2.md'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text('\n'.join(lines))
    print(f'Generated {output.relative_to(ROOT)}: {len(data["nodes"])} nodes, {len(data["scenarios"])} scenarios')


if __name__ == '__main__':
    build()
