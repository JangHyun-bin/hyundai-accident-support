# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-record-reliability.spec.ts >> incoming state commits cannot close a voice save before its durable completion
- Location: tests/journey-record-reliability.spec.ts:303:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('textbox', { name: '사고 기록', exact: true })

```

# Page snapshot

```yaml
- region "음성 사고 기록" [ref=f1e3]:
  - generic [ref=f1e5]:
    - generic [ref=f1e6]: 사고 기록
    - heading "이렇게 기록할까요?" [level=1] [ref=f1e7]
  - generic [ref=f1e8]:
    - paragraph [ref=f1e9]: 기억과 다른 내용은 저장 전에 고칠 수 있어요.
    - button "음성 안내 듣기" [ref=f1e11] [cursor=pointer]
    - generic [ref=f1e16]:
      - generic [ref=f1e17]:
        - generic [ref=f1e18]: 사고 기록
        - generic [ref=f1e19]: 8 / 5,000
      - textbox "기억나는 내용을 적어주세요" [ref=f1e20]: 처음 남긴 진술
      - paragraph [ref=f1e21]: 확인하지 못한 내용은 추측하지 않아도 돼요.
    - button "추가로 말하기" [ref=f1e23] [cursor=pointer]
  - button "기록 저장" [disabled] [ref=f1e28]
