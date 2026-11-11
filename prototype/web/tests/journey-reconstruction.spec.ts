import { test, expect, type Page } from '@playwright/test'
import type { Diagram, Evidence } from '../src/journey/case'

const original: Diagram = { revision: 1, origin: 'fixture', road: 'straight', vehicles: [
  { id: 'own', position: { x: .35, y: .65 }, heading: 0 },
  { id: 'other', position: { x: .65, y: .4 }, heading: 340 },
], contact: { x: .48, y: .48 }, confirmedRevision: 1 }

declare global { interface Window { reconstructionResult: Diagram | null; reconstructionRerender: (value: Diagram) => void; reconstructionSetClipActive: (active: boolean) => void; reconstructionDirty: boolean } }

async function mount(page: Page, input: { diagram?: Diagram; original?: Diagram; readOnly?: boolean; clips?: { evidence: Evidence; path?: string; corrupt?: boolean; range?: { start: number; end: number } }[] }) {
  await page.goto('/?study=journey-catalog')
  await page.evaluate(async input => {
    const runtimePath = '/tests/react-runtime.ts'
    const diagramPath = '/src/journey/DiagramEditor.tsx'
    const clipPath = '/src/journey/ClipPlayer.tsx'
    const layoutPath = '/src/journey/JourneyLayout.tsx'
    const { React, createRoot } = await import(/* @vite-ignore */ runtimePath) as typeof import('./react-runtime')
    const { DiagramEditor } = await import(/* @vite-ignore */ diagramPath) as typeof import('../src/journey/DiagramEditor')
    const { ClipPlayer } = await import(/* @vite-ignore */ clipPath) as typeof import('../src/journey/ClipPlayer')
    const { JourneyLayout } = await import(/* @vite-ignore */ layoutPath) as typeof import('../src/journey/JourneyLayout')
    const children: import('react').ReactNode[] = []
    window.reconstructionResult = null
    window.reconstructionDirty = false
    if (input.diagram) children.push(React.createElement(DiagramEditor, { key: 'diagram', value: input.diagram, original: input.original, readOnly: input.readOnly,
      onChange: value => { window.reconstructionResult = value }, onDirtyChange: dirty => { window.reconstructionDirty = dirty } }))
    for (const clip of input.clips ?? []) {
      const blob = clip.corrupt ? new Blob(['not a video'], { type: 'video/mp4' }) : clip.path ? await (await fetch(clip.path)).blob() : null
      children.push(React.createElement(ClipPlayer, { key: clip.evidence.id, evidence: clip.evidence, blob, range: clip.range }))
    }
    document.getElementById('root')!.hidden = true
    const target = document.createElement('div')
    document.body.append(target)
    const root = createRoot(target)
    const render = () => root.render(React.createElement(JourneyLayout, { device: 'mobile', summary: React.createElement('p', {}, '사고 내용 확인'), children: [...children] }))
    window.reconstructionRerender = value => {
      children[0] = React.createElement(DiagramEditor, { key: 'diagram', value, original: input.original, onChange: next => { window.reconstructionResult = next }, onDirtyChange: dirty => { window.reconstructionDirty = dirty } })
      render()
    }
    window.reconstructionSetClipActive = active => {
      const index = input.diagram ? 1 : 0
      children[index] = React.cloneElement(children[index] as import('react').ReactElement<import('react').ComponentProps<typeof ClipPlayer>>, { active })
      render()
    }
    render()
  }, input)
}

function video(id: string, availability: Evidence['availability'] = 'available'): Evidence {
  return { id, label: id === 'front' ? '전방 영상' : '후방 영상', kind: 'video', revision: 1, origin: 'sample',
    assetId: availability === 'available' ? id + '-asset' : null, availability, captureTarget: null,
    metadata: { mime: 'video/mp4', bytes: availability === 'available' ? 100 : 0, duration: 20,
      capturedAt: '2026-11-10T09:12:00.000Z', sourceLabel: '차량 영상' } }
}

test('diagram movement is editable without saving and undo restores the exact original', async ({ page }) => {
  await mount(page, { diagram: original })
  await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  expect(await page.evaluate(() => window.reconstructionDirty)).toBe(true)
  expect(await page.evaluate(() => window.reconstructionResult)).toBeNull()
  await page.getByRole('button', { name: '되돌리기', exact: true }).click()
  await expect(page.getByRole('button', { name: '도식 정정 저장', exact: true })).toBeDisabled()
  expect(await page.evaluate(() => window.reconstructionDirty)).toBe(false)
  await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  const result = await page.evaluate(() => window.reconstructionResult)
  expect(result?.vehicles[0].position).toEqual({ x: .4, y: .65 })
  expect(result?.confirmedRevision).toBeNull()
  expect(result?.origin).toBe('user')
  expect(result?.revision).toBe(2)
})

test('pointer drag and keyboard controls produce the same normalized position', async ({ page }) => {
  await mount(page, { diagram: original })
  const car = page.getByRole('button', { name: '내 차량 위치', exact: true })
  await car.focus()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  const keyboard = await page.evaluate(() => window.reconstructionResult?.vehicles[0].position)
  await page.getByRole('button', { name: '되돌리기', exact: true }).click()
  const canvas = page.getByTestId('diagram-canvas')
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * .35, box.y + box.height * .65)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .65)
  await page.mouse.up()
  await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  const pointer = await page.evaluate(() => window.reconstructionResult?.vehicles[0].position)
  expect(pointer).toEqual(keyboard)
})

