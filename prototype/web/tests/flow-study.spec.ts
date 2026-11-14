import {test,expect,type Page} from '@playwright/test'
async function next(page:Page){await page.getByTestId('flow-primary').click()}
async function toReview(page:Page){for(let i=0;i<5;i++)await next(page)}
test('full flow keeps call after sending and only settles after call ends',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow')
 const root=page.getByTestId('flow-study'),board=page.getByTestId('flow-board')
 await expect(root).toHaveAttribute('data-step','1');await expect(board).toHaveAttribute('data-layout','detect')
 await next(page);await expect(root).toHaveAttribute('data-step','2');await expect(board).toHaveAttribute('data-layout','emergency');await expect(board.locator('[data-cell=emergency]')).toHaveAttribute('data-cell-visible','true')
 await next(page);await expect(board).toHaveAttribute('data-layout','evacuate')
 const checks=page.getByRole('group',{name:'안전 확인 항목'}).getByRole('checkbox')
 for(const checkbox of await checks.all())await checkbox.check()
 await expect(root).toHaveAttribute('data-step','3')
 await next(page);await expect(board).toHaveAttribute('data-layout','safe')
 await next(page);await page.getByRole('textbox',{name:'시연할 기록'}).fill('우측 차량과 접촉했습니다.')
 await next(page);await expect(board).toHaveAttribute('data-layout','review')
 await next(page);await expect(board).toHaveAttribute('data-layout','sending')
 await expect(root).toHaveAttribute('data-step','7',{timeout:6000});await expect(board).toHaveAttribute('data-layout','sending')
 await expect(page.getByTestId('flow-step-support')).toContainText('접수 여부는 아직')
 await page.getByRole('button',{name:'통화 종료 시연',exact:true}).click()
 await expect(board).toHaveAttribute('data-layout','calm');await expect(page.getByText('천천히 숨을 내쉬세요', {exact:true})).toBeVisible()
 await expect(board.locator('.fs-cell[data-cell-visible=true]')).toHaveCount(4);await expect(board.locator('[data-cell=emergency]')).toHaveAttribute('data-cell-visible','false')
})
test('failed send preserves contents, retry works, and reset cancels pending result',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow');await toReview(page)
 await page.getByRole('checkbox',{name:'전송 실패 시연',exact:true}).check();await next(page)
 await expect(page.getByTestId('flow-study')).toHaveAttribute('data-transfer','failed',{timeout:6000})
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','review')
 await expect(page.getByTestId('flow-primary')).toContainText('다시 보내기')
 await page.getByRole('checkbox',{name:'전송 실패 시연',exact:true}).uncheck();await next(page)
 await page.getByRole('button',{name:'처음부터',exact:true}).click()
 await page.waitForTimeout(2700);await expect(page.getByTestId('flow-study')).toHaveAttribute('data-step','1')
 await toReview(page);await next(page);await expect(page.getByTestId('flow-study')).toHaveAttribute('data-step','7',{timeout:6000})
})
test('driving locks nonurgent actions, and mobile plus enlarged text remain usable',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow');await next(page)
 await page.getByRole('checkbox',{name:'주행 중 시연',exact:true}).check();await expect(page.getByTestId('flow-primary')).toBeDisabled()
 await expect(page.getByRole('button',{name:'통화 종료 시연',exact:true})).toBeEnabled()
 await page.getByRole('checkbox',{name:'주행 중 시연',exact:true}).uncheck();await expect(page.getByTestId('flow-primary')).toBeEnabled()
 await next(page)
 for(const [width,font] of [[1600,16],[393,16],[393,32]]){
  await page.setViewportSize({width,height:1050});await page.evaluate(size=>document.documentElement.style.fontSize=size+'px',font)
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const button=page.getByTestId('flow-primary');expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
 }
 expect(errors).toEqual([])
})
test('rapid state changes settle on latest layout and reduced motion cancels pending work',async({page})=>{
 await page.goto('/?study=flow');for(let i=0;i<5;i++)await next(page)
 await expect(page.getByTestId('flow-study')).toHaveAttribute('data-step','6')
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','review',{timeout:10000})
 await page.getByRole('button',{name:'이전 단계',exact:true}).click()
 await page.getByRole('checkbox',{name:'움직임 줄이기',exact:true}).check()
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','safe')
 await page.waitForTimeout(4200);await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','safe')
})

test('review exposes the exact note and keyboard can open and close full contents',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow')
 for(let i=0;i<4;i++)await next(page)
 const note='오른쪽 앞부분에 접촉이 있었습니다. 사진을 확인한 뒤 추가할 예정입니다.'
 await page.getByRole('textbox',{name:'시연할 기록'}).fill(note);await next(page)
 await expect(page.locator('[data-cell=guide]')).toContainText(note)
 const open=page.getByRole('button',{name:'보낼 내용 전체 보기',exact:true});await open.focus();await page.keyboard.press('Enter')
 const dialog=page.getByRole('dialog',{name:'보험사에 보낼 내용',exact:true})
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(note)
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(open).toBeFocused()
})
test('ending a call on stage two updates the main guidance too',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow');await next(page)
 await page.getByRole('button',{name:'통화 종료 시연',exact:true}).click()
 await expect(page.locator('.fs-step-copy')).not.toContainText('통화 중')
 await expect(page.locator('.fs-step-copy')).toContainText('통화가 종료됐어요')
})