```

# Test source

```ts
  205 | test('dirty text and in-progress DOM IME survive statement revisions, unrelated saves and hidden risk transitions', async ({ page }) => {
  206 |   await harness(page, 'voice')
  207 |   await statement(page).fill('내 dirty 진술')
  208 |   await statement(page).evaluate((node: HTMLTextAreaElement) => {
  209 |     window.recordInput = node
  210 |     node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '입' }))
  211 |     Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, '조합 중인 입력')
  212 |     node.setSelectionRange(3, 3)
  213 |   })
  214 |   await page.evaluate(async () => {
  215 |     await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '외부에서 바뀐 진술', audioEvidenceIds: [] })
  216 |     await window.recordController.save({ type: 'observation', observation: { id: 'risk', kind: 'risk', label: '위험', value: '확인 필요', source: 'fixture', observedAt: null, confirmation: 'attention', legacyFactId: null, supersedes: null } })
  217 |     await window.recordController.save({ type: 'navigate', stage: 'record' })
  218 |   })
  219 |   await expect(statement(page)).toHaveValue('조합 중인 입력')
  220 |   expect(await statement(page).evaluate((node: HTMLTextAreaElement) => ({ same: node === window.recordInput, start: node.selectionStart }))).toEqual({ same: true, start: 3 })
  221 |   await statement(page).dispatchEvent('compositionend', { data: '입력' })
  222 |   await button(page, '기록 저장').click()
  223 |   await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  224 |   expect(await page.evaluate(() => window.recordController.value?.statements[0].text)).toBe('조합 중인 입력')
  225 | })
  226 | 
  227 | test('pending audio is not replaced by incoming statement revisions', async ({ page }) => {
  228 |   await harness(page, 'voice')
  229 |   await button(page, '추가로 말하기').click()
  230 |   await expect(page.locator('#record-reliability-harness audio')).toHaveCount(1)
  231 |   await page.evaluate(async () => { await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '다른 진술 revision', audioEvidenceIds: [] }) })
  232 |   await expect(statement(page)).toHaveValue('처음 남긴 진술\n\n정차 중 오른쪽에서 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.')
  233 |   await expect(page.locator('#record-reliability-harness audio')).toHaveCount(1)
  234 | })
  235 | 
  236 | test('permission preparation survives incoming statement revisions without adopting over local state', async ({ page }) => {
  237 |   await harness(page, 'voice', 0, 'device')
  238 |   await page.evaluate(() => {
  239 |     const permission = Promise.withResolvers<MediaStream>()
  240 |     navigator.mediaDevices.getUserMedia = () => permission.promise
  241 |     window.recordReleasePermission = () => permission.reject(new DOMException('Denied', 'NotAllowedError'))
  242 |   })
  243 |   await button(page, '추가로 말하기').click()
  244 |   await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'requesting-permission')
  245 |   await page.evaluate(async () => { await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '권한 대기 중 새 진술', audioEvidenceIds: [] }) })
  246 |   await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'requesting-permission')
  247 |   await expect(statement(page)).toHaveValue('처음 남긴 진술')
  248 |   await page.evaluate(() => window.recordReleasePermission())
  249 |   await expect(page.locator('#record-reliability-harness [data-voice-phase]')).not.toHaveAttribute('data-voice-phase', 'requesting-permission')
  250 | })
  251 | 
  252 | test('report limits share the 99 to 100 boundary and preserve edit/delete at the limit', async ({ page }) => {
  253 |   await seed(page, 'review', 99); await button(page, '경위서').click()
  254 |   await button(page, '문장 추가').click(); await page.getByLabel('문장 내용', { exact: true }).fill('100번째 문장')
  255 |   await button(page, '정정 저장').click(); await saved(page)
  256 |   await expect(page.locator('.journey-report-paragraph')).toHaveCount(100)
  257 |   await expect(button(page, '문장 추가')).toBeDisabled()
  258 |   await expect(page.locator('.journey-report')).toContainText('문장 추가 한도에 도달했어요')
  259 |   const last = page.getByRole('article', { name: '문장 100', exact: true })
  260 |   await last.getByRole('button', { name: '정정하기', exact: true }).click()
  261 |   await last.getByLabel('문장 내용', { exact: true }).fill('수정한 100번째 문장')
  262 |   await button(page, '정정 저장').click(); await saved(page)
  263 |   await expect(last).toContainText('수정한 100번째 문장')
  264 |   await last.getByRole('button', { name: '문장 제외', exact: true }).click(); await saved(page)
  265 |   await expect(button(page, '문장 추가')).toBeEnabled()
  266 |   await button(page, '문장 추가').click(); await page.getByLabel('문장 내용', { exact: true }).fill('삭제 후 다시 추가')
  267 |   await button(page, '정정 저장').click(); await saved(page)
  268 |   await page.reload(); await button(page, '경위서').click()
  269 |   await expect(page.locator('.journey-report-paragraph')).toHaveCount(100)
  270 |   await expect(page.locator('.journey-report')).toContainText('삭제 후 다시 추가')
  271 | })
  272 | 
  273 | test('a limit reached during drafting explicitly rejects 101 and keeps the same focused editor', async ({ page }) => {
  274 |   await harness(page, 'report', 99)
  275 |   await button(page, '문장 추가').click(); const input = page.getByLabel('문장 내용', { exact: true })
  276 |   await input.fill('거절되어도 남아야 하는 101번째 문장')
  277 |   await input.evaluate((node: HTMLTextAreaElement) => { window.recordInput = node })
  278 |   await page.evaluate(async () => { await window.recordController.save({ type: 'paragraph-edit', id: 'racing-100', text: '먼저 저장된 100번째 문장', references: [] }) })
  279 |   await button(page, '정정 저장').click()
  280 |   await expect(page.getByText('경위서는 100문장까지 남길 수 있어요. 기존 문장을 수정하거나 제외해주세요.', { exact: true })).toBeVisible()
  281 |   await expect(input).toHaveValue('거절되어도 남아야 하는 101번째 문장')
  282 |   await expect(input).toBeFocused()
  283 |   expect(await input.evaluate(node => node === window.recordInput)).toBe(true)
  284 |   expect(await page.evaluate(() => window.recordController.value?.report?.paragraphs.length)).toBe(100)
  285 |   const rejected = await page.evaluate(() => window.recordController.save({ type: 'paragraph-edit', id: 'rejected-101', text: '추가 거절', references: [] }))
  286 |   expect(rejected).toMatchObject({ ok: false, reason: 'invalid', rejection: 'paragraph-limit' })
  287 | })
  288 | 
  289 | test('quota failure keeps the new report draft mounted and only durable success closes it', async ({ page }) => {
  290 |   await harness(page, 'report', 99)
  291 |   await button(page, '문장 추가').click(); const input = page.getByLabel('문장 내용', { exact: true })
  292 |   await input.fill('quota 뒤에도 보존할 문장'); await input.evaluate((node: HTMLTextAreaElement) => { window.recordInput = node })
  293 |   await blockWrites(page); await button(page, '정정 저장').click()
  294 |   await expect(page.getByText('저장하지 못했어요. 정정 내용은 이 화면에 남아 있어요.', { exact: true })).toBeVisible()
  295 |   await expect(input).toHaveValue('quota 뒤에도 보존할 문장'); await expect(input).toBeFocused()
  296 |   expect(await input.evaluate(node => node === window.recordInput)).toBe(true)
  297 |   await page.evaluate(() => window.recordRestorePut())
  298 |   await button(page, '정정 저장').click()
  299 |   await expect(input).toHaveCount(0)
  300 |   expect(await page.evaluate(() => window.recordController.saveState)).toBe('saved')
  301 | })
  302 | 
  303 | test('incoming state commits cannot close a voice save before its durable completion', async ({ page }) => {
  304 |   await harness(page, 'voice')
> 305 |   await statement(page).fill('저장 중에도 유지할 진술')
      |                         ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  306 |   await page.evaluate(() => {
  307 |     const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
  308 |     Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor, set(handler) {
  309 |       if (this.mode !== 'readwrite') { descriptor.set!.call(this, handler); return }
  310 |       Object.defineProperty(IDBTransaction.prototype, 'oncomplete', descriptor)
  311 |       descriptor.set!.call(this, (event: Event) => {
  312 |         window.recordCommitWaiting = true
  313 |         window.recordReleaseCommit = () => handler.call(this, event)
  314 |       })
  315 |     } })
  316 |   })
  317 |   await button(page, '기록 저장').click()
  318 |   await expect.poll(() => page.evaluate(() => window.recordCommitWaiting)).toBe(true)
  319 |   await page.evaluate(() => {
  320 |     window.recordController.dispatch({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'user-confirmed', source: 'user', confirmedAt: null } })
  321 |   })
  322 |   await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'saving')
  323 |   await expect(statement(page)).toHaveValue('저장 중에도 유지할 진술')
  324 |   await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  325 |   await page.evaluate(() => window.recordReleaseCommit())
  326 |   await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  327 |   expect(await page.evaluate(() => window.recordController.value?.statements[0].text)).toBe('저장 중에도 유지할 진술')
  328 | })
  329 | 
```