test('positions stay in bounds, direction and contact can change, and original remains available', async ({ page }) => {
  await mount(page, { diagram: original })
  const car = page.getByRole('button', { name: '내 차량 위치', exact: true })
  await car.focus()
  for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowLeft')
  await page.getByRole('button', { name: '시계 방향으로 회전', exact: true }).click()
  await page.getByRole('button', { name: '접촉 위치', exact: true }).click()
  await page.getByRole('button', { name: '아래로 이동', exact: true }).click()
  await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  const result = await page.evaluate(() => window.reconstructionResult)
  expect(result?.vehicles[0].position.x).toBe(0)
  expect(result?.vehicles[0].heading).toBe(15)
  expect(result?.contact).toEqual({ x: .48, y: .53 })
  await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  await expect(page.getByText('처음 제안된 도식', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '오른쪽으로 이동', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '정정본 보기', exact: true }).click()
  await expect(page.getByRole('button', { name: '오른쪽으로 이동', exact: true })).toBeEnabled()
})

test('unsupported roads expose no fabricated diagram or editing controls', async ({ page }) => {
  await mount(page, { diagram: { ...original, road: 'unsupported' } })
  await expect(page.getByText('이 도로는 도식으로 표현하기 어려워요', { exact: true })).toBeVisible()
  await expect(page.getByTestId('diagram-canvas')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '도식 정정 저장', exact: true })).toHaveCount(0)
})

test('a missing rear clip leaves the front clip playable and shows actual duration', async ({ page }) => {
  await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4' }, { evidence: video('rear', 'unavailable') }] })
  await expect(page.getByText('제공된 영상이 없어요', { exact: true })).toBeVisible()
  await expect(page.getByText('충돌 시점 미확인', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  await expect(page.getByText('00:20', { exact: true })).toBeVisible()
})

test('unrelated case updates preserve a draft and restored history supplies the original', async ({ page }) => {
  const corrected = structuredClone(original)
  corrected.revision = 2; corrected.origin = 'user'; corrected.vehicles[0].position.x = .45
  await mount(page, { diagram: corrected, original })
  await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  await page.evaluate(value => window.reconstructionRerender(value), structuredClone(corrected))
  await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  expect(await page.evaluate(() => window.reconstructionResult?.vehicles[0].position.x)).toBe(.5)
  await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(350 650)')
})

test('decode failure in one clip leaves the other usable', async ({ page }) => {
  await mount(page, { clips: [{ evidence: video('front'), corrupt: true }, { evidence: video('rear'), path: '/journey-samples/rear-20s.mp4' }] })
  await expect(page.getByText('영상을 재생할 수 없어요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '후방 영상 재생', exact: true }).click()
  await expect.poll(() => page.locator('video').last().evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
})

test('invalid evidence range is rejected without seeking another clip', async ({ page }) => {
  await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4', range: { start: 90, end: 110 } }] })
  await expect(page.getByText('이 영상에서 해당 구간을 열 수 없어요', { exact: true })).toBeVisible()
  await expect(page.locator('video')).toHaveJSProperty('currentTime', 0)
  await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
})

test('only supplied event times become markers and evidence playback stops at the selected end', async ({ page }) => {
  const evidence = video('front')
  evidence.metadata.eventTime = 11
  await mount(page, { clips: [{ evidence, path: '/journey-samples/front-20s.mp4', range: { start: 10, end: 11 } }] })
  await expect(page.getByLabel('충돌 시점 00:11', { exact: true })).toBeVisible()
  await page.getByText('근거 구간 확인', { exact: true }).click()
  await page.getByRole('button', { name: '선택 구간 재생', exact: true }).click()
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBe(11)
  await expect(page.locator('video')).toHaveJSProperty('paused', true)
})

test('leaving the clip view pauses playback without discarding the current position', async ({ page }) => {
  await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4' }] })
  await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(.2)
  await page.evaluate(() => window.reconstructionSetClipActive(false))
  await expect(page.locator('video')).toHaveJSProperty('paused', true)
  const position = await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)
  await page.evaluate(() => window.reconstructionSetClipActive(true))
  await expect(page.locator('video')).toHaveJSProperty('paused', true)
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeCloseTo(position, 2)
})

test('small mobile and enlarged text preserve all reconstruction controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mount(page, { diagram: original })
  await expect(page.getByRole('button', { name: '도식 정정 저장', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: '반시계 방향으로 회전', exact: true })).toBeVisible()
})

test('representative mobile diagram and clip remain visually reviewable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await mount(page, { diagram: original, clips: [{ evidence: { ...video('front'), metadata: { ...video('front').metadata, eventTime: 11 } }, path: '/journey-samples/front-20s.mp4' }] })
  await expect(page.getByRole('button', { name: '전방 영상 재생', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('mobile-reconstruction.png'), fullPage: true })
})

test('journey integration restores clips and edited diagrams after reload without losing urgent drafts', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await page.goto('/?study=journey&fixture=partial-evidence&device=mobile')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true }).click()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  await page.getByRole('button', { name: '사고 도식', exact: true }).click()
  await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  const edited = await page.getByRole('button', { name: '내 차량 위치', exact: true }).getAttribute('transform')
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  await page.getByRole('button', { name: '내용 확인으로 돌아가기', exact: true }).click()
  await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', edited!)
  await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '사고 도식', exact: true }).click()
  await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', edited!)
  await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).not.toHaveAttribute('transform', edited!)
})


test('approved diagram preview shows exact positions without editing actions', async ({ page }) => {
  await mount(page, { diagram: original, readOnly: true })
  const preview = page.getByRole('region', { name: '보낼 사고 도식', exact: true })
  await expect(preview.getByRole('img', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(350 650)')
  await expect(preview.getByRole('button')).toHaveCount(0)
  await expect(preview.getByText('사용자 정정', { exact: true })).toHaveCount(0)
})
