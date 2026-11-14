import {test,expect} from '@playwright/test'
import {initialFlow,flowReducer,layoutFor,type FlowState} from '../src/design-system/flow-study-model'
function advanceToRecord():FlowState {
 let s=flowReducer(initialFlow(),{type:'NEXT'});s=flowReducer(s,{type:'NEXT'});s=flowReducer(s,{type:'CONFIRM_SAFE'});return flowReducer(s,{type:'NEXT'})
}
test('checklist does not assert safety; explicit confirmation advances',()=>{
 const call=flowReducer(initialFlow(),{type:'NEXT'})
 expect(layoutFor(initialFlow())).toBe('detect');expect(layoutFor(call)).toBe('emergency')
 let s=flowReducer(call,{type:'NEXT'})
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
