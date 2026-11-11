import { test, expect, type Locator, type Page } from '@playwright/test'

async function begin(page: Page, device: 'vehicle' | 'mobile') {
  await page.goto('/?study=journey&fixture=partial-evidence&device=' + device)
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
}

async function textContrast(surface: Locator) {
  return surface.evaluate(root => {
    const rgb = (color: string) => color.match(/[\d.]+/g)!.map(Number)
    const luminance = (color: number[]) => color.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
    const measurements: { text: string; ratio: number; minimum: number }[] = []
    for (const node of root.querySelectorAll<HTMLElement>('*')) {
      if (!node.getClientRects().length || node.closest('button:disabled,input:disabled,svg,video,audio') || ![...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())) continue
      const style = getComputedStyle(node)
      let ancestor: Element | null = node
      let background = 'rgb(11, 12, 14)'
      while (ancestor) {
        const color = getComputedStyle(ancestor).backgroundColor
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = color; break }
        ancestor = ancestor.parentElement
      }
      const values = [luminance(rgb(style.color)), luminance(rgb(background))].sort((a, b) => b - a)
      const size = parseFloat(style.fontSize)
      measurements.push({ text: node.textContent!.trim().slice(0, 60), ratio: (values[0] + .05) / (values[1] + .05), minimum: size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5 })
    }
    return measurements
  })
}

for (const viewport of [{ width: 2560, height: 1440 }, { width: 1440, height: 900 }]) {
  test(`vehicle ${viewport.width}×${viewport.height} keeps separate boxes, action, request baselines and readable contrast`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await begin(page, 'vehicle')
    await page.getByRole('button', { name: '차량 상태 보기', exact: true }).click()
    const surface = page.locator('[data-journey-device="vehicle"]:visible')
    const summary = await surface.locator('.journey-summary').boundingBox()
    const response = await surface.locator('.journey-response').boundingBox()
    expect(response!.y - summary!.y - summary!.height).toBeGreaterThan(10)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const action = page.getByRole('button', { name: '대응 화면으로', exact: true })
    await action.scrollIntoViewIfNeeded()
    await expect(action).toBeInViewport()
    const measurements = await textContrast(surface)
    expect(measurements.length).toBeGreaterThan(10)
    expect(measurements.filter(item => item.ratio < item.minimum)).toEqual([])
    await page.locator('[data-case-id]').screenshot({ path: testInfo.outputPath(`vehicle-${viewport.width}.png`) })
    await action.click()
    await page.getByRole('button', { name: '후속 처리 보기', exact: true }).click()
    const statuses = page.locator('.ac-request-list:visible > div > dd strong')
    await expect(statuses).toHaveCount(3)
    const positions = await statuses.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y))
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1)
  })
}

for (const width of [393, 360]) {
  test(`mobile ${width}px actual report preserves long Korean text, focus, targets and contrast at 200%`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 393 ? 852 : 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await begin(page, 'mobile')
    await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
    const start = page.getByRole('button', { name: '말로 기록하기', exact: true })
    await expect(start).toBeVisible()
    expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
    await page.getByRole('button', { name: '경위서', exact: true }).click()
    await page.getByRole('button', { name: '문장 추가', exact: true }).click()
    await page.getByLabel('문장 내용', { exact: true }).fill('정차한 상태에서 오른쪽 앞부분에 충격을 느꼈어요. 상대 차량의 이동 방향과 정확한 사고 경위는 아직 확인하지 못했어요.')
    await page.getByRole('button', { name: '정정 저장', exact: true }).click()
    const surface = page.locator('[data-journey-device="mobile"]:visible')
    await surface.screenshot({ path: testInfo.outputPath(`mobile-${width}-normal.png`) })
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const clipped = await surface.locator('button,p,h1,h2,h3').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length && node.scrollWidth > node.clientWidth + 1).map(node => node.textContent))
    expect(clipped).toEqual([])
    const confirm = page.getByRole('button', { name: '문장 확인', exact: true })
    await confirm.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('내용 확인함', { exact: true })).toBeVisible()
    const paragraph = page.getByRole('article', { name: '문장 1', exact: true })
    await expect(paragraph).toBeFocused()
    const targets = await surface.locator('button:not(:disabled)').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => ({ label: node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })))
    expect(targets.filter(item => item.width < 48 || item.height < 48)).toEqual([])
    const measurements = await textContrast(surface)
    expect(measurements.filter(item => item.ratio < item.minimum)).toEqual([])
    expect(await surface.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations === Infinity).length)).toBe(0)
    await surface.screenshot({ path: testInfo.outputPath(`mobile-${width}-200.png`) })
    await page.getByRole('button', { name: '보낼 내용 확인', exact: true }).click()
    await expect(page.getByRole('heading', { name: '보낼 범위를 직접 선택해주세요', exact: true })).toBeFocused()
    await page.getByRole('button', { name: '전송 검토 닫기', exact: true }).click()
    await expect(page.getByRole('heading', { name: '남겨진 자료를 살펴보세요', exact: true })).toBeFocused()
  })
}

test('unavailable follow-up is readable without imaginary map coordinates or product implementation copy', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await begin(page, 'mobile')
  await page.getByRole('button', { name: '후속 처리 보기', exact: true }).click()
  await page.getByLabel('정비소 정보', { exact: true }).selectOption('failed')
  await page.getByRole('button', { name: '대차 가능 여부 확인', exact: true }).click()
  await page.getByRole('button', { name: '시연 event: 대차 결과 미확인', exact: true }).click()
  const surface = page.locator('[data-journey-device="mobile"]:visible')
  await expect(surface).toContainText('정비소 정보를 불러오지 못했어요')
  await expect(surface).toContainText('대차 가능 여부 미확인')
  await expect(surface).not.toContainText(/fixture|schema|IndexedDB|PLEOS FLAT|가상 시연|실제 전화·전송 없음/)
  expect((await textContrast(surface)).filter(item => item.ratio < item.minimum)).toEqual([])
  await surface.screenshot({ path: testInfo.outputPath('mobile-unavailable.png') })
})
