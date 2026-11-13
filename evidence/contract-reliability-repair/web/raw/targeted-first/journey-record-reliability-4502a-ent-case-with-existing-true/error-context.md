# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-record-reliability.spec.ts >> first durable retry publishes the current case with existing=true
- Location: tests/journey-record-reliability.spec.ts:96:39

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('시연 상황', { exact: true })

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]:
      - paragraph [ref=f1e6]: AFTER / CARE
      - heading "사고 대응 · 전체 여정" [level=1] [ref=f1e7]
      - text: 가상 자료와 명시적 결과로 검토 · 실제 전화·전송·기기 간 동기화 없음
    - link "Design system" [ref=f1e8] [cursor=pointer]:
      - /url: /?study=design-system
  - generic [ref=f1e11]:
    - region "시연 설정" [ref=f1e12]:
      - generic [ref=f1e13]:
        - text: 시연 상황
        - combobox "시연 상황" [ref=f1e14]:
          - option "사고 대응부터 후속 처리까지" [selected]
          - option "응답 없음과 늦은 응답"
          - option "차량 이동 불가"
          - option "자료 없이 이어가기"
          - option "일부 자료만 확보"
          - option "보험사 전송 거절 유지"
          - option "중단 중 접수 결과 도착"
          - option "과거 요청의 늦은 결과"
      - button "새 시연 시작" [ref=f1e15] [cursor=pointer]
      - button "차량 보기" [ref=f1e16] [cursor=pointer]
      - generic [ref=f1e20]:
        - text: 음성 입력
        - combobox "음성 입력" [ref=f1e21]:
          - option "이 기기 microphone" [selected]
          - option "준비된 음성 sample"
    - generic [ref=f1e22]:
      - button "긴급 대응 보기" [ref=f1e23] [cursor=pointer]
      - button "후속 처리 보기" [ref=f1e24] [cursor=pointer]
      - button "차량 상태 보기" [ref=f1e25] [cursor=pointer]
    - region "외부 결과 시연" [ref=f1e26]:
      - generic [ref=f1e28]: 정비소 정보
      - combobox "정비소 정보" [ref=f1e29]:
        - option "안내 있음" [selected]
        - option "오래된 안내"
        - option "제공된 목록 없음"
        - option "조회 실패"
      - 'button "시연 event: 차량 감지 자료" [ref=f1e30] [cursor=pointer]': 차량 감지 자료
      - 'button "시연 event: 사고 자료 확보" [ref=f1e31] [cursor=pointer]': 사고 자료 확보
      - 'button "시연 event: 경위서 초안" [ref=f1e32] [cursor=pointer]': 경위서 초안
      - 'button "시연 event: 비상등 작동 확인" [ref=f1e33] [cursor=pointer]': 비상등 작동 확인
      - 'button "시연 event: 안내 지점 자료" [ref=f1e34] [cursor=pointer]': 안내 지점 자료
      - 'button "시연 event: 위험 정보" [ref=f1e35] [cursor=pointer]': 위험 정보
      - 'button "시연 event: 통화 연결 확인" [ref=f1e36] [cursor=pointer]': 통화 연결 확인
      - 'button "시연 event: 구호 접수 확인" [ref=f1e37] [cursor=pointer]': 구호 접수 확인
  - generic [ref=f1e43]:
    - generic [ref=f1e46]:
      - heading "충돌 감지" [level=2] [ref=f1e52]
      - generic [ref=f1e53]:
        - generic [ref=f1e54]:
          - term [ref=f1e55]: 운전자 조작
          - definition [ref=f1e56]:
            - generic [ref=f1e57]: 미확인
        - generic [ref=f1e62]:
          - term [ref=f1e63]: 차량 이동
          - definition [ref=f1e64]:
            - generic [ref=f1e65]: 가능
        - generic [ref=f1e69]:
          - term [ref=f1e70]: 이동 경로
          - definition [ref=f1e71]:
            - generic [ref=f1e72]: 미확인
    - generic [ref=f1e77]:
      - region "작업 내용" [ref=f1e78]:
        - region "음성 사고 기록" [ref=f1e82]:
          - generic [ref=f1e84]:
            - generic [ref=f1e85]: 사고 기록
            - heading "이렇게 기록할까요?" [active] [level=1] [ref=f1e86]
          - generic [ref=f1e87]:
            - paragraph [ref=f1e88]: 기억과 다른 내용은 저장 전에 고칠 수 있어요.
            - button "음성 안내 듣기" [ref=f1e90] [cursor=pointer]
            - navigation "기록 방법" [ref=f1e95]:
              - button "말로 남기기" [pressed] [ref=f1e96] [cursor=pointer]
              - button "사진 남기기" [ref=f1e97] [cursor=pointer]
            - generic [ref=f1e98]:
              - generic [ref=f1e99]:
                - generic [ref=f1e100]: 사고 기록
                - generic [ref=f1e101]: 8 / 5,000
              - textbox "사고 기록" [ref=f1e102]:
                - /placeholder: 기억나는 내용을 적어주세요
                - text: 처음 남긴 진술
              - paragraph [ref=f1e103]: 확인하지 못한 내용은 추측하지 않아도 돼요.
            - button "추가로 말하기" [ref=f1e105] [cursor=pointer]
            - generic "기관별 요청 상태" [ref=f1e109]:
              - generic [ref=f1e110]:
                - term [ref=f1e111]: 구호
                - definition [ref=f1e112]:
                  - strong [ref=f1e113]:
                    - generic [ref=f1e119]:
                      - generic [ref=f1e120]: 통화 연결
                      - generic [ref=f1e121]:
                        - generic [ref=f1e122]: ·
                        - text: 접수 미확인
              - generic [ref=f1e123]:
                - term [ref=f1e124]: 차량 지원
                - definition [ref=f1e125]:
                  - strong [ref=f1e126]:
                    - generic [ref=f1e127]: 요청 전
              - generic [ref=f1e134]:
                - term [ref=f1e135]: 보험사
                - definition [ref=f1e136]:
                  - strong [ref=f1e137]:
                    - generic [ref=f1e138]: 요청 전
          - button "기록 저장" [disabled] [ref=f1e146]
      - button "내용 확인으로" [ref=f1e150] [cursor=pointer]
  - status [ref=f1e153]: 이 기기에 보관됨
