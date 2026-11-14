import { test, expect, type Page } from '@playwright/test'

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } })

async function photo(page: Page, mime = 'image/png', color = '#a4a8ae') {
  const data = await page.evaluate(({ mime, color }) => {
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 100
    const context = canvas.getContext('2d')!
    context.fillStyle = color; context.fillRect(0, 0, 160, 100)
    context.fillStyle = '#313236'; context.fillRect(30, 25, 100, 50)
    return canvas.toDataURL(mime).split(',')[1]
  }, { mime, color })
  return { name: 'authored-photo.' + mime.split('/')[1], mimeType: mime, buffer: Buffer.from(data, 'base64') }
}

async function begin(page: Page) {
  await page.goto('/?study=journey&device=mobile&fixture=partial-evidence')
  await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '사진 남기기', exact: true })).toBeVisible()
}

test('photo validation rejects oversized, unsupported and undecodable files', async ({ page }) => {
  await page.goto('/?study=journey-catalog')
  const errors = await page.evaluate(async () => {
    const path = '/src/journey/capture.ts'
    const { validatePhoto } = await import(/* @vite-ignore */ path) as typeof import('../src/journey/capture')
    const files = [new Blob([new Uint8Array(15 * 1024 * 1024 + 1)], { type: 'image/png' }),
      new Blob(['heic'], { type: 'image/heic' }), new Blob(['not an image'], { type: 'image/png' })]
    return Promise.all(files.map(file => validatePhoto(file).then(() => '', error => String(error.message))))
  })
  expect(errors[0]).toContain('15 MiB')
  expect(errors[1]).toContain('JPEG, PNG, WebP')
  expect(errors[2]).toContain('사진을 열 수 없어요')
})

for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
  test(`${mime} is reviewed before storage and survives reload`, async ({ page }) => {
    await begin(page)
    await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
    await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(await photo(page, mime))
    await expect(page.getByRole('img', { name: '저장 전 현장 전체 사진', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '이 사진 사용', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: '이 사진 사용', exact: true }).click()
    await expect(page.getByText('사진을 저장했어요.', { exact: true })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: '사진 남기기', exact: true }).click()
    await expect(page.locator('[data-photo-count]')).toContainText('1 / 6')
    await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
    await expect(page.getByRole('img', { name: '현장 전체 사진 1', exact: true })).toBeVisible()
  })
}

test('camera permission is requested by an action and denial leaves file selection and skipping', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => {
      document.documentElement.dataset.cameraCalls = String(Number(document.documentElement.dataset.cameraCalls ?? 0) + 1)
      return Promise.reject(new DOMException('Denied', 'NotAllowedError'))
    } })
  })
  await begin(page)
  await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
  expect(await page.locator('html').getAttribute('data-camera-calls')).toBeNull()
  await page.getByRole('button', { name: '촬영하기', exact: true }).click()
  await expect(page.getByText('카메라를 사용할 수 없어요. 저장된 사진을 선택할 수 있어요.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '사진 선택', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '지금 촬영하기 어려워요', exact: true }).click()
  await expect(page.locator('[data-photo-target="scene"]')).toContainText('생략')
  await expect(page.locator('[data-photo-count]')).toContainText('0 / 6')
  await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'review')
})

test('a failed replacement preserves the stored photo and the retry preview', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(await photo(page))
  await page.getByRole('button', { name: '이 사진 사용', exact: true }).click()
  await expect(page.getByText('사진을 저장했어요.', { exact: true })).toBeVisible()
  const previous = await page.getByRole('img', { name: '현장 전체 사진 1', exact: true }).getAttribute('src')
  await page.getByRole('button', { name: '현장 전체 사진 1 교체', exact: true }).click()
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(await photo(page, 'image/png', '#ededf2'))
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
      const transaction = original.apply(this, args)
      if (args[1] === 'readwrite' && document.documentElement.dataset.failPhotoSave === 'true') transaction.abort()
      return transaction
    }
    document.documentElement.dataset.failPhotoSave = 'true'
  })
  await page.getByRole('button', { name: '이 사진 사용', exact: true }).click()
  await expect(page.getByText('사진을 저장하지 못했어요. 이전 사진과 새 사진은 그대로 남아 있어요.', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '저장 전 현장 전체 사진', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '현장 전체 사진 1', exact: true })).toHaveAttribute('src', previous!)
  await page.evaluate(() => { document.documentElement.dataset.failPhotoSave = 'false' })
  await page.locator('.journey-evidence').getByRole('button', { name: '저장 다시 시도', exact: true }).click()
  await expect(page.getByText('사진을 저장했어요.', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '현장 전체 사진 1', exact: true })).not.toHaveAttribute('src', previous!)
})

