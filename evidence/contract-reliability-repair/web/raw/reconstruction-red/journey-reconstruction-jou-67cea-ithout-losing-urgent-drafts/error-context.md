# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-reconstruction.spec.ts >> journey integration restores clips and edited diagrams after reload without losing urgent drafts
- Location: tests/journey-reconstruction.spec.ts:197:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: '전방 영상 재생', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: '전방 영상 재생', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: '전방 영상 재생', exact: true })

```

```yaml
- banner:
  - paragraph: AFTER / CARE
  - heading "사고 대응 · 전체 여정" [level=1]
  - text: 가상 자료와 명시적 결과로 검토 · 실제 전화·전송·기기 간 동기화 없음
  - link "Design system":
    - /url: /?study=design-system
- region "시연 설정":
  - text: 시연 상황
  - combobox "시연 상황":
    - option "사고 대응부터 후속 처리까지"
    - option "응답 없음과 늦은 응답"
    - option "차량 이동 불가"
    - option "자료 없이 이어가기"
    - option "일부 자료만 확보" [selected]
    - option "보험사 전송 거절 유지"
    - option "중단 중 접수 결과 도착"
    - option "과거 요청의 늦은 결과"
  - button "새 시연 시작"
  - button "차량 보기"
  - text: 음성 입력
  - combobox "음성 입력":
    - option "이 기기 microphone" [selected]
    - option "준비된 음성 sample"
- button "긴급 대응 보기"
- button "후속 처리 보기"
- button "차량 상태 보기"
- region "외부 결과 시연":
  - text: 외부 결과 시연 정비소 정보
  - combobox "정비소 정보":
    - option "안내 있음" [selected]
    - option "오래된 안내"
    - option "제공된 목록 없음"
    - option "조회 실패"
  - 'button "시연 event: 차량 감지 자료"': 차량 감지 자료
  - 'button "시연 event: 사고 자료 확보"': 사고 자료 확보
  - 'button "시연 event: 경위서 초안"': 경위서 초안
  - 'button "시연 event: 비상등 작동 확인"': 비상등 작동 확인
  - 'button "시연 event: 안내 지점 자료"': 안내 지점 자료
  - 'button "시연 event: 위험 정보"': 위험 정보
  - 'button "시연 event: 통화 연결 확인"': 통화 연결 확인
  - 'button "시연 event: 구호 접수 확인"': 구호 접수 확인
- heading "충돌 감지" [level=2]
- term: 운전자 조작
- definition: 미확인
- term: 차량 이동
- definition: 가능
- term: 이동 경로
- definition: 미확인
- region "작업 내용":
  - text: 사고 내용 확인
  - heading "남겨진 자료를 살펴보세요" [level=1]
  - paragraph: 확인할 수 없는 내용은 그대로 남겨도 돼요.
  - button "음성 안내 듣기"
  - navigation "확인할 자료":
    - button "사고 영상" [pressed]
    - button "사고 도식"
    - button "경위서"
  - region "전방 영상":
    - heading "전방 영상" [level=3]
    - text: 확보 못함
    - paragraph: 영상 파일을 열 수 없어요
    - text: 합성 전방 영상 11. 10. 오후 06:12
  - region "후방 영상":
    - heading "후방 영상" [level=3]
    - text: 확보 못함
    - paragraph: 제공된 영상이 없어요
    - text: 합성 후방 영상 11. 10. 오후 06:12
  - term: 구호
  - definition:
    - strong: 통화 연결 · 접수 미확인
  - term: 차량 지원
  - definition:
    - strong: 요청 전
  - term: 보험사
  - definition:
    - strong: 요청 전
  - button "보낼 내용 확인"
