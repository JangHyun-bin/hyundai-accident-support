import {test,expect} from '@playwright/test'
import {createFlowPlan} from '../src/design-system/flow-plan'
import type {FlowFrame} from '../src/design-system/flow-contract'
import type {FlowLayout} from '../src/design-system/flow-study-model'

const layouts:FlowLayout[]=['detect','emergency','evacuate','safe','review','sending','calm']
const spread=(values:number[])=>Math.max(...values)-Math.min(...values)

test('wide boards keep slanted, kinked Voronoi seams instead of rectangular columns',()=>{
 for(const [width,height] of [[1296,700],[1440,960],[1682,1210]]){
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

test('the journey board fills the Pleos app window edge to edge with one continuous surface',async({page})=>{
 await page.setViewportSize({width:2048,height:1152})
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
 await expect(page.locator('.ac-vehicle:visible')).toHaveAttribute('data-flow-mode','wide')
 await expect.poll(()=>page.evaluate(()=>{
  const content=document.querySelector<HTMLElement>('[data-testid=journey-flow] .ac-vehicle-content')!,app=content.getBoundingClientRect(),scale=app.width/content.offsetWidth
  const frames=[...document.querySelectorAll<HTMLElement>('[data-testid=journey-flow] .fs-cell[data-cell-visible=true] .ac-material-frame')].map(node=>({rect:node.getBoundingClientRect(),path:new Path2D(node.dataset.shapePath)}))
  const cells=frames.map(frame=>frame.rect),ctx=document.createElement('canvas').getContext('2d')!
  const gap=Math.max(Math.abs(Math.min(...cells.map(r=>r.left))-app.left),Math.abs(Math.min(...cells.map(r=>r.top))-app.top),Math.abs(Math.max(...cells.map(r=>r.right))-app.right),Math.abs(Math.max(...cells.map(r=>r.bottom))-app.bottom))
  const inside=scale/2,corners=[[app.left+inside,app.top+inside],[app.right-inside,app.top+inside],[app.left+inside,app.bottom-inside],[app.right-inside,app.bottom-inside]]
  const open=corners.filter(([x,y])=>!frames.some(({rect,path})=>ctx.isPointInPath(path,(x-rect.left)/scale,(y-rect.top)/scale))).length
  return {gap:Math.round(gap),open}
 })).toEqual({gap:0,open:0})
 await expect(page.locator('.journey-flow-dashboard')).not.toContainText('저장된 사고 영상과 별개')
})