test('photo limit counts files while progress counts unique capture targets', async ({ page }) => {
  await begin(page)
  const file = await photo(page)
  await page.evaluate(async ({ base64, mime }) => {
    const base = '/src/journey/'
    const store = await import(base + 'case-store.ts') as typeof import('../src/journey/case-store')
    const value = (await store.loadCase(new URL(location.href).searchParams.get('case')!))!
    const blob = await (await fetch(`data:${mime};base64,${base64}`)).blob()
    value.evidence = Array.from({ length: 12 }, (_, index) => ({ id: 'seed-' + index, label: '현장 전체', kind: 'photo', revision: 1, origin: 'user',
      assetId: 'seed-asset', availability: 'available', captureTarget: 'scene', metadata: { mime, bytes: blob.size, duration: null, capturedAt: null, sourceLabel: '직접 선택' } }))
    const result = await store.commitCase(value, value.revision, [{ id: 'seed-asset', caseId: value.id, blob }])
    if (!result.ok) throw new Error(result.reason)
  }, { base64: file.buffer.toString('base64'), mime: file.mimeType })
  await page.reload()
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click()
  await expect(page.locator('[data-photo-count]')).toContainText('1 / 6')
  await page.getByRole('button', { name: '내 차량 사진', exact: true }).click()
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(file)
  await expect(page.getByText('사진은 최대 12장까지 남길 수 있어요. 기존 사진을 교체하거나 삭제해주세요.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '이 사진 사용', exact: true })).toHaveCount(0)
})

test('an urgent event preserves a selected photo while decode is pending', async ({ page }) => {
  await begin(page)
  const file = await photo(page)
  await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
  await page.evaluate(() => {
    const original = window.createImageBitmap.bind(window)
    window.createImageBitmap = new Proxy(original, { async apply(target, receiver, args) {
      await new Promise(resolve => setTimeout(resolve, 600))
      return Reflect.apply(target, receiver, args)
    } })
  })
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(file)
  await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response', { timeout: 400 })
  await page.getByRole('button', { name: '기록으로 돌아가기', exact: true }).click()
  await expect(page.getByRole('img', { name: '저장 전 현장 전체 사진', exact: true })).toBeVisible()
})

test('photo actions remain reachable at 360px and 200% text without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await begin(page)
  await page.addStyleTag({ content: 'html { font-size: 200% }' })
  await page.getByRole('button', { name: '신호등 사진', exact: true }).click()
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(await photo(page))
  const action = page.getByRole('button', { name: '이 사진 사용', exact: true })
  await action.scrollIntoViewIfNeeded()
  await expect(action).toBeVisible()
  expect(await action.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('normal device switching keeps an unsaved preview until the user saves or discards it', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(await photo(page))
  await expect(page.getByRole('img', { name: '저장 전 현장 전체 사진', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '차량 보기', exact: true }).click()
  await expect(page.getByText('새 사진을 저장하거나 버린 뒤 이동해주세요.', { exact: true })).toBeVisible()
  await expect(page.locator('[data-journey-device="mobile"]').filter({ visible: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '이 사진 사용', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '새 사진 버리기', exact: true }).click()
  await page.getByRole('button', { name: '차량 보기', exact: true }).click()
  await expect(page.locator('[data-journey-device="vehicle"]').filter({ visible: true })).toBeVisible()
})

test('deleting a photo updates the target count after storage and remains deleted on reload', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
  await page.getByLabel('사진 파일 선택', { exact: true }).setInputFiles(await photo(page))
  await page.getByRole('button', { name: '이 사진 사용', exact: true }).click()
  await expect(page.getByText('사진을 저장했어요.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '현장 전체 사진 1 삭제', exact: true }).click()
  await expect(page.getByText('사진을 삭제했어요.', { exact: true })).toBeVisible()
  await expect(page.locator('[data-photo-count]')).toContainText('0 / 6')
  await page.reload()
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click()
  await expect(page.locator('[data-photo-target="scene"]')).toContainText('사진 없음')
})

test.describe('camera frame capture', () => {
  test('cancelling permission releases a stream that arrives after cancellation', async ({ page }) => {
    await begin(page)
    await page.evaluate(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async constraints => {
        const stream = await original(constraints)
        await new Promise(resolve => setTimeout(resolve, 500))
        return stream
      }
      const stop = MediaStreamTrack.prototype.stop
      MediaStreamTrack.prototype.stop = function () {
        document.documentElement.dataset.stoppedTracks = String(Number(document.documentElement.dataset.stoppedTracks ?? 0) + 1)
        stop.call(this)
      }
    })
    await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
    await page.getByRole('button', { name: '촬영하기', exact: true }).click()
    await page.getByRole('button', { name: '촬영 취소', exact: true }).click()
    await expect.poll(async () => Number(await page.locator('html').getAttribute('data-stopped-tracks'))).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: '촬영하기', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '사진 찍기', exact: true })).toHaveCount(0)
  })

  test('capture helper uses the supplied stream without requesting another camera', async ({ page }) => {
    await page.goto('/?study=journey-catalog')
    const result = await page.evaluate(async () => {
      const path = '/src/journey/capture.ts'
      const { capturePhoto } = await import(/* @vite-ignore */ path) as typeof import('../src/journey/capture')
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const original = navigator.mediaDevices.getUserMedia
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Unexpected permission request'))
      try {
        const blob = await capturePhoto(stream)
        return { type: blob.type, size: blob.size, trackLive: stream.getVideoTracks()[0].readyState }
      } finally { stream.getTracks().forEach(track => track.stop()); navigator.mediaDevices.getUserMedia = original }
    })
    expect(result.type).toBe('image/jpeg')
    expect(result.size).toBeGreaterThan(100)
    expect(result.trackLive).toBe('live')
  })

  test('captures a real stream frame and releases camera tracks when leaving capture', async ({ page }) => {
    await begin(page)
    await page.evaluate(() => {
      const original = MediaStreamTrack.prototype.stop
      MediaStreamTrack.prototype.stop = function () {
        document.documentElement.dataset.stoppedTracks = String(Number(document.documentElement.dataset.stoppedTracks ?? 0) + 1)
        original.call(this)
      }
    })
    await page.getByRole('button', { name: '현장 전체 사진', exact: true }).click()
    await page.getByRole('button', { name: '촬영하기', exact: true }).click()
    await expect(page.getByRole('button', { name: '사진 찍기', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: '사진 찍기', exact: true }).click()
    await expect(page.getByRole('img', { name: '저장 전 현장 전체 사진', exact: true })).toBeVisible()
    expect(Number(await page.locator('html').getAttribute('data-stopped-tracks'))).toBeGreaterThan(0)
    await page.getByRole('button', { name: '이 사진 사용', exact: true }).click()
    await expect(page.getByText('사진을 저장했어요.', { exact: true })).toBeVisible()
  })
})