```

# Test source

```ts
  1   | /// <reference lib="es2024.promise" />
  2   | import { test, expect, type Page } from '@playwright/test'
  3   | import type ReactModule from 'react'
  4   | import type * as ReactDOMClient from 'react-dom/client'
  5   | import type * as CaseDomain from '../src/journey/case'
  6   | import type * as CaseStore from '../src/journey/case-store'
  7   | import type * as EmergencySession from '../src/emergency/session'
  8   | import type * as JourneyHook from '../src/journey/useJourneyCase'
  9   | import type * as VoicePanel from '../src/journey/VoiceRecordPanel'
  10  | import type * as ReportEditor from '../src/journey/ReportPanel'
  11  | import type { JourneyCaseController } from '../src/journey/useJourneyCase'
  12  | 
  13  | const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
  14  | const saved = (page: Page) => expect(page.locator('.journey-save-status')).toHaveText('이 기기에 보관됨')
  15  | const statement = (page: Page) => page.getByRole('textbox', { name: '사고 기록', exact: true })
  16  | 
  17  | declare global {
  18  |   interface Window {
  19  |     recordController: JourneyCaseController
  20  |     recordSetId: (id: string) => void
  21  |     recordRestorePut: () => void
  22  |     recordReleaseCommit: () => void
  23  |     recordCommitWaiting: boolean
  24  |     recordInput: HTMLTextAreaElement
  25  |     recordReleasePermission: () => void
  26  |   }
  27  | }
  28  | 
  29  | async function seed(page: Page, stage: 'record' | 'review' = 'record', paragraphs = 0) {
  30  |   await page.goto('/?study=journey&device=mobile')
  31  |   const id = await page.evaluate(async ({ stage, paragraphs }) => {
  32  |     // These modules must execute inside the browser's Vite realm, not Playwright's Node realm.
  33  |     const domainPath = '/src/journey/case.ts', sessionPath = '/src/emergency/session.ts', storePath = '/src/journey/case-store.ts'
  34  |     const { createCase } = await import(/* @vite-ignore */ domainPath) as typeof CaseDomain
  35  |     const { createSession } = await import(/* @vite-ignore */ sessionPath) as typeof EmergencySession
  36  |     const { commitCase } = await import(/* @vite-ignore */ storePath) as typeof CaseStore
  37  |     const value = createCase(createSession('SC01', 'connected'), crypto.randomUUID(), new Date().toISOString())
  38  |     value.stage = stage; value.fixtureId = 'partial-evidence'
  39  |     value.statements = [{ id: 'primary-statement', text: '처음 남긴 진술', audioEvidenceIds: [], revision: 1, confirmedRevision: 1 }]
  40  |     if (paragraphs) value.report = { revision: 1, basedOnRevision: 0, paragraphs: Array.from({ length: paragraphs }, (_, index) => ({
  41  |       id: `paragraph-${index + 1}`, text: `기존 문장 ${index + 1}`, kind: 'statement' as const, references: [], revision: 1, confirmedRevision: null,
  42  |     })) }
  43  |     const result = await commitCase(value, null)
  44  |     if (!result.ok) throw new Error(result.reason)
  45  |     return value.id
  46  |   }, { stage, paragraphs })
  47  |   await page.goto(`/?study=journey&device=mobile&case=${id}`)
  48  |   await saved(page)
  49  |   return id
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
> 100 |   await page.getByLabel('시연 상황', { exact: true }).selectOption('partial-evidence')
      |                                                   ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
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
```