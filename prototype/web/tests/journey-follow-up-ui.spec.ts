import { test, expect, type Page } from '@playwright/test'
import type { CaseCommand, JourneyCase, FollowUp, Device } from '../src/journey/case'
import type { FollowUpDirectoryState } from '../src/journey/follow-up-fixtures'

declare global {
  interface Window {
    followUpValue: JourneyCase
    followUpCommands: CaseCommand[]
    followUpDirty: boolean
    followUpUpdate: (followUp: Partial<FollowUp>) => void
    followUpSetDirectory: (state: FollowUpDirectoryState) => void
    followUpSetVisible: (visible: boolean) => void
  }
}

async function mount(page: Page, input: { directory?: FollowUpDirectoryState; rental?: FollowUp['rental']; device?: Device; actual?: boolean } = {}) {
  await page.goto('/?study=journey-catalog')
  await page.evaluate(async input => {
    const paths = { runtime: '/tests/react-runtime.ts',
      panel: '/src/journey/FollowUpPanel.tsx', fixtures: '/src/journey/follow-up-fixtures.ts', layout: '/src/journey/JourneyLayout.tsx',
      domain: '/src/journey/case.ts', session: '/src/emergency/session.ts', vehicle: '/src/journey/VehiclePanel.tsx' }
    const { React, createRoot } = await import(paths.runtime) as typeof import('./react-runtime')
    const { FollowUpPanel } = await import(paths.panel) as typeof import('../src/journey/FollowUpPanel')
    const { followUpDirectories } = await import(paths.fixtures) as typeof import('../src/journey/follow-up-fixtures')
    const { JourneyLayout } = await import(paths.layout) as typeof import('../src/journey/JourneyLayout')
    const { JourneyNavigation } = await import(paths.vehicle) as typeof import('../src/journey/VehiclePanel')
    const { createCase } = await import(paths.domain) as typeof import('../src/journey/case')
    const { createSession } = await import(paths.session) as typeof import('../src/emergency/session')
    const initial = createCase(createSession('SC05', 'suspended'), 'follow-up-ui', '2026-11-10T09:12:00.000Z')
    initial.stage = 'follow-up'; initial.returnStage = 'review'
    initial.fixtureId = input.actual ? null : 'complete-journey'
    if (input.rental) initial.followUp.rental = input.rental
    window.followUpCommands = []; window.followUpDirty = false
    function App() {
      const [value, setValue] = React.useState(initial)
      const [directory, setDirectory] = React.useState(input.directory)
      const [visible, setVisible] = React.useState(true)
      window.followUpValue = value
      window.followUpUpdate = patch => setValue(previous => ({ ...previous, followUp: { ...previous.followUp, ...patch } }))
      window.followUpSetDirectory = setDirectory
      window.followUpSetVisible = setVisible
      return React.createElement('div', { hidden: !visible, className: 'journey-theme' }, React.createElement(JourneyLayout, { device: input.device ?? 'mobile',
        summary: React.createElement('p', {}, '차량 지원 확인 중'), navigation: React.createElement(JourneyNavigation, { value }),
        children: React.createElement(FollowUpPanel, { value, directory: directory ? followUpDirectories[directory] : undefined,
          navigation: input.device === 'vehicle' ? undefined : React.createElement(JourneyNavigation, { value }),
          onDirtyChange: dirty => { window.followUpDirty = dirty },
          onCommand: command => { window.followUpCommands.push(command); if (command.type === 'follow-up') setValue(previous => ({ ...previous, followUp: command.value })) },
        }) }))
    }
    document.getElementById('root')!.hidden = true
    const target = document.createElement('div'); document.body.append(target)
    createRoot(target).render(React.createElement(App))
  }, input)
}

