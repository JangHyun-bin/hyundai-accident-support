import {test,expect} from '@playwright/test'
import {initialFlow,flowReducer,layoutFor,type FlowState} from '../src/design-system/flow-study-model'
import {flowCells,insidePolygon,layoutPriority} from '../src/design-system/flow-geometry'
function advanceToRecord():FlowState {
 let s=flowReducer(initialFlow(),{type:'NEXT'});s=flowReducer(s,{type:'NEXT'});s=flowReducer(s,{type:'CONFIRM_SAFE'});return flowReducer(s,{type:'NEXT'})
}
test('checklist does not assert safety; explicit confirmation advances',()=>{
 let s=flowReducer(flowReducer(initialFlow(),{type:'NEXT'}),{type:'NEXT'})
 for(let index=0;index<4;index++)s=flowReducer(s,{type:'CHECK',index})
 expect(s.checks.every(Boolean)).toBe(true);expect(s.step).toBe(3);expect(layoutFor(s)).toBe('evacuate')
 s=flowReducer(s,{type:'CONFIRM_SAFE'});expect(s.step).toBe(4);expect(layoutFor(s)).toBe('safe')
})
test('failure preserves note, retry succeeds, ongoing call prevents calm',()=>{
 let s=flowReducer(advanceToRecord(),{type:'EDIT',note:'우측 차량과 접촉했어요.'})
 s=flowReducer(s,{type:'NEXT'});expect(layoutFor(s)).toBe('review')
 s=flowReducer(s,{type:'SEND'});expect(layoutFor(s)).toBe('sending');expect(flowReducer(s,{type:'BACK'})).toEqual(s)
 s=flowReducer(s,{type:'RESULT',ok:false});expect(s.step).toBe(6);expect(s.transfer).toBe('failed');expect(s.note).toBe('우측 차량과 접촉했어요.');expect(layoutFor(s)).toBe('review')
 s=flowReducer(flowReducer(s,{type:'SEND'}),{type:'RESULT',ok:true});expect(s.step).toBe(7);expect(layoutFor(s)).toBe('sending')
 s=flowReducer(s,{type:'END_CALL'});expect(layoutFor(s)).toBe('calm')
})
test('empty notes, driving and stale results cannot advance',()=>{
 let s=flowReducer(advanceToRecord(),{type:'EDIT',note:'  '});expect(flowReducer(s,{type:'NEXT'})).toEqual(s)
 s=flowReducer(s,{type:'DRIVING',value:true});expect(flowReducer(s,{type:'EDIT',note:'changed'})).toEqual(s);expect(flowReducer(s,{type:'NEXT'})).toEqual(s)
 expect(flowReducer(s,{type:'END_CALL'}).call).toBe('ended');expect(flowReducer(initialFlow(),{type:'RESULT',ok:true})).toEqual(initialFlow())
})
test('weighted presets partition board with valid paths and contained content',()=>{
 for(const [layout,count] of [['detect',2],['evacuate',3],['safe',4],['review',3],['sending',2]] as const){
  for(const [w,h] of [[1236,1184],[680,650]]){
   const cells=flowCells(layout,w,h);expect(cells).toHaveLength(count);expect(cells.reduce((sum,c)=>sum+c.areaFraction,0)).toBeCloseTo(1,5)
   expect(cells.find(c=>c.id===layoutPriority[layout])!.areaFraction).toBeGreaterThanOrEqual(.35)
   for(const c of cells){
    expect(c.areaFraction).toBeGreaterThanOrEqual(.10);expect(c.path).not.toMatch(/NaN|Infinity/);expect(c.content.width).toBeGreaterThan(60);expect(c.content.height).toBeGreaterThan(30)
    const r=c.content
    for(const point of [[r.left,r.top],[r.left+r.width,r.top],[r.left,r.top+r.height],[r.left+r.width,r.top+r.height]] as [number,number][])expect(insidePolygon(point,c.polygon)).toBe(true)
   }
   for(const cell of cells)for(const other of cells.filter(c=>c.id!==cell.id))for(const p of cell.polygon){
    const nearest=Math.min(...other.polygon.map((a,i)=>{
     const b=other.polygon[(i+1)%other.polygon.length],dx=b[0]-a[0],dy=b[1]-a[1]
     const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)))
     return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
    }))
    expect(nearest).toBeGreaterThanOrEqual(24*w/1236-.001)
   }
  }
 }
})
