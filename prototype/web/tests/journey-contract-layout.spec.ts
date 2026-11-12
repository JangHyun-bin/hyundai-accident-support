import { test, expect, type Locator, type Page } from '@playwright/test'

async function contained(element:Locator,container:Locator) {
  const child=await element.boundingBox(),parent=await container.boundingBox()
  expect(child).not.toBeNull();expect(parent).not.toBeNull()
  expect(child!.x).toBeGreaterThanOrEqual(parent!.x-1)
  expect(child!.y).toBeGreaterThanOrEqual(parent!.y-1)
  expect(child!.x+child!.width).toBeLessThanOrEqual(parent!.x+parent!.width+1)
  expect(child!.y+child!.height).toBeLessThanOrEqual(parent!.y+parent!.height+1)
}

async function environment(page:Page,font:number,width:number,device:string) {
  await page.evaluate(()=>document.fonts.ready)
  const board=page.getByTestId('flow-board'),shell=page.locator('.journey-flow [data-care-component=vehicle-shell]')
  await expect(shell).toHaveAttribute('data-flow-font-size',String(font))
  await expect(board).toHaveAttribute('data-profile',font===32&&!(device==='vehicle'&&width===2560)?'document':device==='vehicle'&&width>=1440?'wide':/^(wide|narrow|mobile|document)$/)
  const profile=(await board.getAttribute('data-profile'))!
  await expect(shell).toHaveAttribute('data-flow-mode',profile)
  await expect(shell).toHaveAttribute('data-flow-reason',/\S+/)
  return profile
}

type ProfileProbe=HTMLElement&{contractProbe:{profiles:string[];frames:number[][];observer:MutationObserver;resize:ResizeObserver}}
async function observeEnvironment(board:Locator) {
  await board.evaluate(node=>{
    const shell=node.closest('[data-care-component=vehicle-shell]')!,scene=shell.querySelector('.journey-flow-scene')!
    const dimensions=()=>[shell,node,scene].flatMap(element=>{const r=element.getBoundingClientRect();return [r.width,r.height]})
    const profiles=[node.getAttribute('data-profile')!],frames=[dimensions()]
    const observer=new MutationObserver(()=>profiles.push(node.getAttribute('data-profile')!))
    observer.observe(node,{attributes:true,attributeFilter:['data-profile']})
    const resize=new ResizeObserver(()=>frames.push(dimensions()))
    for(const element of [shell,node,scene])resize.observe(element)
    ;(node as ProfileProbe).contractProbe={profiles,frames,observer,resize}
  })
}

async function workspaceFits(page:Page,profile:string) {
  const shell=page.locator('.journey-flow [data-care-component=vehicle-shell]'),board=page.getByTestId('flow-board')
  await expect(page.locator('[data-care-component=vehicle-shell]:visible')).toHaveCount(1)
  await expect(board).toHaveAttribute('data-profile',profile)
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const workspace=board.locator('.journey-flow-workspace:visible'),slot=board.locator('.fs-cell-body:has(.journey-flow-workspace:not([hidden])):visible')
  const scroll=workspace.locator('.journey-workspace-scroll:visible')
  await expect(workspace).toHaveCount(1);await expect(scroll).toHaveCount(1)
  await expect.poll(()=>scroll.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true)
  await contained(workspace.locator('.journey-editor-title:visible'),slot)
  await contained(workspace.locator('.journey-editor-primary:visible'),slot)
  if(profile!=='document'){
    expect(await scroll.evaluate(node=>getComputedStyle(node).overflowY)).toBe('auto')
    expect(await slot.evaluate(node=>getComputedStyle(node).overflowY)).toBe('visible')
    expect(await workspace.evaluate(node=>[...node.querySelectorAll<HTMLElement>('*')].filter(element=>element.tagName!=='TEXTAREA'&&element.getClientRects().length&&/auto|scroll/.test(getComputedStyle(element).overflowY)&&element.scrollHeight>element.clientHeight+1).every(element=>element.classList.contains('journey-workspace-scroll')))).toBe(true)
    const title=workspace.locator('.journey-editor-title:visible'),action=workspace.locator('.journey-editor-primary:visible')
    const before=[await title.boundingBox(),await action.boundingBox()]
    await scroll.evaluate(node=>{node.scrollTop=node.scrollHeight})
    const after=[await title.boundingBox(),await action.boundingBox()]
    for(let index=0;index<before.length;index++)expect(Math.abs(before[index]!.y-after[index]!.y)).toBeLessThanOrEqual(1)
    await contained(board,shell)
  }else expect(await scroll.evaluate(node=>getComputedStyle(node).overflowY)).toBe('visible')
}