test('shop selection is distinct from booking and route guidance needs a separate action', async ({ page }) => {
  await mount(page)
  const requests = await page.evaluate(() => window.followUpValue.emergency.requests)
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await expect(page.getByText('선택한 정비소', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.followUpValue.followUp.shopId)).toBe('gaon-service')
  expect(await page.evaluate(() => window.followUpValue.followUp.route)).toBe('idle')
  await page.getByRole('button', { name: '경로 미리보기', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.route)).toBe('preview')
  await expect(page.getByText('차량 이동 가능 여부는 별도로 확인해주세요.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '안내 시작', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.route)).toBe('guiding')
  await expect(page.getByText('경로 안내 중', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.followUpValue.emergency.requests)).toEqual(requests)
  expect(await page.evaluate(() => window.followUpValue.returnStage)).toBe('review')
  await expect(page.getByText('예약 완료', { exact: true })).toHaveCount(0)
})

test('repair items stay local until reviewed and can be canceled without touching the saved selection', async ({ page }) => {
  await mount(page)
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true }).check()
  expect(await page.evaluate(() => window.followUpValue.followUp.repairItems)).toEqual([])
  expect(await page.evaluate(() => window.followUpDirty)).toBe(true)
  await page.getByRole('button', { name: '선택한 항목 검토', exact: true }).click()
  const review = page.getByRole('region', { name: '정비소에 전할 내용', exact: true })
  await expect(review.getByText('앞 범퍼 외관', { exact: true })).toBeVisible()
  await expect(review.getByText('전면등 작동', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '검토 내용 저장', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.repairItems)).toEqual(['앞 범퍼 외관'])
  await expect(page.getByText('예상 점검 항목이며, 실제 수리 범위와 비용은 정비소 확인이 필요해요.', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: '전면등 작동', exact: true }).check()
  await page.getByRole('button', { name: '선택 취소', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.repairItems)).toEqual(['앞 범퍼 외관'])
  await expect(page.getByRole('checkbox', { name: '전면등 작동', exact: true })).not.toBeChecked()
  expect(await page.evaluate(() => window.followUpDirty)).toBe(false)
})

test('rental remains unconfirmed until an external result is supplied', async ({ page }) => {
  await mount(page)
  await expect(page.getByText('대차 자격 확인 필요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '대차 가능 여부 확인', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.rental)).toBe('checking')
  await expect(page.getByText('대차 가능 여부 확인 중', { exact: true })).toBeVisible()
  await expect(page.getByText('대차 이용 가능 확인', { exact: true })).toHaveCount(0)
  await page.evaluate(() => window.followUpUpdate({ rental: 'unknown' }))
  await expect(page.getByText('대차 가능 여부 미확인', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '대차 다시 확인', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.rental)).toBe('checking')
  await page.evaluate(() => window.followUpUpdate({ rental: 'ineligible' }))
  await expect(page.getByText('대차 이용 불가 확인', { exact: true })).toBeVisible()
  await page.evaluate(() => window.followUpUpdate({ rental: 'eligible' }))
  await expect(page.getByText('대차 이용 가능 확인', { exact: true })).toBeVisible()
  await expect(page.getByText('예약 완료', { exact: true })).toHaveCount(0)
})

for (const [state, text] of [
  ['empty', '제공된 정비소가 없어요'], ['failed', '정비소 정보를 불러오지 못했어요'], ['stale', '입고 가능 여부를 다시 확인해주세요'],
] as const) test(`${state} directory does not promise a current intake time`, async ({ page }) => {
  await mount(page, { directory: state })
  await expect(page.getByText(text, { exact: true })).toBeVisible()
  if (state !== 'stale') await expect(page.getByRole('button', { name: '가온 정비센터 선택', exact: true })).toHaveCount(0)
  else {
    await expect(page.getByText('이전 입고 안내', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('지금 입고 가능', { exact: true })).toHaveCount(0)
  }
})

test('actual cases get no synthetic directory and hidden local edits survive a return', async ({ page }) => {
  await mount(page, { actual: true })
  await expect(page.getByRole('button', { name: '가온 정비센터 선택', exact: true })).toHaveCount(0)
  await page.evaluate(() => window.followUpSetDirectory('ready'))
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true }).check()
  await page.evaluate(() => { window.followUpSetVisible(false); window.followUpUpdate({ rental: 'unknown' }) })
  await page.evaluate(() => window.followUpSetVisible(true))
  await expect(page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })).toBeChecked()
  expect(await page.evaluate(() => window.followUpValue.followUp.repairItems)).toEqual([])
})

