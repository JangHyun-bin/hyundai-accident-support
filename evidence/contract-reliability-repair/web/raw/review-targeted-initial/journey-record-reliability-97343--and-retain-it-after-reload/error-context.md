# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-record-reliability.spec.ts >> pending report saves freeze the submitted reference choice and retain it after reload
- Location: tests/journey-record-reliability.spec.ts:411:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('article', { name: '문장 1', exact: true }).getByRole('checkbox', { name: '전방 영상 포함', exact: true })
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" getByRole('article', { name: '문장 1', exact: true }).getByRole('checkbox', { name: '전방 영상 포함', exact: true }) with timeout 5000ms
  - waiting for getByRole('article', { name: '문장 1', exact: true }).getByRole('checkbox', { name: '전방 영상 포함', exact: true })

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
    - option "사고 대응부터 후속 처리까지" [selected]
    - option "응답 없음과 늦은 응답"
    - option "차량 이동 불가"
    - option "자료 없이 이어가기"
    - option "일부 자료만 확보"
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
    - button "사고 영상"
    - button "사고 도식"
    - button "경위서" [pressed]
  - region "경위서 검토":
    - heading "내용을 한 문장씩 확인해주세요" [level=2]
    - paragraph: 추정과 미확인은 확인한 뒤에도 그대로 표시돼요.
    - article "문장 1":
      - text: 자료 관측 · 사용자 정정 확인 필요 문장 내용
      - textbox "문장 내용": 전방 영상을 근거에서 제외한 정정
      - text: 18 / 5000
      - button "정정 저장 중" [disabled]
      - button "정정 취소" [disabled]
    - article "문장 2":
      - text: 사용자 진술 확인 필요
      - paragraph: 처음 남긴 진술
      - button "정정하기" [disabled]
      - button "문장 제외" [disabled]
      - button "문장 확인" [disabled]
    - article "문장 3":
      - text: 추정 확인 필요
      - paragraph: 접촉했을 가능성이 있어요.
      - button "정정하기" [disabled]
      - button "문장 제외" [disabled]
      - button "문장 확인" [disabled]
    - status: 경위서 3 / 100문장
    - button "문장 추가" [disabled]
  - term: 구호
  - definition:
    - strong: 통화 연결 · 접수 미확인
  - term: 차량 지원
  - definition:
    - strong: 요청 전
  - term: 보험사
  - definition:
    - strong: 요청 전
  - button "보낼 내용 확인" [disabled]