- button "기록으로 돌아가기"
- status: 이 기기에 보관됨
```

# Test source

```ts
  141 | 
  142 | test('decode failure in one clip leaves the other usable', async ({ page }) => {
  143 |   await mount(page, { clips: [{ evidence: video('front'), corrupt: true }, { evidence: video('rear'), path: '/journey-samples/rear-20s.mp4' }] })
  144 |   await expect(page.getByText('영상을 재생할 수 없어요', { exact: true })).toBeVisible()
  145 |   await page.getByRole('button', { name: '후방 영상 재생', exact: true }).click()
  146 |   await expect.poll(() => page.locator('video').last().evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  147 | })
  148 | 
  149 | test('invalid evidence range is rejected without seeking another clip', async ({ page }) => {
  150 |   await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4', range: { start: 90, end: 110 } }] })
  151 |   await expect(page.getByText('이 영상에서 해당 구간을 열 수 없어요', { exact: true })).toBeVisible()
  152 |   await expect(page.locator('video')).toHaveJSProperty('currentTime', 0)
  153 |   await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  154 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  155 | })
  156 | 
  157 | test('only supplied event times become markers and evidence playback stops at the selected end', async ({ page }) => {
  158 |   const evidence = video('front')
  159 |   evidence.metadata.eventTime = 11
  160 |   await mount(page, { clips: [{ evidence, path: '/journey-samples/front-20s.mp4', range: { start: 10, end: 11 } }] })
  161 |   await expect(page.getByLabel('충돌 시점 00:11', { exact: true })).toBeVisible()
  162 |   await page.getByText('근거 구간 확인', { exact: true }).click()
  163 |   await page.getByRole('button', { name: '선택 구간 재생', exact: true }).click()
  164 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBe(11)
  165 |   await expect(page.locator('video')).toHaveJSProperty('paused', true)
  166 | })
  167 | 
  168 | test('leaving the clip view pauses playback without discarding the current position', async ({ page }) => {
  169 |   await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4' }] })
  170 |   await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  171 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(.2)
  172 |   await page.evaluate(() => window.reconstructionSetClipActive(false))
  173 |   await expect(page.locator('video')).toHaveJSProperty('paused', true)
  174 |   const position = await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)
  175 |   await page.evaluate(() => window.reconstructionSetClipActive(true))
  176 |   await expect(page.locator('video')).toHaveJSProperty('paused', true)
  177 |   expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeCloseTo(position, 2)
  178 | })
  179 | 
  180 | test('small mobile and enlarged text preserve all reconstruction controls', async ({ page }) => {
  181 |   await page.setViewportSize({ width: 360, height: 800 })
  182 |   await mount(page, { diagram: original })
  183 |   await expect(page.getByRole('button', { name: '도식 정정 저장', exact: true })).toBeVisible()
  184 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  185 |   await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  186 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  187 |   await expect(page.getByRole('button', { name: '반시계 방향으로 회전', exact: true })).toBeVisible()
  188 | })
  189 | 
  190 | test('representative mobile diagram and clip remain visually reviewable', async ({ page }, testInfo) => {
  191 |   await page.setViewportSize({ width: 393, height: 852 })
  192 |   await mount(page, { diagram: original, clips: [{ evidence: { ...video('front'), metadata: { ...video('front').metadata, eventTime: 11 } }, path: '/journey-samples/front-20s.mp4' }] })
  193 |   await expect(page.getByRole('button', { name: '전방 영상 재생', exact: true })).toBeEnabled()
  194 |   await page.screenshot({ path: testInfo.outputPath('mobile-reconstruction.png'), fullPage: true })
  195 | })
  196 | 
  197 | test('journey integration restores clips and edited diagrams after reload without losing urgent drafts', async ({ page }, testInfo) => {
  198 |   await page.setViewportSize({ width: 393, height: 852 })
  199 |   await page.goto('/?study=journey&fixture=partial-evidence&device=mobile')
  200 |   await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  201 |   await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  202 |   await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  203 |   await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
  204 |   await page.evaluate(() => {
  205 |     window.reconstructionAssetReads = []
  206 |     const get = IDBObjectStore.prototype.get
  207 |     IDBObjectStore.prototype.get = function (query) {
  208 |       const request = get.call(this, query)
  209 |       if (this.name === 'assets') request.addEventListener('success', () => {
  210 |         window.reconstructionAssetReads.push({ id: String(query), bytes: request.result?.blob?.size ?? null })
  211 |       })
  212 |       return request
  213 |     }
  214 |     const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
  215 |     const setComplete = descriptor.set!
  216 |     Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor,
  217 |       set(this: IDBTransaction, handler: IDBTransaction['oncomplete']) {
  218 |         if (!handler || this.mode !== 'readwrite' || !this.objectStoreNames.contains('cases')) {
  219 |           setComplete.call(this, handler); return
  220 |         }
  221 |         Object.defineProperty(IDBTransaction.prototype, 'oncomplete', descriptor)
  222 |         // Hold delivery of a real completed metadata commit, not its native event or media bytes.
  223 |         setComplete.call(this, (event: Event) => { window.releaseHeldCaseCommit = () => handler.call(this, event) })
  224 |       },
  225 |     })
  226 |   })
  227 |   await page.getByRole('button', { name: '시연 event: 차량 감지 자료', exact: true }).click()
  228 |   await expect.poll(() => page.evaluate(() => !!window.releaseHeldCaseCommit)).toBe(true)
  229 |   await page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true }).click()
  230 |   await expect.poll(() => page.evaluate(() => window.reconstructionAssetReads.some(read => read.bytes === null))).toBe(true)
  231 |   const before = await page.evaluate(async () => {
  232 |     // Resolve browser-owned IndexedDB through Vite, not the Node runner realm.
  233 |     const path = '/src/journey/case-store.ts'
  234 |     const { loadCase } = await import(/* @vite-ignore */ path) as typeof CaseStore
  235 |     return { stored: await loadCase(new URL(location.href).searchParams.get('case')!), reads: [...window.reconstructionAssetReads] }
  236 |   })
  237 |   expect(before.stored?.evidence).toEqual([])
  238 |   await page.evaluate(() => { window.releaseHeldCaseCommit!(); delete window.releaseHeldCaseCommit })
  239 |   try {
  240 |     const play = page.getByRole('button', { name: '전방 영상 재생', exact: true })
> 241 |     await expect(play).toBeVisible()
      |                        ^ Error: expect(locator).toBeVisible() failed
  242 |     await play.click()
  243 |     await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  244 |   } finally {
  245 |     const after = await page.evaluate(async () => {
  246 |       const path = '/src/journey/case-store.ts'
  247 |       const { loadCase } = await import(/* @vite-ignore */ path) as typeof CaseStore
  248 |       return { stored: await loadCase(new URL(location.href).searchParams.get('case')!), reads: window.reconstructionAssetReads }
  249 |     })
  250 |     const path = testInfo.outputPath('asset-read-commit-boundary.json')
  251 |     await writeFile(path, JSON.stringify({ before, after }, null, 2))
  252 |     await testInfo.attach('asset-read-commit-boundary', { path, contentType: 'application/json' })
  253 |   }
  254 |   await page.getByRole('button', { name: '사고 도식', exact: true }).click()
  255 |   await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  256 |   const edited = await page.getByRole('button', { name: '내 차량 위치', exact: true }).getAttribute('transform')
  257 |   await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  258 |   await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  259 |   await page.getByRole('button', { name: '내용 확인으로 돌아가기', exact: true }).click()
  260 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', edited!)
  261 |   await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  262 |   await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  263 |   await page.reload()
  264 |   await page.getByRole('button', { name: '사고 도식', exact: true }).click()
  265 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', edited!)
  266 |   await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  267 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).not.toHaveAttribute('transform', edited!)
  268 | })
  269 | 
  270 | 
  271 | test('approved diagram preview shows exact positions without editing actions', async ({ page }) => {
  272 |   await mount(page, { diagram: original, readOnly: true })
  273 |   const preview = page.getByRole('region', { name: '보낼 사고 도식', exact: true })
  274 |   await expect(preview.getByRole('img', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(350 650)')
  275 |   await expect(preview.getByRole('button')).toHaveCount(0)
  276 |   await expect(preview.getByText('사용자 정정', { exact: true })).toHaveCount(0)
  277 | })
  278 | 
```