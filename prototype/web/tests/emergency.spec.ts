import { expect, test } from '@playwright/test'

test('injury_action_preserves_movement_unknowns_and_separates_connection_from_receipt', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC01')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await expect(screen.getByText('충돌 감지 · 부상 있음', { exact: true })).toBeVisible()
  await screen.getByRole('button', { name: '지금 연결', exact: true }).click()
  await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeFocused()
  await expect(screen.locator('[data-fact="driver"]')).toContainText('미확인')
  await expect(screen.locator('[data-fact="route"]')).toContainText('미확인')
  await page.getByRole('button', { name: '시연 event: 통화 연결 확인' }).click()
  await expect(screen.getByRole('heading', { name: '119 통화 연결됨' })).toBeVisible()
  await expect(screen.locator('[data-request="rescue"]')).toContainText('접수 미확인')
  await expect(screen.getByRole('button', { name: /운전|이동하기|출발/ })).toHaveCount(0)
})

test('no_response_keeps_injury_and_consciousness_unknown_and_allows_late_response', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC03')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await page.getByRole('button', { name: '시연 event: 응답 없음 (즉시)' }).click()
  await expect(screen.getByText('충돌 감지 · 응답 없음', { exact: true })).toBeVisible()
  await expect(screen.locator('[data-fact="injury"]')).toContainText('미확인')
  await expect(screen.locator('[data-fact="consciousness"]')).toContainText('미확인')
  await screen.getByRole('button', { name: '응답할 수 있어요' }).click()
  await expect(screen.getByRole('heading', { name: '119 연결 중' })).toBeFocused()
  await expect(screen.locator('[data-slot="detected"]')).toContainText('응답 확인')
  await expect(screen.locator('[data-fact="consciousness"]')).toContainText('미확인')
})

test('pause_resume_preserves_independent_agency_states_without_retransmission', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC05')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await screen.getByRole('button', { name: '요청 상태 확인' }).click()
  await page.getByRole('button', { name: '시연 일시 중단' }).click()
  await expect(page.getByRole('button', { name: '시연 event: 차량 지원 접수 확인' })).toBeDisabled()
  await page.getByRole('button', { name: '시연 재개' }).click()
  await expect(screen.locator('[data-request="vehicle"]')).toContainText('접수 확인 중')
  await page.getByRole('button', { name: '시연 event: 차량 지원 접수 확인' }).click()
  await expect(screen.locator('[data-request="rescue"]')).toContainText('접수 확인')
  await expect(screen.locator('[data-request="vehicle"]')).toContainText('접수 확인')
  await expect(screen.locator('[data-request="insurance"]')).toContainText('요청 전')
  await expect(screen.locator('[data-fact="arrival"]')).toContainText('미확인')
  await page.reload()
  await expect(screen.getByRole('heading', { name: '차량 지원 접수 확인' })).toBeVisible()
})

test('invalid_scenario_and_scene_fall_back_and_spec_stays_inspectable_on_mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?study=emergency&scenario=bad&scene=connected')
  await expect(page.locator('[data-slot="detected"]')).toContainText('부상 있음')
  await page.getByRole('button', { name: '현재 장면 spec' }).click()
  await expect(page.getByRole('region', { name: '현재 장면 spec' })).toContainText('G4')
  await page.getByRole('button', { name: '응답 미확인', exact: true }).click()
  await expect(page.locator('[data-slot="detected"]')).toContainText('응답 미확인')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('external_event_keeps_keyboard_focus_in_scene_controls', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC01&scene=contact_unknown')
  const event = page.getByRole('button', { name: '시연 event: 통화 연결 확인' })
  await event.focus()
  await event.press('Enter')
  await expect(page.getByRole('navigation', { name: '장면 선택' }).getByRole('button', { name: /통화 연결/ })).toBeFocused()
})

test('voice_failure_keeps_script_visible_and_scene_change_cancels_old_speech', async ({ page }) => {
  await page.addInitScript(() => {
    const runtime = window as typeof window & { speechCancelled: number }
    runtime.speechCancelled = 0
    Object.defineProperty(window, 'speechSynthesis', { value: {
      cancel: () => { runtime.speechCancelled++ },
      speak: () => { throw new Error('Audio unavailable') },
    } })
  })
  await page.goto('/?study=emergency&scenario=SC05')
  await page.getByRole('button', { name: '음성 안내 듣기' }).click()
  await expect(page.getByRole('status')).toContainText('음성 원고')
  const before = await page.evaluate(() => (window as typeof window & { speechCancelled: number }).speechCancelled)
  await page.getByRole('navigation', { name: '장면 선택' }).getByRole('button', { name: /결과 조회/ }).click()
  // 장면 전환은 view transition 으로 다음 frame 에 commit 된다.
  await expect.poll(() => page.evaluate(() => (window as typeof window & { speechCancelled: number }).speechCancelled)).toBeGreaterThan(before)
  await expect(page.getByRole('status')).not.toContainText('차량 지원의 접수가 미확인이에요')
})

test('playing_voice_stops_on_pause_and_old_callbacks_cannot_change_new_voice', async ({ page }) => {
  await page.addInitScript(() => {
    const runtime = window as typeof window & { spoken: SpeechSynthesisUtterance[]; cancellations: number }
    runtime.spoken = []
    runtime.cancellations = 0
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak: (utterance: SpeechSynthesisUtterance) => runtime.spoken.push(utterance),
      cancel: () => { runtime.cancellations++ },
    } })
  })
  await page.goto('/?study=emergency&scenario=SC05')
  await page.getByRole('button', { name: '음성 안내 듣기' }).click()
  await expect(page.getByRole('button', { name: '음성 안내 중지' })).toBeVisible()
  const before = await page.evaluate(() => (window as typeof window & { cancellations: number }).cancellations)
  await page.getByRole('button', { name: '시연 일시 중단' }).click()
  expect(await page.evaluate(() => (window as typeof window & { cancellations: number }).cancellations)).toBeGreaterThan(before)
  await page.getByRole('button', { name: '시연 재개' }).click()
  await expect(page.getByRole('button', { name: '음성 안내 듣기' })).toBeVisible()
  await page.getByRole('navigation', { name: '장면 선택' }).getByRole('button', { name: /결과 조회/ }).click()
  await page.getByRole('button', { name: '음성 안내 듣기' }).click()
  await page.evaluate(() => {
    const runtime = window as typeof window & { spoken: SpeechSynthesisUtterance[] }
    runtime.spoken[0].dispatchEvent(new Event('error'))
  })
  await expect(page.getByRole('button', { name: '음성 안내 중지' })).toBeVisible()
  await expect(page.getByRole('status')).not.toContainText('음성 원고')
})

test('sc05_initial_omits_removed_copy_without_empty_text', async ({ page }) => {
  await page.goto('/?study=emergency&scenario=SC05&scene=initial')
  const screen = page.getByRole('region', { name: '시각 중심 사고 대응' })
  await expect(screen.getByRole('heading', { name: '차량 지원 접수 미확인' })).toBeVisible()
  await expect(screen.getByText('기존 요청의 결과부터 확인해요.')).toHaveCount(0)
  await expect(screen.getByText('접수만으로 안전이 확보되지는 않아요.')).toHaveCount(0)
  await expect(screen.locator('[data-slot="car"] p')).toHaveCount(0)
})