for (const [width, device] of [[2560, 'vehicle'], [1920, 'vehicle'], [1440, 'vehicle'], [960, 'vehicle'], [393, 'vehicle'], [393, 'mobile'], [360, 'mobile']] as const) {
  test(`representative ${device} at ${width}px preserves readable actions and semantic hit areas`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 1920 ? 1440 : width <= 393 ? 852 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?device=' + device)
    await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
    const flow = page.getByTestId('journey-flow')
    await expect(flow).toHaveAttribute('data-step', '1')
    const primary = page.getByTestId('journey-primary')
    await expect(primary).toBeInViewport({ratio:1})
    await primary.click()
    await page.getByRole('button', { name: /^(?:다음 · )?시연 event: 통화 연결 확인$/, exact: true }).click()
    await primary.click()
    await expect(flow).toHaveAttribute('data-step', '3')
    for (const font of [16, 32]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px` }, font)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      const profile=await environment(page,font,width,device)
      const minimum = device === 'vehicle' ? 64 : 48
      for (const button of await flow.getByRole('button').all()) {
        const rect = await button.boundingBox()
        expect(rect!.height).toBeGreaterThanOrEqual(minimum)
        expect(rect!.width).toBeGreaterThanOrEqual(minimum)
      }
      const shell=flow.locator('[data-care-component=vehicle-shell]')
      await contained(flow.locator('.fs-step-copy h1'),shell)
      await contained(primary,shell)
      const guide=flow.locator('[data-cell=guide] .fs-cell-body')
      expect(await guide.evaluate(node=>getComputedStyle(node).overflowY)).toBe(profile==='document'?'visible':'auto')
      await expect.poll(()=>guide.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true)
      await primary.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest'}))
      await expect(primary).toBeInViewport({ratio:1})
      await primary.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      expect(await primary.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('4px')
      if (font === 32) expect(await flow.locator('.fs-step-copy h1').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(56)
    }
    expect(await flow.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations === Infinity).length)).toBe(0)
  })
}

for (const [width, device, font] of [[2560, 'vehicle', 16], [2560, 'vehicle', 32], [393, 'mobile', 32], [360, 'mobile', 32]] as const) {
  test(`long record and review remain reachable in one ${device} shell at ${width}px and ${font}px root text`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 2560 ? 1440 : 852 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?device=' + device)
    await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
    const primary = page.getByTestId('journey-primary')
    await primary.click()
    await page.getByRole('button', { name: /^(?:다음 · )?시연 event: 통화 연결 확인$/, exact: true }).click()
    for (let index = 0; index < 3; index++) await primary.click()
    await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step', '5')
    await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px` }, font)
    const profile=await environment(page,font,width,device)
    const board=page.getByTestId('flow-board')
    await observeEnvironment(board)
    await page.getByRole('button', { name: '직접 입력', exact: true }).click()
    const long = '정차 중 오른쪽에서 충격을 느꼈어요. 확인하지 못한 내용은 미확인으로 남겨둘게요. '.repeat(12)
    const input = page.getByRole('textbox', { name: '사고 기록', exact: true })
    await input.fill(long)
    const inputNode = await input.elementHandle()
    const fit=()=>workspaceFits(page,profile)
    await expect(input).toHaveValue(long)
    await fit()
    await page.getByRole('button', { name: '기록 저장', exact: true }).click()
    await primary.click()
    await expect(page.getByTestId('journey-flow')).toHaveAttribute('data-step', '6')
    await page.getByRole('button', { name: '경위서', exact: true }).click()
    await page.getByRole('button', { name: '문장 추가', exact: true }).click()
    await page.getByRole('textbox', { name: '문장 내용', exact: true }).fill(long)
    await page.getByRole('button', { name: '정정 저장', exact: true }).click()
    await page.getByRole('button', { name: '문장 확인', exact: true }).click()
    await expect(page.locator('.journey-report-text:visible')).toHaveText(long.trim())
    await fit()
    await page.getByRole('button', { name: '보낼 내용 확인', exact: true }).click()
    await page.getByRole('textbox', { name: '수신처', exact: true }).fill('사용자가 확인한 보험사 수신처')
    await page.getByRole('checkbox', { name: /남긴 이야기 1/ }).check()
    await page.getByRole('checkbox', { name: '경위서', exact: true }).check()
    await page.getByRole('button', { name: '선택한 내용 미리보기', exact: true }).click()
    await expect(page.getByRole('region', { name: '보낼 내용 미리보기' })).toContainText(long.trim())
    await expect(page.getByRole('region', { name: '보낼 내용 미리보기' })).toContainText('사용자가 확인한 보험사 수신처')
    await fit()
    const approve = page.getByRole('button', { name: '이 내용으로 요청', exact: true })
    await approve.scrollIntoViewIfNeeded()
    await expect(approve).toBeInViewport({ ratio: 1 })
    await approve.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    expect(await approve.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('4px')
    expect(await inputNode!.evaluate(node => node.isConnected)).toBe(true)
    expect(await inputNode!.evaluate((node:HTMLTextAreaElement)=>node.value)).toBe(long)
    const observed=await board.evaluate(node=>{
      const {profiles,frames,observer,resize}=(node as ProfileProbe).contractProbe
      observer.disconnect();resize.disconnect()
      return {profiles,frames}
    })
    expect(observed.profiles.every(value=>value===profile)).toBe(true)
    if(profile!=='document')for(let dimension=0;dimension<6;dimension++){
      const values=observed.frames.map(frame=>frame[dimension])
      expect(Math.max(...values)-Math.min(...values),`shell/board/scene dimension ${dimension} changed after content or stage`).toBeLessThanOrEqual(1)
    }
  })
}