- button "기록으로 돌아가기"
- status: 저장 중
```

# Test source

```ts
  325 |   await input.evaluate((node: HTMLTextAreaElement) => { window.recordInput = node })
  326 |   await page.evaluate(async () => { await window.recordController.save({ type: 'paragraph-edit', id: 'racing-100', text: '먼저 저장된 100번째 문장', references: [] }) })
  327 |   await button(page, '정정 저장').click()
  328 |   await expect(page.getByText('경위서는 100문장까지 남길 수 있어요. 기존 문장을 수정하거나 제외해주세요.', { exact: true })).toBeVisible()
  329 |   await expect(input).toHaveValue('거절되어도 남아야 하는 101번째 문장')
  330 |   await expect(input).toBeFocused()
  331 |   expect(await input.evaluate(node => node === window.recordInput)).toBe(true)
  332 |   expect(await page.evaluate(() => window.recordController.value?.report?.paragraphs.length)).toBe(100)
  333 |   const rejected = await page.evaluate(() => window.recordController.save({ type: 'paragraph-edit', id: 'rejected-101', text: '추가 거절', references: [] }))
  334 |   expect(rejected).toMatchObject({ ok: false, reason: 'invalid', rejection: 'paragraph-limit' })
  335 | })
  336 | 
  337 | test('quota failure keeps the new report draft mounted and only durable success closes it', async ({ page }) => {
  338 |   await harness(page, 'report', 99)
  339 |   await button(page, '문장 추가').click(); const input = page.getByLabel('문장 내용', { exact: true })
  340 |   await input.fill('quota 뒤에도 보존할 문장'); await input.evaluate((node: HTMLTextAreaElement) => { window.recordInput = node })
  341 |   await blockWrites(page); await button(page, '정정 저장').click()
  342 |   await expect(page.getByText('저장하지 못했어요. 정정 내용은 이 화면에 남아 있어요.', { exact: true })).toBeVisible()
  343 |   await expect(input).toHaveValue('quota 뒤에도 보존할 문장'); await expect(input).toBeFocused()
  344 |   expect(await input.evaluate(node => node === window.recordInput)).toBe(true)
  345 |   await page.evaluate(() => window.recordRestorePut())
  346 |   await button(page, '정정 저장').click()
  347 |   await expect(input).toHaveCount(0)
  348 |   expect(await page.evaluate(() => window.recordController.saveState)).toBe('saved')
  349 | })
  350 | 
  351 | test('incoming state commits cannot close a voice save before its durable completion', async ({ page }) => {
  352 |   await harness(page, 'voice')
  353 |   await statement(page).fill('저장 중에도 유지할 진술')
  354 |   await page.evaluate(() => {
  355 |     const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
  356 |     Object.defineProperty(IDBTransaction.prototype, 'oncomplete', { ...descriptor, set(handler) {
  357 |       if (this.mode !== 'readwrite') { descriptor.set!.call(this, handler); return }
  358 |       Object.defineProperty(IDBTransaction.prototype, 'oncomplete', descriptor)
  359 |       descriptor.set!.call(this, (event: Event) => {
  360 |         window.recordCommitWaiting = true
  361 |         window.recordReleaseCommit = () => handler.call(this, event)
  362 |       })
  363 |     } })
  364 |   })
  365 |   await button(page, '기록 저장').click()
  366 |   await expect.poll(() => page.evaluate(() => window.recordCommitWaiting)).toBe(true)
  367 |   await page.evaluate(() => {
  368 |     window.recordController.dispatch({ type: 'safety-action', action: { id: 'hazard', label: '비상등', status: 'user-confirmed', source: 'user', confirmedAt: null } })
  369 |   })
  370 |   await expect(page.locator('#record-reliability-harness [data-voice-phase]')).toHaveAttribute('data-voice-phase', 'saving')
  371 |   await expect(statement(page)).toHaveValue('저장 중에도 유지할 진술')
  372 |   await expect(page.getByText('기록을 저장했어요.', { exact: true })).toHaveCount(0)
  373 |   await page.evaluate(() => window.recordReleaseCommit())
  374 |   await expect(page.getByText('기록을 저장했어요.', { exact: true })).toBeVisible()
  375 |   expect(await page.evaluate(() => window.recordController.value?.statements[0].text)).toBe('저장 중에도 유지할 진술')
  376 | })
  377 | 
  378 | test('latest report reload locks edits until adoption and preserves the prior draft', async ({ page, context }, testInfo) => {
  379 |   await seed(page, 'review', 1)
  380 |   const other = await context.newPage(); await other.goto(page.url()); await saved(other)
  381 |   for (const tab of [page, other]) await button(tab, '경위서').click()
  382 |   await page.getByRole('article', { name: '문장 1', exact: true }).getByRole('button', { name: '정정하기', exact: true }).click()
  383 |   await page.getByLabel('문장 내용', { exact: true }).fill('다른 탭에서 확정한 최신 경위서')
  384 |   await button(page, '정정 저장').click(); await saved(page)
  385 |   await other.getByRole('article', { name: '문장 1', exact: true }).getByRole('button', { name: '정정하기', exact: true }).click()
  386 |   const input = other.locator('.journey-report textarea:visible')
  387 |   await input.fill('보존해야 하는 내 경위서 정정')
  388 |   await button(other, '정정 저장').click()
  389 |   await expect(other.locator('.journey-save-status')).toContainText('다른 화면에서 기록이 바뀌었어요')
  390 |   await holdCaseCompletion(other, 'readonly')
  391 |   await button(other, '최신 기록 불러오기').click()
  392 |   await expect.poll(() => other.evaluate(() => window.recordStorageWaiting)).toBe(true)
  393 |   await input.focus(); await other.keyboard.insertText('로딩 중 추가 입력')
  394 |   await expect(input).not.toBeFocused()
  395 |   const pendingFocus = await input.evaluate(node => document.activeElement === node)
  396 |   await expect(input).toHaveValue('보존해야 하는 내 경위서 정정')
  397 |   await expect(button(other, '최신 기록 불러오는 중')).toBeDisabled()
  398 |   await other.screenshot({ path: testInfo.outputPath('reload-busy-report.png'), fullPage: true })
  399 |   await other.evaluate(() => window.recordReleaseStorage())
  400 |   await saved(other)
  401 |   await expect(input).toHaveCount(0)
  402 |   await expect(other.locator('.journey-report')).toContainText('다른 탭에서 확정한 최신 경위서')
  403 |   await other.getByText('내 임시 기록 확인', { exact: true }).click()
  404 |   await expect(other.locator('.journey-recovery')).toContainText('보존해야 하는 내 경위서 정정')
  405 |   await attachProof(testInfo, 'reload-report-boundary', {
  406 |     pendingEditorCouldReceiveFocus: pendingFocus, latest: await other.locator('.journey-report').innerText(),
  407 |     recovery: await other.locator('.journey-recovery').innerText(),
  408 |   })
  409 | })
  410 | 
  411 | test('pending report saves freeze the submitted reference choice and retain it after reload', async ({ page }, testInfo) => {
  412 |   await seed(page, 'review')
  413 |   await button(page, '시연 event: 사고 자료 확보').click()
  414 |   await expect(button(page, '시연 event: 사고 자료 확보')).toBeEnabled()
  415 |   await button(page, '시연 event: 경위서 초안').click(); await saved(page)
  416 |   await button(page, '경위서').click()
  417 |   const paragraph = page.getByRole('article', { name: '문장 1', exact: true })
  418 |   await paragraph.getByRole('button', { name: '정정하기', exact: true }).click()
  419 |   await paragraph.getByLabel('문장 내용', { exact: true }).fill('전방 영상을 근거에서 제외한 정정')
  420 |   const reference = paragraph.getByRole('checkbox', { name: '전방 영상 포함', exact: true })
  421 |   await reference.uncheck()
  422 |   await holdCaseCompletion(page, 'readwrite')
  423 |   await button(page, '정정 저장').click()
  424 |   await expect.poll(() => page.evaluate(() => window.recordStorageWaiting)).toBe(true)
> 425 |   await expect(reference).toBeDisabled()
      |                           ^ Error: expect(locator).toBeDisabled() failed
  426 |   await expect(reference).not.toBeChecked()
  427 |   const pendingChoice = { included: await reference.isChecked(), disabled: await reference.isDisabled() }
  428 |   await paragraph.screenshot({ path: testInfo.outputPath('reference-save-busy.png') })
  429 |   await page.evaluate(() => window.recordReleaseStorage())
  430 |   await expect(paragraph.getByLabel('문장 내용', { exact: true })).toHaveCount(0)
  431 |   await saved(page)
  432 |   const stored = await page.evaluate(async () => {
  433 |     // IndexedDB and its module must execute in this browser's Vite realm, not the Node runner.
  434 |     const path = '/src/journey/case-store.ts'
  435 |     const { loadCase } = await import(/* @vite-ignore */ path) as typeof CaseStore
  436 |     return (await loadCase(new URL(location.href).searchParams.get('case')!))?.report?.paragraphs[0]
  437 |   })
  438 |   expect(stored).toMatchObject({ text: '전방 영상을 근거에서 제외한 정정', references: [] })
  439 |   await page.reload(); await button(page, '경위서').click()
  440 |   await expect(paragraph).toContainText('전방 영상을 근거에서 제외한 정정')
  441 |   await attachProof(testInfo, 'report-reference-save-boundary', { submittedReferenceIncluded: pendingChoice.included, nativePendingChoiceDisabled: pendingChoice.disabled, stored })
  442 | })
  443 | 
```