test('keyboard and enlarged mobile text preserve selection and primary actions', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mount(page)
  const select = page.getByRole('button', { name: '가온 정비센터 선택', exact: true })
  await select.focus(); await page.keyboard.press('Enter')
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  await expect(page.getByRole('button', { name: '경로 미리보기', exact: true })).toBeVisible()
  const checkbox = page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })
  await checkbox.focus(); await page.keyboard.press('Space')
  await expect(checkbox).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('saved repair selections can be cleared after explicit review', async ({ page }) => {
  await mount(page)
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.evaluate(() => window.followUpUpdate({ repairItems: ['앞 범퍼 외관'] }))
  const checkbox = page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })
  await expect(checkbox).toBeChecked()
  await checkbox.uncheck()
  await expect(page.getByRole('button', { name: '선택한 항목 검토', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '선택한 항목 검토', exact: true }).click()
  await expect(page.getByText('선택한 항목이 없어요. 이전 선택을 비울 수 있어요.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '검토 내용 저장', exact: true }).click()
  expect(await page.evaluate(() => window.followUpValue.followUp.repairItems)).toEqual([])
})

test('follow-up views remain visually reviewable in mobile and vehicle layouts', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await mount(page)
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: testInfo.outputPath('mobile-shops.png') })
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true }).check()
  await page.getByRole('button', { name: '선택한 항목 검토', exact: true }).click()
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: testInfo.outputPath('mobile-review.png') })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: testInfo.outputPath('mobile-review-200.png') })
  await page.setViewportSize({ width: 1600, height: 1050 })
  await mount(page, { device: 'vehicle', directory: 'stale' })
  await page.locator('.journey-vehicle-viewport:visible').screenshot({ path: testInfo.outputPath('vehicle-stale.png') })
  await page.setViewportSize({ width: 393, height: 852 })
  await mount(page, { directory: 'failed', rental: 'unknown' })
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: testInfo.outputPath('mobile-unavailable.png') })
})

test('route and rental retain their own source and result times', async ({ page }) => {
  await mount(page)
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.evaluate(() => window.followUpUpdate({
    route: 'guiding', routeRequest: { id: 'route-1', shopId: 'gaon-service', source: 'fixture', updatedAt: '2026-11-10T10:00:00.000Z' },
    rental: 'unknown', rentalRequest: { id: 'rental-1', shopId: null, source: 'user', updatedAt: '2026-11-10T09:30:00.000Z' },
  }))
  const route = page.getByRole('region', { name: '이동 경로', exact: true })
  const rental = page.getByRole('region', { name: '대차 이용', exact: true })
  await expect(route.getByText('제공된 안내')).toBeVisible()
  await expect(rental.getByText('직접 확인 요청')).toBeVisible()
  await expect(route.getByText('11월 10일 오후 07:00 확인', { exact: true })).toBeVisible()
  await expect(rental.getByText('11월 10일 오후 06:30 요청', { exact: true })).toBeVisible()
  await page.evaluate(() => window.followUpUpdate({ routeRequest: { id: 'route-1', shopId: 'gaon-service', source: 'fixture', updatedAt: '2026-11-10T10:15:00.000Z' } }))
  await expect(rental.getByText('11월 10일 오후 06:30 요청', { exact: true })).toBeVisible()
  await page.evaluate(() => window.followUpUpdate({ rentalRequest: { id: 'rental-1', shopId: null, source: 'fixture', updatedAt: null } }))
  await expect(rental.getByText('갱신 시각 미확인', { exact: true })).toBeVisible()
})


test('mobile route map appears only after preview and remains readable at 200% text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mount(page)
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  const map = page.locator('.journey-follow-up-navigation')
  await expect(map).toHaveCount(0)
  await page.getByRole('button', { name: '경로 미리보기', exact: true }).click()
  await expect(map.getByText('위치 확인 중', { exact: true })).toBeVisible()
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.getByRole('region', { name: '이동 경로', exact: true }).screenshot({ path: testInfo.outputPath('mobile-route-200.png') })
  await page.getByRole('button', { name: '안내 시작', exact: true }).click()
  await expect(map).toBeVisible()
  await page.getByRole('button', { name: '안내 종료', exact: true }).click()
  await expect(map).toHaveCount(0)
})


test('directory loss preserves repair edits and leaves cancel available', async ({ page }) => {
  await mount(page)
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true }).check()
  await page.evaluate(() => window.followUpSetDirectory('failed'))
  await expect(page.getByRole('region', { name: '보관 중인 점검 항목', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '선택 취소', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.followUpDirty)).toBe(true)
  await page.evaluate(() => window.followUpSetDirectory('ready'))
  await expect(page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })).toBeChecked()
  await page.evaluate(() => window.followUpSetDirectory('empty'))
  await page.getByRole('button', { name: '선택 취소', exact: true }).click()
  expect(await page.evaluate(() => window.followUpDirty)).toBe(false)
  await page.evaluate(() => window.followUpSetDirectory('ready'))
  await expect(page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })).not.toBeChecked()
})
