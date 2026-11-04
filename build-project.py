"""One-time import of the archived official API response. Never rewrites an edited project."""
from pathlib import Path
import collections
import copy
import hashlib
import json
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', NS[1:-1])
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')


def color(paints, default):
    for paint in paints:
        if paint.get('visible', True) and paint.get('type') == 'SOLID':
            c = paint['color']
            return '#' + ''.join(f'{round(c[k]*255):02x}' for k in ('r', 'g', 'b'))
    return default


def build():
    target = ROOT / 'project.json'
    derived_only = '--refresh-derived' in sys.argv
    if target.exists() and not derived_only:
        raise SystemExit('project.json already exists; preserve edits. Use a separate checkout to rebuild.')
    source = json.loads((ROOT / 'archive/figma/document.json').read_text())
    project = {'schemaVersion': 1, 'name': source['name'], 'source': {
        'fileKey': 'mv4ogTxm8nDd6K1usQqDxk', 'version': source['version'],
        'lastModified': source['lastModified']}, 'pages': [], 'assets': {}}
    counts = collections.Counter()
    coverage = []
    for page in source['document']['children']:
        svg_path = f"assets/page-{page['id'].replace(':', '-')}.svg"
        svg = ET.parse(ROOT / svg_path).getroot()
        parts = {}
        definitions = ''.join(ET.tostring(n, encoding='unicode') for n in svg if n.tag == NS + 'defs')
        parents = {child: parent for parent in svg.iter() for child in parent}
        for g in svg.iter():
            node_id = g.get('data-node-id')
            if not node_id:
                continue
            parent = parents.get(g)
            nested_same_id = False
            while parent is not None:
                if parent.get('data-node-id') == node_id:
                    nested_same_id = True
                parent = parents.get(parent)
            if nested_same_id:
                continue
            own = copy.deepcopy(g)
            def remove_nested(element):
                for child in list(element):
                    if child.get('data-node-id') and child.get('data-node-id') != node_id:
                        element.remove(child)
                    else:
                        remove_nested(child)
            remove_nested(own)
            parts[node_id] = parts.get(node_id, '') + ET.tostring(own, encoding='unicode')
        parts = {key: f'<g xmlns="{NS[1:-1]}" data-node-id="{key}">{value}</g>' for key, value in parts.items()}
        boxes = [n['absoluteBoundingBox'] for n in page['children'] if 'absoluteBoundingBox' in n]
        origin = {'x': min(b['x'] for b in boxes), 'y': min(b['y'] for b in boxes)}
        objects = []
        def visit(n, parent):
            b = n.get('absoluteBoundingBox', {'x': 0, 'y': 0, 'width': 0, 'height': 0})
            raw = {k: v for k, v in n.items() if k != 'children'}
            objects.append({'id': n['id'], 'parentId': parent, 'type': n['type'],
                'name': n.get('name', ''), 'text': n.get('characters', ''),
                'x': b['x'], 'y': b['y'], 'width': b['width'], 'height': b['height'],
                'fill': color(n.get('fills', []), 'none'),
                'stroke': color(n.get('strokes', []), '#757575'),
                'strokeWidth': n.get('strokeWeight', 1),
                'fontSize': n.get('style', {}).get('fontSize', 16),
                'shapeType': n.get('shapeType', 'ROUNDED_RECTANGLE'),
                'start': n.get('connectorStart'), 'end': n.get('connectorEnd'),
                'dashed': bool(n.get('strokeDashes')), 'raw': raw})
            counts[n['type']] += 1
            for child in n.get('children', []):
                visit(child, n['id'])
        for n in page['children']:
            visit(n, None)
        parts_path = f"assets/parts-{page['id'].replace(':', '-')}.json"
        (ROOT / parts_path).write_text(json.dumps({'defs': definitions, 'parts': parts}, ensure_ascii=False))
        project['pages'].append({'id': page['id'], 'name': page['name'], 'origin': origin,
            'svg': svg_path, 'parts': parts_path, 'objects': objects})
        coverage.append({'id': page['id'], 'name': page['name'], 'objects': len(objects),
            'nativeSvgObjects': sum(n['id'] in parts for n in objects),
            'fallbackObjects': [n['id'] for n in objects if n['id'] not in parts]})
    for path in sorted((ROOT / 'assets').glob('*.bin')):
        project['assets'][path.stem] = str(path.relative_to(ROOT))
    if not derived_only:
        target.write_text(json.dumps(project, ensure_ascii=False, indent=2) + '\n')
    manifest = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted((ROOT / 'assets').iterdir()) if p.is_file()}
    report = {'sourceVersion': source['version'], 'pages': coverage, 'types': counts,
        'objects': sum(counts.values()), 'imageAssets': len(project['assets']),
        'comments': len(json.loads((ROOT/'archive/figma/comments.json').read_text())['comments']),
        'history': 'Not exported: credential lacks file_versions:read.',
        'nativeJam': 'Save local copy was invoked; downloaded .jam not verified.',
        'visualLimit': 'Native SVG reuses some duplicated IDs. Those objects use raw geometry/text fallback in editor. Raw properties are preserved for every object.',
        'sha256': manifest}
    (ROOT / 'archive/coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'objects': report['objects'], 'pages': len(coverage), 'assets': len(project['assets'])}))


if __name__ == '__main__':
    build()
