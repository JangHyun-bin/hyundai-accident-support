export const reviewClasses={'유지':'keep','보완 필요':'improve','결정 필요':'decide'};

function endpoint(value){return value?[value.endpointNodeId||null,value.magnet||null,value.position?[value.position.x,value.position.y]:null]:null;}
export function reviewSnapshot(page){
  return page.objects.map(n=>[n.id,n.type,n.text,endpoint(n.start),endpoint(n.end),!!n.dashed]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
}
export function reviewMatches(project,review){
  const page=project.pages.find(p=>p.id===review.pageId);
  return !!page&&JSON.stringify(reviewSnapshot(page))===JSON.stringify(review.baseline.snapshot);
}
export function validateReview(review){
  const fail=()=>{throw Error('검수 data의 기준·참조가 올바르지 않습니다.');};
  if(review?.version!=='1.2'||typeof review.pageId!=='string'||!review.nodes||!Array.isArray(review.baseline?.snapshot)||!['findings','decisions','scenarios'].every(k=>Array.isArray(review[k])))fail();
  const ids=new Set(Object.keys(review.nodes)),native=new Map();
  const findingIds=new Set(review.findings.map(f=>f.id)),decisionIds=new Set(review.decisions.map(d=>d.id));
  if(!ids.size||findingIds.size!==review.findings.length||decisionIds.size!==review.decisions.length)fail();
  const refs=(values,set)=>{if(!Array.isArray(values)||values.some(id=>!set.has(id)))fail();};
  for(const [id,n] of Object.entries(review.nodes)){
    if(!Object.hasOwn(reviewClasses,n.status)||typeof n.nodeId!=='string'||native.has(n.nodeId)||typeof n.originalText!=='string'||typeof n.reason!=='string')fail();
    native.set(n.nodeId,id);refs(n.findingIds,findingIds);refs(n.decisionIds,decisionIds);
    const baseline=review.baseline.snapshot.find(row=>row[0]===n.nodeId);
    if(!baseline||baseline[2]!==n.originalText)fail();
  }
  const edges=new Set(review.baseline.snapshot.filter(row=>row[1]==='CONNECTOR').map(row=>`${native.get(row[3]?.[0])}|${native.get(row[4]?.[0])}`));
  for(const finding of review.findings){
    refs(finding.nodes,ids);
    for(const [from,to] of finding.evidenceEdges||[])if(!edges.has(`${from}|${to}`))fail();
    for(const [from,to] of finding.missingEdges||[])if(!ids.has(from)||!ids.has(to)||edges.has(`${from}|${to}`))fail();
    for(const edge of finding.candidates||[])if(!ids.has(edge.from)||!ids.has(edge.to)||typeof edge.guard!=='string')fail();
  }
  for(const decision of review.decisions){refs(decision.nodes,ids);refs(decision.findingIds,findingIds);}
  const scenarioIds=new Set();
  for(const scenario of review.scenarios){
    if(scenarioIds.has(scenario.id)||!Array.isArray(scenario.traces))fail();scenarioIds.add(scenario.id);
    refs(scenario.findingIds,findingIds);refs(scenario.decisionIds,decisionIds);
    for(const trace of scenario.traces){refs(trace.nodes,ids);for(let i=1;i<trace.nodes.length;i++)if(!edges.has(`${trace.nodes[i-1]}|${trace.nodes[i]}`))fail();}
  }
  return review;
}
