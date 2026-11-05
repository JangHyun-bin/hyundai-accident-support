import { clone, validateProject, moveObject, deleteObject, connectorGeometry, isConnector } from './model.mjs';
import { validateReview, reviewMatches, reviewClasses } from './review.mjs';

const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const canvas = $('board'), viewport = $('viewport');
let project, revision, pageId, selected, dirty=false, connecting=false, sourceId=null;
let undoStack=[], redoStack=[], drag=null, view={x:0,y:0,w:1000,h:700};
let reviewData=null,reviewVisible=false;
const reviewByNode=new Map();
const partCache=new Map();
const status = message => $('status').textContent=message;
const page = () => project.pages.find(p=>p.id===pageId);
const node = id => page().objects.find(n=>n.id===id);
const svg = (tag,attrs={},text) => {const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;};
const element = (tag,text) => {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const message = () => { $('save-state').textContent=dirty?'저장 전 변경 있음':'Local 정본';$('save-state').classList.toggle('dirty',dirty);$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;$('connect').setAttribute('aria-pressed',String(connecting));$('review-toggle').disabled=!reviewData||pageId!==reviewData.pageId;$('review-toggle').setAttribute('aria-pressed',String(reviewVisible&&pageId===reviewData?.pageId)); };
function markDirty(){dirty=true;message();}
function remember(){undoStack.push(clone(project));if(undoStack.length>25)undoStack.shift();redoStack=[];}
function change(action){remember();action();markDirty();render();}
function restoreView(){if(!project.pages.some(p=>p.id===pageId))pageId=project.pages.at(-1).id;populatePages();$('page-select').value=pageId;$('original-svg').href='/'+page().svg;selected=null;connecting=false;sourceId=null;markDirty();render();}
function undo(){if(!undoStack.length)return;redoStack.push(clone(project));project=undoStack.pop();restoreView();}
function redo(){if(!redoStack.length)return;undoStack.push(clone(project));project=redoStack.pop();restoreView();}

// Imported SVG can contain active content. Keep drawing primitives and embedded images only.
function parseSVG(text){
  const doc=new DOMParser().parseFromString(text,'image/svg+xml');
  if(doc.querySelector('parsererror'))throw Error('SVG를 읽을 수 없습니다.');
  const tags=new Set(['svg','g','a','use','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','defs','clipPath','mask','pattern','image','linearGradient','radialGradient','stop','filter','feGaussianBlur','feOffset','feColorMatrix','feBlend','feComposite','feFlood','feMerge','feMergeNode','feMorphology','title','desc']);
  for(const n of [...doc.querySelectorAll('*')]){
    if(!tags.has(n.localName)){n.remove();continue;}
    for(const a of [...n.attributes]){
      if(/^on/i.test(a.name)||a.name==='style'&&(/url\s*\(/i.test(a.value)||/expression/i.test(a.value)))n.removeAttribute(a.name);
      if(a.localName==='href'&&!a.value.startsWith('#')&&!/^data:image\/(png|jpeg|webp);base64,/i.test(a.value))n.removeAttributeNS(a.namespaceURI,a.localName);
      if(/url\s*\(/i.test(a.value)&&!/^url\(#[\w:.-]+\)$/.test(a.value))n.removeAttribute(a.name);
    }
  }
  return doc.documentElement;
}
async function loadParts(p){
  if(partCache.has(p.parts))return;
  const response=await fetch('/'+p.parts);
  if(!response.ok)throw Error('원본 SVG 조각을 읽을 수 없습니다.');
  const data=await response.json();
  const root=parseSVG(`<svg xmlns="${ns}">${data.defs||''}${Object.values(data.parts).join('')}</svg>`);
  const fragments=new Map([...root.children].filter(n=>n.hasAttribute('data-node-id')).map(n=>[n.getAttribute('data-node-id'),n]));
  const defs=[...root.children].filter(n=>n.localName==='defs');
  partCache.set(p.parts,{fragments,defs});
}
async function loadReview(){
  try{
    const response=await fetch('/assets/flow-review-v1.2.json');
    if(!response.ok)return;
    reviewData=validateReview(await response.json());
    for(const [id,record] of Object.entries(reviewData.nodes))reviewByNode.set(record.nodeId,{id,...record});
    reviewVisible=new URLSearchParams(location.search).get('review')!=='0';
  }catch(error){status('검수 data를 표시하지 못했습니다. '+error.message);}
}
function reviewInfo(panel,n){
  if(!reviewData)return;
  const record=n?reviewByNode.get(n.id):null;
  if(n&&!record)return;
  const box=element('section');box.className='review-info';
  box.append(element('h2',n?`검수 v1.2 · ${record.id}`:'통합 flow 검수 v1.2'));
  if(!reviewMatches(project,reviewData)){
    const stale=element('p','기준 이후 문구·연결이 변경되었습니다. 이전 분류를 적용하지 않으며 재검토가 필요합니다.');stale.className='note';box.append(stale);
  }else if(record){
    const badge=element('span',record.status);badge.className='badge review-badge '+reviewClasses[record.status];box.append(badge,element('p',record.reason));
    for(const id of [...record.findingIds,...record.decisionIds]){
      const finding=[...reviewData.findings,...reviewData.decisions].find(f=>f.id===id);
      const link=element('a',id+' · '+finding.title);link.href=$('review-report').href+'#'+id;link.target='_blank';link.rel='noopener';box.append(link);
    }
  }else{
    const values=Object.values(reviewData.nodes);
    for(const status of Object.keys(reviewClasses)){const badge=element('span',`${status} ${values.filter(n=>n.status===status).length}`);badge.className='badge review-badge '+reviewClasses[status];box.append(badge);}
    box.append(element('p',`${reviewData.findings.length}개 보완 항목 · ${reviewData.decisions.length}개 미결정 사항 · 5개 scenario의 정적 검토`));
  }
  const note=element('p','유지는 현장 안전성·기관 연계 검증 통과를 의미하지 않습니다.');note.className='note';box.append(note);panel.append(box);
}
function baseBox(n){return n.raw?.absoluteBoundingBox||{x:n.x,y:n.y,width:n.width,height:n.height};}
function moved(n){const b=baseBox(n);return n.x!==b.x||n.y!==b.y||n.width!==b.width||n.height!==b.height;}
function rerouted(n){return n.customRendered||JSON.stringify(n.start)!==JSON.stringify(n.raw?.connectorStart)||JSON.stringify(n.end)!==JSON.stringify(n.raw?.connectorEnd)||[n.start,n.end].some(e=>{const target=node(e?.endpointNodeId);return target&&moved(target);})||moved(n);}
function textBox(g,n){
  if(!n.text)return;
  const isText=n.type==='TEXT';
  const padding=isText?0:Math.min(16,n.width*.07);
  const fo=svg('foreignObject',{x:n.x+padding,y:n.y+padding,width:Math.max(1,n.width-padding*2),height:Math.max(n.height-padding*2,n.fontSize*1.5)});
  const body=document.createElementNS('http://www.w3.org/1999/xhtml','div');
  Object.assign(body.style,{width:'100%',height:'100%',display:'flex',alignItems:isText?'flex-start':'center',justifyContent:isText?'flex-start':'center',textAlign:isText?'left':'center',font:`${n.raw?.style?.fontWeight||400} ${n.fontSize}px/1.5 -apple-system, "Apple SD Gothic Neo", sans-serif`,color:'#202b3b',whiteSpace:'pre-wrap',overflowWrap:'anywhere',wordBreak:'keep-all'});
  body.textContent=n.text;fo.append(body);g.append(fo);
}
function fallback(g,n){
  const attrs={fill:n.fill,stroke:n.stroke,'stroke-width':n.strokeWidth};
  if(['VECTOR','WASHI_TAPE'].includes(n.type)&&n.raw){
    const size=n.raw.size||{x:n.width,y:n.height};
    const paths=svg('g',{transform:`translate(${n.x} ${n.y}) scale(${size.x?n.width/size.x:1} ${size.y?n.height/size.y:1})`});
    for(const geometry of n.raw.fillGeometry||[])paths.append(svg('path',{d:geometry.path,fill:n.fill,'fill-rule':geometry.windingRule==='EVENODD'?'evenodd':'nonzero'}));
    for(const geometry of n.raw.strokeGeometry||[])paths.append(svg('path',{d:geometry.path,fill:n.stroke}));
    if(!paths.children.length)paths.append(svg('rect',{width:Math.max(8,n.width),height:Math.max(8,n.height),...attrs}));
    g.append(paths);return;
  }
  if(n.type!=='TEXT'){
    if(n.shapeType==='DIAMOND')g.append(svg('polygon',{points:`${n.x+n.width/2},${n.y} ${n.x+n.width},${n.y+n.height/2} ${n.x+n.width/2},${n.y+n.height} ${n.x},${n.y+n.height/2}`,...attrs}));
    else if(n.shapeType==='ELLIPSE')g.append(svg('ellipse',{cx:n.x+n.width/2,cy:n.y+n.height/2,rx:n.width/2,ry:n.height/2,...attrs}));
    else g.append(svg('rect',{x:n.x,y:n.y,width:n.width,height:n.height,rx:n.type==='SECTION'?12:6,...attrs}));
    const ref=n.raw?.fills?.find(f=>f.type==='IMAGE')?.imageRef;
    if(ref&&project.assets[ref])g.append(svg('image',{x:n.x,y:n.y,width:n.width,height:n.height,href:'/'+project.assets[ref],preserveAspectRatio:'none'}));
  }
  textBox(g,n);
  if(n.type==='SECTION'&&n.name)g.append(svg('text',{x:n.x+12,y:n.y+30,fill:'#202b3b','font-size':24,'font-weight':600},n.name));
}
function drawConnector(g,n){
  const c=connectorGeometry(page(),n);
  g.append(svg('path',{d:c.path,fill:'none',stroke:n.stroke,'stroke-width':n.strokeWidth||2,'stroke-dasharray':n.dashed?'10 7':'','marker-end':'url(#local-arrow)'}));
  g.append(svg('path',{d:c.path,fill:'none',stroke:'transparent','stroke-width':Math.max(18,12*view.w/viewport.clientWidth)}));
  if(n.text)g.append(svg('text',{x:c.x,y:c.y-12,fill:'#202b3b','font-size':n.fontSize,'text-anchor':'middle','paint-order':'stroke',stroke:'#fff','stroke-width':7,'stroke-linejoin':'round'},n.text));
}
function draw(){
  canvas.replaceChildren();
  const data=partCache.get(page().parts);
  for(const defs of data.defs)canvas.append(defs.cloneNode(true));
  const defs=svg('defs'),marker=svg('marker',{id:'local-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
  marker.append(svg('path',{d:'M1 1 L9 5 L1 9',fill:'none',stroke:'#757575','stroke-width':1.5}));defs.append(marker);canvas.append(defs);
  for(const n of page().objects){
    const g=svg('g',{'data-object':n.id});
    const fragment=data.fragments.get(n.id);
    if(isConnector(n)&&(!fragment||rerouted(n)))drawConnector(g,n);
    else if(fragment&&!n.customRendered){
      const b=baseBox(n),p=page().origin;
      g.setAttribute('transform',`translate(${n.x} ${n.y}) scale(${b.width?n.width/b.width:1} ${b.height?n.height/b.height:1}) translate(${-b.x+p.x} ${-b.y+p.y})`);
      g.append(fragment.cloneNode(true));
    }else fallback(g,n);
    g.append(svg('title',{},n.text||n.name||n.id));
    canvas.append(g);
  }
  if(reviewData&&reviewVisible&&pageId===reviewData.pageId&&reviewMatches(project,reviewData)){
    const tokens=getComputedStyle(document.documentElement),colors={keep:'--accent',improve:'--danger',decide:'--pending'};
    for(const n of page().objects){
      const record=reviewByNode.get(n.id);if(!record)continue;
      const kind=reviewClasses[record.status];
      const ring=svg('rect',{x:n.x-10,y:n.y-10,width:n.width+20,height:n.height+20,rx:10,class:'review-ring '+kind,'data-review-node':record.id,fill:'none',stroke:tokens.getPropertyValue(colors[kind]).trim(),'stroke-width':2,'stroke-dasharray':kind==='decide'?'5 3':'','vector-effect':'non-scaling-stroke'});
      ring.append(svg('title',{},`${record.id} · ${record.status}`));canvas.append(ring);
    }
  }
  const n=node(selected);
  if(n)canvas.append(svg('rect',{x:n.x-5,y:n.y-5,width:Math.max(8,n.width+10),height:Math.max(8,n.height+10),class:'selection-box'}));
  applyView();
}
function applyView(){canvas.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);$('zoom').textContent=Math.round(viewport.clientWidth/view.w*100)+'%';}
function focusObject(n){
  const ratio=viewport.clientWidth/viewport.clientHeight;
  view.w=Math.max(450,n.width*1.35,n.height*ratio*1.35);view.h=view.w/ratio;
  view.x=n.x+n.width/2-view.w/2;view.y=n.y+n.height/2-view.h/2;applyView();
}
function fit(){
  const all=page().objects;if(!all.length)return;
  const x=Math.min(...all.map(n=>n.x)),y=Math.min(...all.map(n=>n.y));
  focusObject({x,y,width:Math.max(...all.map(n=>n.x+n.width))-x,height:Math.max(...all.map(n=>n.y+n.height))-y});
}
function zoom(factor){const w=view.w/factor,h=view.h/factor;if(w<100||w>150000)return;view.x+=(view.w-w)/2;view.y+=(view.h-h)/2;view.w=w;view.h=h;applyView();}
function outline(){
  const query=$('search').value.trim().toLowerCase(), list=$('outline-list');list.replaceChildren();
  $('page-count').textContent=`${page().objects.length} objects · ${page().objects.filter(isConnector).length} connectors`;
  const fallbackCount=page().objects.filter(n=>n.raw?.id&&!partCache.get(page().parts).fragments.has(n.id)).length;
  $('visual-note').hidden=!fallbackCount;$('visual-note').textContent=`복제본 ${fallbackCount}개는 모양이 원본과 다를 수 있습니다. 아래 ‘원본 보존’에서 원형을 확인하세요.`;
  const entries=query?project.pages.flatMap(p=>p.objects.filter(n=>(n.text+' '+n.name+' '+n.id+' '+(reviewByNode.get(n.id)?.id||'')).toLowerCase().includes(query)).map(n=>({p,n}))):page().objects.filter(n=>n.type==='SECTION'&&n.name).map(n=>({p:page(),n}));
  for(const {p,n} of entries.slice(0,100)){
    const button=element('button',(n.text||n.name||n.id).slice(0,74));button.className='outline-item';
    button.append(element('small',`${reviewByNode.get(n.id)?.id?reviewByNode.get(n.id).id+' · ':''}${n.type} · ${n.id}${query?' · '+p.name:''}`));
    button.onclick=async()=>{try{if(pageId!==p.id)await switchPage(p.id,false);selected=n.id;render();focusObject(node(n.id));}catch(e){status(e.message);}};list.append(button);
  }
  if(!entries.length)list.append(element('p',query?'검색 결과가 없습니다.':'새 도형을 추가하거나 canvas에서 선택하세요.'));
  if(entries.length>100)list.append(element('p',`${entries.length}개 중 100개 표시. 검색어를 더 입력하세요.`));
}
function field(parent,label,id,value,type='text'){
  const wrapper=element('div'),caption=element('label',label);caption.htmlFor=id;
  const input=element(type==='textarea'?'textarea':'input');input.id=id;
  if(type!=='textarea')input.type=type;input.value=value;wrapper.append(caption,input);parent.append(wrapper);return input;
}
function selectField(parent,label,id,values,value){
  const caption=element('label',label);caption.htmlFor=id;const select=element('select');select.id=id;
  for(const [key,text] of values){const option=element('option',text);option.value=key;select.append(option);}select.value=value;parent.append(caption,select);return select;
}
function inspector(){
  const panel=$('inspector');panel.replaceChildren();const n=node(selected);
  if(!n){
    reviewInfo(panel,null);
    panel.append(element('h2','전체 내용을 이곳에서 관리'),element('p','원본과 통합 flow를 선택해 검토하고, 도형을 눌러 문구와 배치를 바꾸세요.'));
    const help=element('div');help.className='legend';
    for(const [title,body] of [['원본까지 보존','초기 아이디어, 낙서, 이전 시안과 통합본을 두 page에 담았습니다.'],['변경은 명시적으로 저장','저장하기하면 project.json에 반영됩니다. 이전 file은 local backup에 남습니다.'],['연결도 함께 편집','연결하기를 누른 뒤 출발·도착 도형을 선택하세요. 이동한 도형의 선은 다시 연결됩니다.'],['정확한 원형 확인','왼쪽 원본 page SVG에서 이관 당시의 모습을 볼 수 있습니다.']]){const row=element('div');row.append(element('strong',title),element('p',body));help.append(row);}panel.append(help);return;
  }
  panel.append(element('h2',isConnector(n)?'연결선 편집':'Object 편집'));const id=element('p',`${n.type} · ${n.id}`);id.className='id';panel.append(id);
  reviewInfo(panel,n);
  const name=field(panel,'이름','edit-name',n.name);
  const text=field(panel,isConnector(n)?'연결 문구':'문구','edit-text',n.text,'textarea');
  const grid=element('div');grid.className='field-grid';panel.append(grid);
  const inputs={};for(const [key,title] of [['x','X'],['y','Y'],['width','너비'],['height','높이'],['fontSize','글자 크기'],['strokeWidth','선 두께']])inputs[key]=field(grid,title,'edit-'+key,Math.round(n[key]*100)/100,'number');
  const fill=field(grid,'채우기','edit-fill',n.fill==='none'?'#ffffff':n.fill,'color');
  const stroke=field(grid,'선 색','edit-stroke',n.stroke==='none'?'#757575':n.stroke,'color');
  const transparent=field(panel,'배경 없음','edit-transparent','','checkbox');transparent.checked=n.fill==='none';
  let start,end,dashed,shape;
  if(isConnector(n)){
    const values=[['','자유 endpoint'],...page().objects.filter(o=>!isConnector(o)&&o.type!=='SECTION').map(o=>[o.id,`${o.id} · ${(o.text||o.name).slice(0,35)}`])];
    start=selectField(panel,'출발','edit-start',values,n.start?.endpointNodeId||'');end=selectField(panel,'도착','edit-end',values,n.end?.endpointNodeId||'');
    dashed=field(panel,'점선','edit-dashed','','checkbox');dashed.checked=n.dashed;
  }else if(n.type==='SHAPE_WITH_TEXT'){
    const shapes=[['SQUARE','사각형'],['ROUNDED_RECTANGLE','둥근 사각형'],['DIAMOND','판단'],['ELLIPSE','원형']];
    if(!shapes.some(([key])=>key===n.shapeType))shapes.push([n.shapeType,'원본 모양 · '+n.shapeType]);
    shape=selectField(panel,'모양','edit-shape',shapes,n.shapeType);
  }
  const apply=element('button','변경 적용');apply.className='primary';apply.id='apply';
  apply.onclick=()=>{
    const values=Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,Number(input.value)]));
    if(!Object.values(values).every(Number.isFinite)||values.width<0||values.height<0||values.fontSize<1||values.fontSize>500||values.strokeWidth<0){status('크기와 위치를 확인하세요.');return;}
    change(()=>{
      const visual=n.text!==text.value||n.fill!==(transparent.checked?'none':fill.value)||n.stroke!==stroke.value||n.fontSize!==values.fontSize||n.strokeWidth!==values.strokeWidth||shape&&n.shapeType!==shape.value;
      moveObject(page(),n.id,values.x-n.x,values.y-n.y);Object.assign(n,values,{name:name.value,text:text.value,fill:transparent.checked?'none':fill.value,stroke:stroke.value});
      if(visual)n.customRendered=true;if(shape)n.shapeType=shape.value;
      if(start){n.start=start.value?{endpointNodeId:start.value,magnet:'AUTO'}:{position:{x:n.x,y:n.y}};n.end=end.value?{endpointNodeId:end.value,magnet:'AUTO'}:{position:{x:n.x+n.width,y:n.y+n.height}};n.dashed=dashed.checked;}
    });status('변경을 적용했습니다. 저장하기해 보관하세요.');
  };panel.append(apply);
  const remove=element('button','삭제');remove.className='remove';remove.onclick=()=>change(()=>{deleteObject(page(),n.id);selected=null;});panel.append(remove);
  const details=element('details'),summary=element('summary','원래 속성 보기'),pre=element('pre',JSON.stringify(n.raw||{},null,2));details.append(summary,pre);panel.append(details);
}
function render(){draw();outline();inspector();message();}
async function switchPage(id,shouldFit=true){const p=project.pages.find(p=>p.id===id);await loadParts(p);pageId=id;$('page-select').value=id;selected=null;sourceId=null;connecting=false;$('original-svg').href='/'+p.svg;render();if(shouldFit)fit();}
function addConnector(from,to){
  const a=node(from),b=node(to);const id='local:'+crypto.randomUUID();
  page().objects.push({id,parentId:null,type:'CONNECTOR',name:'Connector',text:'',x:a.x,y:a.y,width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y),fill:'none',stroke:'#757575',strokeWidth:2,fontSize:16,shapeType:'ROUNDED_RECTANGLE',start:{endpointNodeId:from,magnet:'AUTO'},end:{endpointNodeId:to,magnet:'AUTO'},dashed:false,customRendered:true,raw:{connectorLineType:'ELBOWED'}});selected=id;
}
function pick(id){
  if(connecting&&id&&!isConnector(node(id))&&node(id).type!=='SECTION'){
    if(!sourceId){sourceId=id;selected=id;render();status('도착 도형을 선택하세요.');return;}
    if(sourceId===id){status('다른 도형을 선택하세요.');return;}
    change(()=>addConnector(sourceId,id));connecting=false;sourceId=null;message();status('연결선을 추가했습니다.');return;
  }
  selected=id;render();
}
viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const id=e.target.closest('[data-object]')?.getAttribute('data-object');
  if(connecting){pick(id);return;}
  viewport.setPointerCapture(e.pointerId);drag={id,sx:e.clientX,sy:e.clientY,previousX:e.clientX,previousY:e.clientY,view:{...view},moved:false,before:null};e.preventDefault();
});
viewport.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(Math.abs(e.clientX-drag.sx)+Math.abs(e.clientY-drag.sy)<4&&!drag.moved)return;
  if(!drag.moved){drag.moved=true;if(drag.id)drag.before=clone(project);}
  const scale=view.w/viewport.clientWidth;
  if(drag.id){moveObject(page(),drag.id,(e.clientX-drag.previousX)*scale,(e.clientY-drag.previousY)*scale);selected=drag.id;draw();}
  else{view.x=drag.view.x-(e.clientX-drag.sx)*scale;view.y=drag.view.y-(e.clientY-drag.sy)*scale;applyView();}
  drag.previousX=e.clientX;drag.previousY=e.clientY;
});
function stopDrag(e){if(!drag)return;const last=drag;drag=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(last.moved&&last.id){undoStack.push(last.before);if(undoStack.length>25)undoStack.shift();redoStack=[];markDirty();render();}else if(!last.moved)pick(last.id||null);}
viewport.addEventListener('pointerup',stopDrag);viewport.addEventListener('pointercancel',stopDrag);
viewport.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(Math.exp(-e.deltaY*.004));else{const k=view.w/viewport.clientWidth;view.x+=e.deltaX*k;view.y+=e.deltaY*k;applyView();}},{passive:false});
$('add').onclick=()=>change(()=>{const id='local:'+crypto.randomUUID();page().objects.push({id,parentId:null,type:'SHAPE_WITH_TEXT',name:'새 도형',text:'새 행동\n조건과 다음 단계를 적으세요.',x:view.x+view.w/2-160,y:view.y+view.h/2-80,width:320,height:160,fill:'#ffffff',stroke:'#757575',strokeWidth:2,fontSize:20,shapeType:'ROUNDED_RECTANGLE',start:null,end:null,dashed:false,customRendered:true,raw:{}});selected=id;});
$('connect').onclick=()=>{connecting=!connecting;sourceId=null;message();status(connecting?'출발 도형을 선택하세요. Esc로 취소합니다.':'연결 추가를 취소했습니다.');};
$('undo').onclick=undo;$('redo').onclick=redo;$('fit').onclick=fit;$('zoom-in').onclick=()=>zoom(1.35);$('zoom-out').onclick=()=>zoom(1/1.35);
$('inspector-toggle').onclick=()=>{const open=$('inspector').classList.toggle('open');$('inspector-toggle').setAttribute('aria-expanded',String(open));$('inspector-toggle').textContent=open?'편집 닫기':'편집 열기';};
$('review-toggle').onclick=()=>{reviewVisible=!reviewVisible;draw();message();status(reviewData&&!reviewMatches(project,reviewData)?'기준 이후 변경이 있어 재검토가 필요합니다.':reviewVisible?'검수 분류를 표시했습니다. 원래 문구·연결은 유지합니다.':'검수 분류 표시를 껐습니다.');};
$('page-select').onchange=async e=>{try{await switchPage(e.target.value);}catch(error){status(error.message);}};$('search').oninput=outline;
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),link=element('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('download').onclick=()=>download(JSON.stringify(project,null,2)+'\n','application/json','project.json');
$('svg-export').onclick=async()=>{
  try{
    const result=canvas.cloneNode(true);result.querySelector('.selection-box')?.remove();const b=page().objects;
    if(!b.length)throw Error('내보낼 object가 없습니다.');
    for(const image of result.querySelectorAll('image[href^="/assets/"]')){
      const response=await fetch(image.getAttribute('href'));if(!response.ok)throw Error('Image를 읽을 수 없습니다.');
      const blob=new Blob([await response.arrayBuffer()],{type:'image/png'});
      image.setAttribute('href',await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);}));
    }
    const x=Math.min(...b.map(n=>n.x)),y=Math.min(...b.map(n=>n.y)),w=Math.max(...b.map(n=>n.x+n.width))-x,h=Math.max(...b.map(n=>n.y+n.height))-y;
    result.setAttribute('viewBox',`${x-40} ${y-40} ${w+80} ${h+80}`);result.setAttribute('width',w+80);result.setAttribute('height',h+80);
    download(new XMLSerializer().serializeToString(result),'image/svg+xml',`board-${pageId.replace(':','-')}.svg`);status('Image를 포함한 SVG를 내보냈습니다.');
  }catch(error){status('내보내기 실패 · '+error.message);}
};
$('save').onclick=async()=>{
  const button=$('save');button.disabled=true;
  try{validateProject(project);const saving=JSON.stringify(project);const response=await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-Local-Editor':'1','If-Match':revision},body:saving});const result=await response.json();if(!response.ok)throw Error(result.error);revision=result.revision;dirty=JSON.stringify(project)!==saving;message();status(dirty?'이전 변경을 저장했습니다. 이후 변경은 저장 전입니다.':'project.json에 저장했습니다. 이전 file은 local backup에 보관했습니다.');}
  catch(e){status('저장 실패 · '+e.message);}finally{button.disabled=false;}
};
$('import').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>25_000_000)throw Error('25 MB 이하의 JSON만 열 수 있습니다.');const incoming=validateProject(JSON.parse(await file.text()));await Promise.all(incoming.pages.map(loadParts));remember();project=incoming;pageId=project.pages.at(-1).id;populatePages();await switchPage(pageId);markDirty();status('JSON을 열었습니다. 기존 편집은 실행 취소로 되돌릴 수 있습니다.');}catch(error){status('가져오기 실패 · '+error.message);}e.target.value='';
};
function populatePages(){$('page-select').replaceChildren();for(const p of project.pages){const option=element('option',p.name==='Page 1'?'원본 · 논의 · 기존 시안':p.name);option.value=p.id;$('page-select').append(option);}}
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();$('save').click();return;}
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
  if(e.key==='Escape'){connecting=false;sourceId=null;selected=null;render();}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  if(selected&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const amount=e.shiftKey?1:10;change(()=>moveObject(page(),selected,e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0,e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0));}
  if(selected&&(e.key==='Backspace'||e.key==='Delete')){e.preventDefault();change(()=>{deleteObject(page(),selected);selected=null;});}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
new ResizeObserver(()=>{if(project){const ratio=viewport.clientWidth/viewport.clientHeight;view.h=view.w/ratio;applyView();}}).observe(viewport);
const startupControls=['add','connect','save','page-select','search','fit','zoom-in','zoom-out','download','svg-export','import'];
for(const id of startupControls)$(id).disabled=true;
try{const response=await fetch('/api/project');if(!response.ok)throw Error('Local server 연결을 확인하세요.');const data=await response.json();project=validateProject(data.project);revision=data.revision;const query=new URLSearchParams(location.search);pageId=project.pages.some(p=>p.id===query.get('page'))?query.get('page'):project.pages.at(-1).id;populatePages();await loadReview();await switchPage(pageId);if(node(query.get('node'))){selected=query.get('node');render();focusObject(node(selected));}for(const id of startupControls)$(id).disabled=false;status(`${project.pages.length} pages · ${project.pages.flatMap(p=>p.objects).length} objects · 원본 전체를 열었습니다.`);}catch(error){status(error.message);}
