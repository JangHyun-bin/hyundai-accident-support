# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-record-reliability.spec.ts >> a late commit cannot adopt into a newer open case
- Location: tests/journey-record-reliability.spec.ts:121:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByRole('textbox', { name: '사고 기록', exact: true })
Expected: "새로 연 기록"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" getByRole('textbox', { name: '사고 기록', exact: true }) with timeout 5000ms
  - waiting for getByRole('textbox', { name: '사고 기록', exact: true })

```

```yaml
- region "음성 사고 기록":
  - text: 사고 기록
  - heading "이렇게 기록할까요?" [level=1]
  - paragraph: 기억과 다른 내용은 저장 전에 고칠 수 있어요.
  - button "음성 안내 듣기"
  - text: 사고 기록 7 / 5,000
  - textbox "기억나는 내용을 적어주세요": 새로 연 기록
  - paragraph: 확인하지 못한 내용은 추측하지 않아도 돼요.
  - button "추가로 말하기"
  - button "기록 저장" [disabled]
```

# Test source

```ts
  50  | }
  51  | 
  52  | async function blockWrites(page: Page) {
  53  |   await page.evaluate(() => {
  54  |     const original = IDBObjectStore.prototype.put
  55  |     window.recordRestorePut = () => { IDBObjectStore.prototype.put = original }
  56  |     IDBObjectStore.prototype.put = function (...args) {
  57  |       if (this.name === 'cases') throw new DOMException('Full', 'QuotaExceededError')
  58  |       return original.apply(this, args)
  59  |     }
  60  |   })
  61  | }
  62  | 
  63  | async function harness(page: Page, kind: 'voice' | 'report', paragraphs = 0, mode: 'sample' | 'device' = 'sample') {
  64  |   const id = await seed(page, kind === 'report' ? 'review' : 'record', paragraphs)
  65  |   await page.evaluate(async ({ id, kind, mode }) => {
  66  |     const root = '/src/'
  67  |     const source = await (await fetch(root + 'journey/useJourneyCase.ts')).text()
  68  |     const main = await (await fetch(root + 'main.tsx')).text()
  69  |     const reactUrl = source.match(/from "([^"]*\/react\.js[^\"]*)"/)![1]
  70  |     const clientUrl = main.match(/from "([^"]*\/react-dom_client\.js[^\"]*)"/)![1]
  71  |     // Loading the Vite/browser module instances avoids a second React runtime across realms.
  72  |     const React = (await import(reactUrl)).default as typeof ReactModule
  73  |     const { createRoot } = (await import(clientUrl)).default as typeof ReactDOMClient
  74  |     const { useJourneyCase } = await import(root + 'journey/useJourneyCase.ts') as typeof JourneyHook
  75  |     const { VoiceRecordPanel } = await import(root + 'journey/VoiceRecordPanel.tsx') as typeof VoicePanel
  76  |     const { ReportPanel } = await import(root + 'journey/ReportPanel.tsx') as typeof ReportEditor
  77  |     function Harness() {
  78  |       const [caseId, setCaseId] = React.useState(id)
  79  |       const controller = useJourneyCase(caseId)
  80  |       window.recordController = controller; window.recordSetId = setCaseId
  81  |       if (!controller.value) return null
  82  |       return kind === 'voice'
  83  |         ? React.createElement(VoiceRecordPanel, { value: controller.value, mode, onSave: controller.save, durable: controller.saveState === 'saved', reloadVersion: controller.reloadVersion })
  84  |         : React.createElement(ReportPanel, { value: controller.value, onCommand: controller.save, reloadVersion: controller.reloadVersion })
  85  |     }
  86  |     const container = document.createElement('div')
  87  |     container.id = 'record-reliability-harness'
  88  |     document.getElementById('root')!.hidden = true
  89  |     document.body.append(container)
  90  |     createRoot(container).render(React.createElement(Harness))
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
> 150 |   await expect(statement(page)).toHaveValue('새로 연 기록')
      |                                 ^ Error: expect(locator).toHaveValue(expected) failed
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
  191 |   await statement(page).focus()
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
```