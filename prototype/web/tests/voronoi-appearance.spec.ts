import {test,expect} from '@playwright/test'
import {createFlowPlan} from '../src/design-system/flow-plan'
import {layoutPriority} from '../src/design-system/flow-geometry'
import type {FlowFrame} from '../src/design-system/flow-contract'

test('wide workspaces retain a visible diagonal partition instead of rectangular columns',()=>{
 for(const [width,height] of [[672,410],[912,680],[1232,1040]]){
  const frame:FlowFrame={width,height,device:'vehicle',mode:'wide',contentHeight:height,statusHeight:0,dockHeight:0,revision:'appearance',reason:'fixture',metrics:{rem:16,bodyLineHeight:27,headingLineHeight:34,callLineHeight:36.68,labelLineHeight:21,touch:64}}
  for(const layout of ['detect','evacuate','safe','review','sending'] as const){
   const plan=createFlowPlan(layout,width,height,frame),shape=plan.cells[layoutPriority[layout]].shape!
   const edge=shape.polygon.filter(([x])=>x>width*.4).map(([x])=>x)
   expect(Math.max(...edge)-Math.min(...edge),`${layout}: visible diagonal seam`).toBeGreaterThan(width*.08)
  }
 }
})

test('visible vehicle and response surfaces share their outer bounds',async({page})=>{
 await page.setViewportSize({width:2048,height:1152})
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 await expect(page.locator('.ac-vehicle:visible')).toHaveAttribute('data-flow-mode','wide')
 await expect.poll(()=>page.evaluate(()=>{
  const scene=document.querySelector('.journey-flow-scene .ss-surface')!.getBoundingClientRect()
  const cells=[...document.querySelectorAll<HTMLElement>('.fs-cell[data-cell-visible=true] .ac-material-frame')].map(e=>e.getBoundingClientRect())
  return Math.max(Math.abs(scene.top-Math.min(...cells.map(r=>r.top))),Math.abs(scene.bottom-Math.max(...cells.map(r=>r.bottom))),Math.abs(scene.width-(Math.max(...cells.map(r=>r.right))-Math.min(...cells.map(r=>r.left)))))
 })).toBeLessThanOrEqual(1)
 await expect(page.locator('.journey-flow-dashboard')).not.toContainText('저장된 사고 영상과 별개')
})
