import {expect,test} from '@playwright/test'
import fixtures from '../../../specs/emergency-experience/journey-fixtures.json' with {type:'json'}

test('root opens the complete functional journey and retains archived comparisons',async({page})=>{
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'사고 대응 · 전체 여정',exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:'Design system',exact:true})).toBeVisible()
  await page.goto('/?study=legacy')
  await expect(page.locator('.journey-study')).toHaveCount(0)
})
for(const fixture of fixtures.cases)test(`${fixture.id}: task screens use common workspace and survive return`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/?study=journey&fixture='+fixture.id)
  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  await page.getByRole('button',{name:'차량 상태 보기',exact:true}).click()
  await expect(page.locator('[data-care-layout=task]:visible')).toBeVisible()
  await expect(page.getByRole('heading',{name:'차량에서 확인한 내용',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'대응 화면으로',exact:true}).click()
  await page.getByRole('button',{name:'후속 처리 보기',exact:true}).click()
  await expect(page.locator('[data-care-layout=task]:visible')).toBeVisible()
  await page.getByRole('button',{name:'긴급 대응 보기',exact:true}).click()
  await expect(page.locator('[data-care-layout=response]:visible')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('mobile and 200% text keep actual record, review and follow-up in shared components',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/?study=journey&fixture=partial-evidence&device=mobile')
  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  await expect(page.locator('[data-care-layout=task]:visible')).toBeVisible()
  await page.addStyleTag({content:'html{font-size:200%}'})
  for(const label of ['내용 확인으로','보낼 내용 확인','전송 검토 닫기','후속 처리 보기']){
    await page.getByRole('button',{name:label,exact:true}).click()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    const clipped=await page.locator('[data-journey-device]:visible').evaluate(root=>[...root.querySelectorAll<HTMLElement>('button,p,h1,h2,h3')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent))
    expect(clipped).toEqual([])
  }
})

test('vehicle workspace keeps its action reachable while long content scrolls',async({page})=>{
  await page.setViewportSize({width:1600,height:900})
  await page.goto('/?study=journey&fixture=partial-evidence')
  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  await page.getByRole('button',{name:'차량 상태 보기',exact:true}).click()
  const body=page.getByRole('region',{name:'작업 내용',exact:true}).filter({visible:true})
  await expect(body).toBeVisible()
  expect(await body.evaluate(n=>n.scrollHeight>n.clientHeight)).toBe(true)
  await body.focus();await page.keyboard.press('End')
  const action=page.getByRole('button',{name:'대응 화면으로',exact:true})
  await action.scrollIntoViewIfNeeded();await expect(action).toBeInViewport()
})

test('narrow viewport adapts photo targets even when device is vehicle',async({page})=>{
  await page.setViewportSize({width:360,height:800})
  await page.goto('/?study=journey&fixture=partial-evidence')
  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  await page.getByRole('button',{name:'사진 남기기',exact:true}).click()
  const clipped=await page.locator('.journey-photo-targets:visible').evaluate(root=>[...root.querySelectorAll<HTMLElement>('button,span,strong')].filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent))
  expect(clipped).toEqual([])
})
