import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./cha-bun-flow.html', import.meta.url), 'utf8');
const script = id => html.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1];
const sandbox = vm.createContext({});
vm.runInContext(script('flow-core') + ';this.core={validateGraph,dataText,edgeGeometry,graphBounds};', sandbox);
const { validateGraph, dataText, edgeGeometry, graphBounds } = sandbox.core;
const graph = JSON.parse(script('flow-data'));
validateGraph(graph);
for (const edge of graph.edges) {
  const route = edgeGeometry(edge, graph.nodes);
  assert.ok(!/NaN|undefined|Infinity/.test(route.d), edge.id);
  assert.ok(Number.isFinite(route.lx) && Number.isFinite(route.ly), edge.id);
}
const unsafeText = '</script><script>alert("x")</script> 사람 상태 & 119';
const edited = structuredClone(graph);
edited.nodes[0].body = unsafeText;
const saved = dataText(edited);
assert.ok(!saved.includes('<'), 'HTML 저장 시 script 경계가 깨지면 안 됨');
assert.equal(JSON.parse(saved).nodes[0].body, unsafeText, '편집 text를 손실 없이 복원');
const broken = structuredClone(graph);
broken.edges[0].to = 'missing-node';
assert.throws(() => validateGraph(broken));
const duplicate = structuredClone(graph);
duplicate.nodes.push(duplicate.nodes[0]);
assert.throws(() => validateGraph(duplicate));
assert.ok(graphBounds(graph.nodes).w > 0);
for (const id of ['flow-core', 'flow-editor']) new vm.Script(script(id));
assert.ok(!/[\u3040-\u30ff]/.test(html), '의도하지 않은 일본어 문구 없음');
console.log(`PASS · ${graph.nodes.length} nodes, ${graph.edges.length} edges · 저장 text round-trip · graph 유효성 · JavaScript syntax`);
