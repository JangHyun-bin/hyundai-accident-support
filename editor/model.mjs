export const clone = value => structuredClone(value);
export const isConnector = n => n.type === 'CONNECTOR';
const localPath = p => typeof p === 'string' && /^assets\/[A-Za-z0-9._-]+$/.test(p);

export function validateProject(project) {
  if (project?.schemaVersion !== 1 || !Array.isArray(project.pages) || !project.pages.length || typeof project.name !== 'string') throw Error('Project 형식이 올바르지 않습니다.');
  const ids = new Set();
  for (const page of project.pages) {
    if (!Array.isArray(page.objects) || !localPath(page.svg) || !localPath(page.parts) || typeof page.name !== 'string' || !Number.isFinite(page.origin?.x) || !Number.isFinite(page.origin?.y)) throw Error('Page 정보가 올바르지 않습니다.');
    for (const n of page.objects) {
      if (typeof n.id !== 'string' || ids.has(n.id) || typeof n.type !== 'string' || typeof n.text !== 'string' || typeof n.name !== 'string' || !['x','y','width','height','fontSize','strokeWidth'].every(k => Number.isFinite(n[k])) || n.width < 0 || n.height < 0 || n.fontSize < 1 || n.fontSize > 500 || n.strokeWidth < 0 || ![n.fill,n.stroke].every(c => c === 'none' || /^#[0-9a-f]{6}$/i.test(c))) throw Error('Object 정보가 올바르지 않습니다.');
      ids.add(n.id);
    }
    const map = new Map(page.objects.map(n => [n.id,n]));
    for (const n of page.objects) {
      if (n.parentId && !map.has(n.parentId)) throw Error('상위 object를 찾을 수 없습니다.');
      const chain = new Set([n.id]); let parent = n.parentId;
      while (parent) { if(chain.has(parent)) throw Error('Object 계층에 순환이 있습니다.'); chain.add(parent); parent = map.get(parent)?.parentId; }
      for (const end of [n.start,n.end]) {
        if (end?.endpointNodeId && !map.has(end.endpointNodeId)) throw Error('연결 endpoint를 찾을 수 없습니다.');
        if (end?.position && !['x','y'].every(k=>Number.isFinite(end.position[k]))) throw Error('연결 위치가 올바르지 않습니다.');
      }
    }
  }
  if (!project.assets || !Object.values(project.assets).every(localPath)) throw Error('Asset 경로가 올바르지 않습니다.');
  return project;
}

export function descendants(page, id) {
  const ids = new Set([id]);
  let size; do { size=ids.size; for(const n of page.objects) if(ids.has(n.parentId)) ids.add(n.id); } while(size!==ids.size);
  return ids;
}
export function moveObject(page,id,dx,dy) {
  const ids=descendants(page,id);
  for(const n of page.objects) if(ids.has(n.id)) {
    n.x+=dx; n.y+=dy;
    if(isConnector(n)) for(const end of [n.start,n.end]) if(end?.position) {end.position.x+=dx;end.position.y+=dy;}
  }
}
export function deleteObject(page,id) {
  const ids=descendants(page,id);
  page.objects=page.objects.filter(n=>!ids.has(n.id)&&![n.start,n.end].some(e=>ids.has(e?.endpointNodeId)));
}
export function endpoint(page,end,fallback,other) {
  const n=page.objects.find(n=>n.id===end?.endpointNodeId);
  if(!n) return end?.position || fallback;
  let side=end.magnet;
  if(!['LEFT','RIGHT','TOP','BOTTOM'].includes(side)) {
    const dx=other.x-n.x-n.width/2,dy=other.y-n.y-n.height/2;
    side=Math.abs(dx)>Math.abs(dy)?(dx>0?'RIGHT':'LEFT'):(dy>0?'BOTTOM':'TOP');
  }
  return {x:n.x+(side==='LEFT'?0:side==='RIGHT'?n.width:n.width/2), y:n.y+(side==='TOP'?0:side==='BOTTOM'?n.height:n.height/2),side};
}
export function connectorGeometry(page,n) {
  const a=endpoint(page,n.start,{x:n.x,y:n.y},{x:n.x+n.width,y:n.y+n.height});
  const b=endpoint(page,n.end,{x:n.x+n.width,y:n.y+n.height},a);
  let path;
  if(n.raw?.connectorLineType==='STRAIGHT') path=`M${a.x} ${a.y} L${b.x} ${b.y}`;
  else if(['LEFT','RIGHT'].includes(a.side)) {const x=(a.x+b.x)/2;path=`M${a.x} ${a.y} H${x} V${b.y} H${b.x}`;}
  else {const y=(a.y+b.y)/2;path=`M${a.x} ${a.y} V${y} H${b.x} V${b.y}`;}
  return {path,x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