test('safe layout keeps the emergency label, number and status inside its cell',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow')
 for(let i=0;i<4;i++)await next(page)
 await expect(page.getByTestId('flow-board')).toHaveAttribute('data-layout','safe')
 const bounds=await page.locator('[data-cell=emergency] .fs-cell-body').evaluate(body=>{
  const r=body.getBoundingClientRect()
  return [...body.children].map(child=>{const c=child.getBoundingClientRect();return {text:child.textContent,top:c.top-r.top,bottom:c.bottom-r.top,height:r.height}})
 })
 for(const child of bounds){expect(child.top,child.text??'spectrum').toBeGreaterThanOrEqual(-1);expect(child.bottom,child.text??'spectrum').toBeLessThanOrEqual(child.height+1)}
})

test('long review opens at the beginning with enlarged mobile text',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:393,height:852});await page.goto('/?study=flow')
 await page.evaluate(()=>document.documentElement.style.fontSize='32px')
 for(let i=0;i<4;i++)await next(page)
 const note='확인한 내용만 기록합니다. '.repeat(40).slice(0,500)
 await page.getByRole('textbox',{name:'시연할 기록'}).fill(note);await next(page)
 await page.getByRole('button',{name:'보낼 내용 전체 보기',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'보험사에 보낼 내용',exact:true})
 await expect(dialog).toContainText(note)
 expect(await dialog.evaluate(e=>e.scrollTop)).toBe(0)
 expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true)
 await expect(dialog.getByRole('heading')).toBeInViewport()
})

test('demo action stays outside the display and reachable through all seven stages',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 for(const [width,height] of [[1440,900],[1280,720],[393,852]]){
  await page.setViewportSize({width,height});await page.goto('/?study=flow')
  const primary=page.getByTestId('flow-primary')
  for(let step=1;step<=7;step++){
   await expect(page.getByTestId('flow-study')).toHaveAttribute('data-step',String(step),{timeout:6000})
   await primary.evaluate(node=>node.scrollIntoView({block:'center'}))
   const rect=await primary.boundingBox()
   expect(rect!.y,`stage ${step} at ${width}px`).toBeGreaterThanOrEqual(0)
   expect(rect!.y+rect!.height,`stage ${step} at ${width}px`).toBeLessThanOrEqual(height)
   if(step<7)await primary.click()
  }
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
  await primary.scrollIntoViewIfNeeded()
  await expect(primary).toBeInViewport({ratio:1})
  const controller=await page.locator('.fs-action-bar').boundingBox(),display=await page.locator('.ac-vehicle').boundingBox()
  expect(controller!.y,'demo controls must not occupy the display').toBeGreaterThanOrEqual(display!.y+display!.height)
 }
})

test('wide preview gives the five-cell board the whole app window and keeps external controls clickable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow')
 await expect(page.locator('.ac-vehicle')).toHaveAttribute('data-flow-mode','wide')
 const app=await page.locator('.ac-vehicle-content').boundingBox(),board=await page.getByTestId('flow-board').boundingBox()
 expect(board!.x).toBeGreaterThanOrEqual(app!.x);expect(board!.x+board!.width).toBeLessThanOrEqual(app!.x+app!.width+1)
 expect(board!.height/app!.height).toBeGreaterThan(.9)
 await expect(page.getByTestId('flow-board').locator('.fs-cell[data-cell-visible=true]')).toHaveCount(4)
 await page.getByRole('button',{name:'처음부터',exact:true}).click()
})

test('split window stacks the guide first, then the record summary and a compact scene beside the vehicle',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?study=flow&window=split')
 const board=page.getByTestId('flow-board')
 await expect(board).toHaveAttribute('data-profile','narrow')
 for(let i=0;i<2;i++)await next(page)
 await expect(board).toHaveAttribute('data-layout','evacuate')
 const boxes=await board.evaluate(node=>Object.fromEntries([...node.querySelectorAll<HTMLElement>('.fs-cell[data-cell-visible=true]')].map(cell=>{const r=cell.querySelector('.fs-cell-body')!.getBoundingClientRect();return [cell.dataset.cell!,{top:r.top,left:r.left,height:r.height,compact:cell.dataset.compact==='true'}]})))
 expect(Object.keys(boxes).sort()).toEqual(['emergency','guide','record','scene','vehicle'])
 expect(boxes.emergency.top).toBeLessThan(boxes.guide.top);expect(boxes.guide.top).toBeLessThan(boxes.record.top);expect(boxes.record.top).toBeLessThan(boxes.scene.top)
 expect(Math.abs(boxes.scene.top-boxes.vehicle.top)).toBeLessThanOrEqual(1);expect(boxes.scene.left).toBeLessThan(boxes.vehicle.left)
 expect(boxes.guide.height).toBeGreaterThan(boxes.record.height)
 expect([boxes.guide.compact,boxes.record.compact,boxes.scene.compact,boxes.vehicle.compact]).toEqual([false,true,true,true])
})
