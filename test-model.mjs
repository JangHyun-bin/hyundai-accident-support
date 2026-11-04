import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
assert.ok(existsSync(new URL('./editor/model.mjs', import.meta.url)), 'Local board model must exist');
const { validateProject, moveObject, deleteObject, connectorGeometry } = await import('./editor/model.mjs');
const project = JSON.parse(readFileSync(new URL('./project.json', import.meta.url)));
validateProject(project);
const importedParts = JSON.parse(readFileSync(new URL('./assets/parts-53-927.json', import.meta.url)));
for (const n of project.pages[1].objects.filter(n => n.type === 'TEXT')) assert.ok(Object.hasOwn(importedParts.parts, n.id), 'Native text headings need their SVG geometry');
assert.equal(project.pages.length, 2);
assert.equal(project.pages.flatMap(p => p.objects).length, 826);
const original = JSON.parse(readFileSync(new URL('./archive/figma/document.json', import.meta.url)));
const originalObjects = new Map();
function visit(n) { if (!['DOCUMENT','CANVAS'].includes(n.type)) { const {children,...raw}=n;originalObjects.set(n.id,raw); } for (const c of n.children||[]) visit(c); }
visit(original.document);
for (const n of project.pages.flatMap(p=>p.objects)) {
  assert.deepEqual(n.raw, originalObjects.get(n.id), `Raw properties: ${n.id}`);
  assert.equal(n.text,n.raw.characters||'',`Original text: ${n.id}`);
}
const page = structuredClone(project.pages[1]);
const section = page.objects.find(n => n.type === 'SECTION');
const child = page.objects.find(n => n.parentId === section.id);
const x = child.x;
moveObject(page, section.id, 50, -20);
assert.equal(child.x, x + 50, 'Section movement includes descendants');
const edge = page.objects.find(n => n.type === 'CONNECTOR');
assert.ok(!/NaN|undefined/.test(connectorGeometry(page, edge).path));
const start = edge.start.endpointNodeId;
deleteObject(page, start);
assert.ok(!page.objects.some(n => n.id === edge.id), 'Deleting a node removes incident connectors');
const bad = structuredClone(project);
bad.pages[0].objects[0].x = NaN;
assert.throws(() => validateProject(bad));
const unsafe = structuredClone(project);
unsafe.pages[0].svg = 'https://example.com/source.svg';
assert.throws(() => validateProject(unsafe), 'Only local assets may load');
const text = '</script><img src=x onerror=alert(1)> 사람 상태 & 119';
project.pages[1].objects[0].text = text;
assert.equal(JSON.parse(JSON.stringify(project)).pages[1].objects[0].text, text);
console.log('PASS · 826 objects · section movement · connector integrity · safe import · text round-trip');
