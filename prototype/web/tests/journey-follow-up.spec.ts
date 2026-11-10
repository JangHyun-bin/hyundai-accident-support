import { test, expect } from '@playwright/test'
import { createCase, reduceCase } from '../src/journey/case'
import { createSession } from '../src/emergency/session'

const now = '2026-11-10T09:12:00.000Z'
function fresh() { return createCase(createSession('SC05', 'suspended'), 'follow-up-case', now) }

test('follow-up selections preserve emergency requests and generate scoped identities for route and rental', () => {
  const original = fresh()
  let value = reduceCase(original, { type: 'follow-up', value: { ...original.followUp, shopId: 'gaon-service' }, now })
  expect(value.followUp.shopId).toBe('gaon-service')
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, route: 'preview' }, now })
  expect(value.followUp.routeRequest?.shopId).toBe('gaon-service')
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  expect(value.followUp.rentalRequest?.shopId).toBe('gaon-service')
  expect(value.followUp.rentalRequest?.id).not.toBe(value.followUp.routeRequest?.id)
  expect(value.emergency.requests).toEqual(original.emergency.requests)
  expect(value.returnStage).toBe(original.returnStage)
  expect(value.submissions).toEqual(original.submissions)
})

test('late results from an old shop or request cannot change the current follow-up', () => {
  let value = fresh()
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, shopId: 'gaon-service' }, now })
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  const first = value.followUp.rentalRequest!
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, shopId: 'daon-service' }, now })
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  const second = value.followUp.rentalRequest!
  const late = reduceCase(value, { type: 'follow-up-result', caseId: value.id, shopId: first.shopId, requestId: first.id, kind: 'rental', status: 'eligible', source: 'fixture', updatedAt: now })
  expect(late).toBe(value)
  expect(second.id).not.toBe(first.id)
  expect(reduceCase(value, { type: 'follow-up-result', caseId: value.id, shopId: 'gaon-service', requestId: second.id, kind: 'rental', status: 'eligible', source: 'fixture', updatedAt: now })).toBe(value)
  const confirmed = reduceCase(value, { type: 'follow-up-result', caseId: value.id, shopId: second.shopId, requestId: second.id, kind: 'rental', status: 'eligible', source: 'fixture', updatedAt: now })
  expect(confirmed.followUp.rental).toBe('eligible')
  expect(confirmed.followUp.rentalRequest?.source).toBe('fixture')
})

test('rental can be checked without a shop and cannot be confirmed by a user intent', () => {
  let value = fresh()
  expect(reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'eligible' }, now })).toBe(value)
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  const request = value.followUp.rentalRequest!
  expect(request.shopId).toBeNull()
  value = reduceCase(value, { type: 'follow-up-result', caseId: value.id, shopId: null, requestId: request.id, kind: 'rental', status: 'unknown', source: 'fixture', updatedAt: now })
  expect(value.followUp.rental).toBe('unknown')
  const retry = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  expect(retry.followUp.rentalRequest?.id).not.toBe(request.id)
})

test('repair changes preserve confirmed rental provenance and route requires a selected shop', () => {
  let value = fresh()
  expect(reduceCase(value, { type: 'follow-up', value: { ...value.followUp, route: 'guiding' }, now })).toBe(value)
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  const request = value.followUp.rentalRequest!
  value = reduceCase(value, { type: 'follow-up-result', caseId: value.id, shopId: null, requestId: request.id, kind: 'rental', status: 'ineligible', source: 'fixture', updatedAt: now })
  const changed = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, repairItems: ['앞 범퍼 외관'], source: 'user', updatedAt: '2026-11-11T01:00:00.000Z' }, now })
  expect(changed.followUp.rentalRequest).toEqual(value.followUp.rentalRequest)
  expect(changed.followUp.rental).toBe('ineligible')
  expect(changed.emergency).toEqual(value.emergency)
})

test('follow-up route connects to the shared map and urgent return preserves repair choices', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await page.goto('/?study=journey&device=mobile&fixture=partial-evidence')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await page.getByRole('button', { name: '후속 처리 보기', exact: true }).click()
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true }).check()
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await page.getByRole('button', { name: '후속 처리로 돌아가기', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })).toBeChecked()
  await page.getByRole('button', { name: '선택한 항목 검토', exact: true }).click()
  await page.getByRole('button', { name: '검토 내용 저장', exact: true }).click()
  await page.getByRole('button', { name: '경로 미리보기', exact: true }).click()
  await expect(page.locator('[data-navigation-state="fixture"]:visible')).toBeVisible()
  await expect(page.locator('.journey-map-caption:visible').getByText('가온 정비센터', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '대차 가능 여부 확인', exact: true }).click()
  await expect(page.getByText('대차 가능 여부 확인 중', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '시연 event: 대차 가능 확인', exact: true }).click()
  await expect(page.getByText('대차 이용 가능 확인', { exact: true })).toBeVisible()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('대차 이용 가능 확인', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: '앞 범퍼 외관', exact: true })).toBeChecked()
  await page.locator('[data-journey-device="mobile"]:visible').screenshot({ path: testInfo.outputPath('mobile-follow-up.png') })
  await page.getByRole('button', { name: '차량 보기', exact: true }).click()
  await page.setViewportSize({ width: 1600, height: 1050 })
  await expect(page.locator('.journey-map-caption:visible').getByText('가온 정비센터', { exact: true })).toBeVisible()
  await page.locator('[data-case-id]').screenshot({ path: testInfo.outputPath('vehicle-follow-up.png') })
})

test('directory failures hide unavailable route data while agency requests remain independent', async ({ page }) => {
  await page.goto('/?study=journey&fixture=suspended-receipt')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await page.getByRole('button', { name: '후속 처리 보기', exact: true }).click()
  await page.getByRole('button', { name: '가온 정비센터 선택', exact: true }).click()
  await page.getByRole('button', { name: '경로 미리보기', exact: true }).click()
  await expect(page.locator('[data-navigation-state="fixture"]:visible')).toBeVisible()
  await page.getByLabel('정비소 정보', { exact: true }).selectOption('failed')
  await expect(page.getByText('정비소 정보를 불러오지 못했어요', { exact: true })).toBeVisible()
  await expect(page.locator('[data-navigation-state="unknown"]:visible')).toBeVisible()
  const requests = page.getByLabel('기관별 요청 상태', { exact: true }).filter({ visible: true })
  await expect(requests.getByText('접수 확인', { exact: true })).toBeVisible()
  await expect(requests.getByText('접수 미확인', { exact: true })).toBeVisible()
  await page.getByLabel('정비소 정보', { exact: true }).selectOption('stale')
  await expect(page.getByText('입고 가능 여부를 다시 확인해주세요', { exact: true })).toBeVisible()
})

test('stored follow-up request identities must match the selected shop while older idle cases remain valid', async () => {
  const { validateCase } = await import('../src/journey/case')
  const legacy = fresh()
  delete legacy.followUp.requestRevision
  delete legacy.followUp.routeRequest
  delete legacy.followUp.rentalRequest
  expect(validateCase(legacy)).toBe(true)
  let value = reduceCase(fresh(), { type: 'follow-up', value: { ...fresh().followUp, shopId: 'gaon-service' }, now })
  value = reduceCase(value, { type: 'follow-up', value: { ...value.followUp, rental: 'checking' }, now })
  value.followUp.rentalRequest!.shopId = 'another-shop'
  expect(validateCase(value)).toBe(false)
})
