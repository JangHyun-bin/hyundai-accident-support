import {test,expect} from '@playwright/test'
import {startLiveCall} from './stable-voronoi-journey'

test('recording keeps the same app window and board as emergency response',async({page})=>{
 await page.setViewportSize({width:1440,height:900})
 await page.emulateMedia({reducedMotion:'reduce'})
 await startLiveCall(page)
 const app=page.getByTestId('journey-flow').locator('.ac-vehicle-content'),board=page.getByTestId('flow-board')
 const start=await app.boundingBox(),startBoard=await board.boundingBox()
 for(let i=0;i<3;i++)await page.getByTestId('journey-primary').click()
 await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step','5')
 await page.getByRole('button',{name:'직접 입력',exact:true}).click()
 await page.getByRole('textbox',{name:'사고 기록',exact:true}).fill('오른쪽 차량과 접촉한 뒤 멈췄어요. '.repeat(20))
 await expect.poll(async()=>Math.abs((await app.boundingBox())!.height-start!.height)).toBeLessThanOrEqual(1)
 const end=await board.boundingBox()
 for(const key of ['x','y','width','height'] as const)expect(Math.abs(end![key]-startBoard![key]),`board ${key}`).toBeLessThanOrEqual(1)
 expect((await page.locator('.ac-vehicle:visible').boundingBox())!.height).toBeLessThanOrEqual(900)
})
