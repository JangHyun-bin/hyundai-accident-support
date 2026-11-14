import {test,expect} from '@playwright/test'
import {createFlowPlan} from '../src/design-system/flow-plan'
import type {FlowFrame} from '../src/design-system/flow-contract'
import type {FlowLayout} from '../src/design-system/flow-study-model'

const layouts:FlowLayout[]=['detect','emergency','evacuate','safe','review','sending','calm']
const spread=(values:number[])=>Math.max(...values)-Math.min(...values)

test('wide boards keep slanted, kinked Voronoi seams instead of rectangular columns',()=>{
 for(const [width,height] of [[1296,700],[1618,1146],[1682,1210]]){
  const frame:FlowFrame={width,height,device:'vehicle',mode:'wide',contentHeight:height,statusHeight:0,dockHeight:0,revision:'appearance',reason:'fixture',metrics:{rem:16,bodyLineHeight:27,headingLineHeight:34,callLineHeight:36.68,labelLineHeight:21,touch:64}}
  for(const layout of layouts)for(const active of [false,true]){
   const plan=createFlowPlan(layout,width,height,frame,active),label=`${width}x${height} ${layout}${active?'+119':''}`
   expect(spread(plan.cells.vehicle.shape!.polygon.filter(([x])=>x>width*.15).map(([x])=>x)),`${label}: slanted context seam`).toBeGreaterThan(width*.02)
   expect(spread(plan.cells.record.shape!.polygon.filter(([x])=>x<width*.8).map(([x])=>x)),`${label}: slanted record seam`).toBeGreaterThan(width*.02)
   const [,bend]=plan.cells.guide.shape!.polygon.reduce((left,point)=>point[0]<left[0]?point:left)
   expect(bend/height,`${label}: guide edge bends at the scene/vehicle junction`).toBeGreaterThan(.3)
   expect(bend/height,`${label}: guide edge bends at the scene/vehicle junction`).toBeLessThan(.8)
  }
 }
})

test('the journey board fills the Pleos app window with one continuous surface',async({page})=>{
 await page.setViewportSize({width:2048,height:1152})
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 await expect(page.locator('.ac-vehicle:visible')).toHaveAttribute('data-flow-mode','wide')
 await expect.poll(()=>page.evaluate(()=>{
  const board=document.querySelector('[data-testid=journey-flow] [data-testid=flow-board]')!.getBoundingClientRect(),app=document.querySelector('[data-testid=journey-flow] .ac-vehicle-content')!.getBoundingClientRect()
  const cells=[...document.querySelectorAll<HTMLElement>('[data-testid=journey-flow] .fs-cell[data-cell-visible=true] .ac-material-frame')].map(node=>node.getBoundingClientRect())
  const outside=board.left<app.left-1||board.right>app.right+1||board.top<app.top-1||board.bottom>app.bottom+1
  return outside?Infinity:Math.max(Math.abs(Math.min(...cells.map(r=>r.left))-board.left),Math.abs(Math.min(...cells.map(r=>r.top))-board.top),Math.abs(Math.max(...cells.map(r=>r.right))-board.right),Math.abs(Math.max(...cells.map(r=>r.bottom))-board.bottom))
 })).toBeLessThanOrEqual(1)
 await expect(page.locator('.journey-flow-dashboard')).not.toContainText('저장된 사고 영상과 별개')
})
