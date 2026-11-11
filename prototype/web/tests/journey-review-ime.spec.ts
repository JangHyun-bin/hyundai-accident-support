import {test,expect,type Locator,type Page} from '@playwright/test'

async function review(page:Page) {
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click()
  const primary=page.getByTestId('journey-primary')
  await primary.click()
  await page.getByRole('button',{name:'시연 event: 통화 연결 확인',exact:true}).click()
  for(let i=0;i<3;i++)await primary.click()
  await page.getByRole('button',{name:'직접 입력',exact:true}).click()
  await page.getByRole('textbox',{name:'사고 기록',exact:true}).fill('이미 저장한 사고 기록')
  await page.getByRole('button',{name:'기록 저장',exact:true}).click()
  await primary.click()
  await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step','6')
}

async function interruptComposition(page:Page,input:Locator) {
  await input.fill('정차 중 ')
  const original=await input.elementHandle()
  await input.evaluate((node:HTMLInputElement|HTMLTextAreaElement)=>{
    node.focus({preventScroll:true})
    node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}))
    const prototype=node instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(node,'정차 중 오른쪽')
    node.setSelectionRange(3,8,'backward')
    node.dispatchEvent(new CompositionEvent('compositionupdate',{bubbles:true,data:'오른쪽'}))
  })
  await page.getByRole('button',{name:'시연 event: 위험 정보',exact:true}).evaluate((node:HTMLButtonElement)=>node.click())
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage','response')
  await expect(page.getByRole('button',{name:'위험 안내 확인',exact:true})).toBeVisible()
  expect(await original!.evaluate((node:HTMLInputElement|HTMLTextAreaElement)=>({connected:node.isConnected,value:node.value,selection:[node.selectionStart,node.selectionEnd,node.selectionDirection]}))).toEqual({connected:true,value:'정차 중 오른쪽',selection:[3,8,'backward']})
  await page.getByRole('button',{name:'내용 확인으로 돌아가기',exact:true}).evaluate((node:HTMLButtonElement)=>node.click())
  await expect(input).toHaveValue('정차 중 오른쪽')
  expect(await input.evaluate((node:HTMLInputElement|HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,8,'backward'])
}

for(const kind of ['new','existing'] as const)test(`urgent response preserves observable IME text and selection in a ${kind} report paragraph`,async({page})=>{
  await review(page)
  if(kind==='existing')await page.getByRole('button',{name:'시연 event: 경위서 초안',exact:true}).click()
  await page.getByRole('button',{name:'경위서',exact:true}).click()
  if(kind==='new')await page.getByRole('button',{name:'문장 추가',exact:true}).click()
  else await page.getByRole('article',{name:'문장 1',exact:true}).getByRole('button',{name:'정정하기',exact:true}).click()
  await interruptComposition(page,page.getByRole('textbox',{name:'문장 내용',exact:true}))
})

for(const recipient of ['보험사 접수','차량 지원','상대방 공유'])test(`urgent response preserves observable IME recipient and selection for ${recipient}`,async({page})=>{
  await review(page)
  await page.getByTestId('journey-primary').click()
  await page.getByRole('navigation',{name:'보낼 대상',exact:true}).getByRole('button',{name:recipient,exact:true}).click()
  await interruptComposition(page,page.getByRole('textbox',{name:'수신처',exact:true}))
})
