# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-record-reliability.spec.ts >> clean statement identity changes synchronize without remounting and unrelated commits preserve caret
- Location: tests/journey-record-reliability.spec.ts:189:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.focus: Test timeout of 30000ms exceeded.
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
  91  |   }, { id, kind, mode })
  92  |   await expect.poll(() => page.evaluate(() => window.recordController?.value?.id)).toBe(id)
  93  |   return id
  94  | }
  95  | 
  96  | for (const existing of [false, true]) test(`first durable retry publishes the current case with existing=${existing}`, async ({ page }) => {
  97  |   const previous = existing ? await seed(page) : null
  98  |   if (!existing) await page.goto('/?study=journey&fixture=partial-evidence&device=mobile&keep=retained')
  99  |   else await page.evaluate(() => { const url = new URL(location.href); url.searchParams.set('keep', 'retained'); history.replaceState(null, '', url) })
  100 |   await page.getByLabel('시연 상황', { exact: true }).selectOption('partial-evidence')
  101 |   await blockWrites(page)
  102 |   await button(page, existing ? '새 시연 시작' : '이 상황으로 시작').click()
  103 |   await expect(page.locator('.journey-save-status')).toContainText('이 기기에 저장하지 못했어요')
  104 |   const current = await page.locator('[data-case-id]').getAttribute('data-case-id')
  105 |   expect(current).not.toBe(previous)
  106 |   expect(new URL(page.url()).searchParams.get('case')).toBe(previous)
  107 |   await page.evaluate(() => window.recordRestorePut())
  108 |   await button(page, '저장 다시 시도').click(); await saved(page)
  109 |   await expect.poll(() => new URL(page.url()).searchParams.get('case')).toBe(current)
  110 |   expect(new URL(page.url()).searchParams.get('keep')).toBe('retained')
  111 |   expect(new URL(page.url()).searchParams.get('device')).toBe('mobile')
  112 |   await button(page, '사고 기록 남기기').click()
  113 |   if (await button(page, '직접 입력').isVisible()) await button(page, '직접 입력').click()
  114 |   await statement(page).fill('재시도 뒤 실제로 남긴 내용')
  115 |   await button(page, '기록 저장').click(); await saved(page)
  116 |   await page.reload()
  117 |   await expect(statement(page)).toHaveValue('재시도 뒤 실제로 남긴 내용')
  118 |   expect(new URL(page.url()).searchParams.get('case')).toBe(current)
  119 | })
  120 | 
  121 | test('a late commit cannot adopt into a newer open case', async ({ page }) => {
  122 |   const first = await harness(page, 'voice')
  123 |   const second = await page.evaluate(async () => {
  124 |     const storePath = '/src/journey/case-store.ts'
  125 |     // Import the real browser persistence module to hold its completion callback, not its transaction.
  126 |     const { commitCase } = await import(/* @vite-ignore */ storePath) as typeof CaseStore
  127 |     const value = structuredClone(window.recordController.value!)
  128 |     value.id = crypto.randomUUID(); value.revision = 0
  129 |     value.statements[0].text = '새로 연 기록'
  130 |     const saved = await commitCase(value, null)
  131 |     if (!saved.ok) throw new Error(saved.reason)
  132 |     const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
  133 |     let delayed = false
  134 |     Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor, set(handler) {
  135 |       if (!delayed && this.mode === 'readwrite') {
  136 |         delayed = true
  137 |         descriptor.set!.call(this, (event: Event) => {
  138 |           window.recordCommitWaiting = true
  139 |           window.recordReleaseCommit = () => handler.call(this, event)
  140 |         })
  141 |       } else descriptor.set!.call(this, handler)
  142 |     } })
  143 |     void window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '늦은 이전 기록', audioEvidenceIds: [] })
  144 |     return value.id
  145 |   })
  146 |   await expect.poll(() => page.evaluate(() => window.recordCommitWaiting)).toBe(true)
  147 |   await page.evaluate(id => window.recordSetId(id), second)
  148 |   await expect.poll(() => page.evaluate(() => window.recordController.value?.id)).toBe(second)
  149 |   await page.evaluate(() => window.recordReleaseCommit())
  150 |   await expect(statement(page)).toHaveValue('새로 연 기록')
  151 |   expect(await page.evaluate(() => window.recordController.value?.id)).not.toBe(first)
  152 |   expect(await page.evaluate(() => window.recordController.saveState)).toBe('saved')
  153 | })
  154 | 
  155 | test('two tabs reload the latest statement and review while preserving old text and audio bytes in recovery', async ({ page, context }) => {
  156 |   await seed(page)
  157 |   const other = await context.newPage(); await other.goto(page.url()); await saved(other)
  158 |   await statement(page).fill('다른 탭에서 확정한 최신 진술')
  159 |   await button(page, '기록 저장').click(); await saved(page)
  160 |   await other.getByLabel('음성 입력', { exact: true }).selectOption('sample')
  161 |   await button(other, '추가로 말하기').click()
  162 |   await expect(other.locator('.journey-voice audio')).toHaveCount(1)
  163 |   await statement(other).fill('내 화면의 오래된 진술과 pending 음성')
  164 |   await button(other, '기록 저장').click()
  165 |   await expect(other.locator('.journey-save-status')).toContainText('다른 화면에서 기록이 바뀌었어요')
  166 |   await expect(statement(other)).toHaveValue('내 화면의 오래된 진술과 pending 음성')
  167 |   await statement(other).evaluate((node: HTMLTextAreaElement) => {
  168 |     window.recordInput = node
  169 |     node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '옛' }))
  170 |     Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, '조합 중이던 옛 진술과 pending 음성')
  171 |   })
  172 |   await button(other, '최신 기록 불러오기').click(); await saved(other)
  173 |   await expect(statement(other)).toHaveValue('다른 탭에서 확정한 최신 진술')
  174 |   expect(await statement(other).evaluate(node => node === window.recordInput)).toBe(true)
  175 |   await expect(other.locator('.journey-voice audio')).toHaveCount(0)
  176 |   await other.getByText('내 임시 기록 확인', { exact: true }).click()
  177 |   await expect(other.locator('.journey-recovery')).toContainText('조합 중이던 옛 진술과 pending 음성')
  178 |   const media = other.locator('.journey-recovery').getByRole('link', { name: '자료 사본 내려받기', exact: true })
  179 |   await expect(media).toHaveAttribute('href', /^blob:/)
  180 |   const bytes = await media.evaluate(async (node: HTMLAnchorElement) => Array.from(new Uint8Array(await (await fetch(node.href)).arrayBuffer())))
  181 |   const source = await other.evaluate(async () => Array.from(new Uint8Array(await (await fetch('/journey-samples/voice-statement-ko-v1.wav')).arrayBuffer())))
  182 |   expect(bytes).toEqual(source)
  183 |   await button(other, '내용 확인으로').click()
  184 |   await button(other, '보낼 내용 확인').click()
  185 |   await expect(other.locator('.journey-submission')).toContainText('다른 탭에서 확정한 최신 진술')
  186 |   await expect(other.locator('.journey-submission')).not.toContainText('조합 중이던 옛 진술과 pending 음성')
  187 | })
  188 | 
  189 | test('clean statement identity changes synchronize without remounting and unrelated commits preserve caret', async ({ page }) => {
  190 |   await harness(page, 'voice')
> 191 |   await statement(page).focus()
      |                         ^ Error: locator.focus: Test timeout of 30000ms exceeded.
  192 |   await statement(page).evaluate((node: HTMLTextAreaElement) => { window.recordInput = node; node.setSelectionRange(2, 5) })
  193 |   await page.evaluate(async () => {
  194 |     await window.recordController.save({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'user-confirmed', source: 'user', confirmedAt: null } })
  195 |   })
  196 |   expect(await statement(page).evaluate((node: HTMLTextAreaElement) => ({ same: node === window.recordInput, start: node.selectionStart, end: node.selectionEnd, focused: document.activeElement === node }))).toEqual({ same: true, start: 2, end: 5, focused: true })
  197 |   await page.evaluate(async () => {
  198 |     await window.recordController.save({ type: 'statement-edit', id: 'primary-statement', text: '새 revision의 진술', audioEvidenceIds: [] })
  199 |   })
  200 |   await expect(statement(page)).toHaveValue('새 revision의 진술')
  201 |   expect(await statement(page).evaluate(node => node === window.recordInput)).toBe(true)
  202 |   await expect(button(page, '기록 저장')).toBeEnabled()
  203 | })
  204 | 
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
```