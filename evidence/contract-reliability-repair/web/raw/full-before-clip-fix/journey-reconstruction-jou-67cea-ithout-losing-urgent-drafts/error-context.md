# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey-reconstruction.spec.ts >> journey integration restores clips and edited diagrams after reload without losing urgent drafts
- Location: tests/journey-reconstruction.spec.ts:195:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '전방 영상 재생', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: AFTER / CARE
      - heading "사고 대응 · 전체 여정" [level=1] [ref=e7]
      - text: 가상 자료와 명시적 결과로 검토 · 실제 전화·전송·기기 간 동기화 없음
    - link "Design system" [ref=e8] [cursor=pointer]:
      - /url: /?study=design-system
  - generic [ref=e11]:
    - region "시연 설정" [ref=e12]:
      - generic [ref=e13]:
        - text: 시연 상황
        - combobox "시연 상황" [ref=e14]:
          - option "사고 대응부터 후속 처리까지"
          - option "응답 없음과 늦은 응답"
          - option "차량 이동 불가"
          - option "자료 없이 이어가기"
          - option "일부 자료만 확보" [selected]
          - option "보험사 전송 거절 유지"
          - option "중단 중 접수 결과 도착"
          - option "과거 요청의 늦은 결과"
      - button "새 시연 시작" [ref=e15] [cursor=pointer]
      - button "차량 보기" [ref=e16] [cursor=pointer]
      - generic [ref=e20]:
        - text: 음성 입력
        - combobox "음성 입력" [ref=e21]:
          - option "이 기기 microphone" [selected]
          - option "준비된 음성 sample"
    - generic [ref=e22]:
      - button "긴급 대응 보기" [ref=e23] [cursor=pointer]
      - button "후속 처리 보기" [ref=e24] [cursor=pointer]
      - button "차량 상태 보기" [ref=e25] [cursor=pointer]
    - region "외부 결과 시연" [ref=e26]:
      - generic [ref=e28]: 정비소 정보
      - combobox "정비소 정보" [ref=e29]:
        - option "안내 있음" [selected]
        - option "오래된 안내"
        - option "제공된 목록 없음"
        - option "조회 실패"
      - 'button "시연 event: 차량 감지 자료" [ref=e30] [cursor=pointer]': 차량 감지 자료
      - 'button "시연 event: 사고 자료 확보" [ref=e31] [cursor=pointer]': 사고 자료 확보
      - 'button "시연 event: 경위서 초안" [ref=e32] [cursor=pointer]': 경위서 초안
      - 'button "시연 event: 비상등 작동 확인" [ref=e33] [cursor=pointer]': 비상등 작동 확인
      - 'button "시연 event: 안내 지점 자료" [ref=e34] [cursor=pointer]': 안내 지점 자료
      - 'button "시연 event: 위험 정보" [ref=e35] [cursor=pointer]': 위험 정보
      - 'button "시연 event: 통화 연결 확인" [ref=e36] [cursor=pointer]': 통화 연결 확인
      - 'button "시연 event: 구호 접수 확인" [ref=e37] [cursor=pointer]': 구호 접수 확인
  - generic [ref=e43]:
    - generic [ref=e46]:
      - heading "충돌 감지" [level=2] [ref=e52]
      - generic [ref=e53]:
        - generic [ref=e54]:
          - term [ref=e55]: 운전자 조작
          - definition [ref=e56]:
            - generic [ref=e57]: 미확인
        - generic [ref=e62]:
          - term [ref=e63]: 차량 이동
          - definition [ref=e64]:
            - generic [ref=e65]: 가능
        - generic [ref=e69]:
          - term [ref=e70]: 이동 경로
          - definition [ref=e71]:
            - generic [ref=e72]: 미확인
    - generic [ref=e77]:
      - region "작업 내용" [ref=e78]:
        - generic [ref=e81]:
          - generic [ref=e83]:
            - generic [ref=e84]: 사고 내용 확인
            - heading "남겨진 자료를 살펴보세요" [active] [level=1] [ref=e85]
          - generic [ref=e86]:
            - paragraph [ref=e87]: 확인할 수 없는 내용은 그대로 남겨도 돼요.
            - button "음성 안내 듣기" [ref=e89] [cursor=pointer]
            - navigation "확인할 자료" [ref=e94]:
              - button "사고 영상" [pressed] [ref=e95] [cursor=pointer]
              - button "사고 도식" [ref=e96] [cursor=pointer]
              - button "경위서" [ref=e97] [cursor=pointer]
            - generic [ref=e98]:
              - region [ref=e99]:
                - generic [ref=e100]:
                  - heading "전방 영상" [level=3] [ref=e101]
                  - generic [ref=e102]: 확보 못함
                - paragraph [ref=e110]: 영상 파일을 열 수 없어요
                - generic [ref=e111]:
                  - generic [ref=e112]: 합성 전방 영상
                  - generic [ref=e113]: 11. 10. 오후 06:12
              - region [ref=e114]:
                - generic [ref=e115]:
                  - heading "후방 영상" [level=3] [ref=e116]
                  - generic [ref=e117]: 확보 못함
                - paragraph [ref=e125]: 제공된 영상이 없어요
                - generic [ref=e126]:
                  - generic [ref=e127]: 합성 후방 영상
                  - generic [ref=e128]: 11. 10. 오후 06:12
            - generic "기관별 요청 상태" [ref=e129]:
              - generic [ref=e130]:
                - term [ref=e131]: 구호
                - definition [ref=e132]:
                  - strong [ref=e133]:
                    - generic [ref=e139]:
                      - generic [ref=e140]: 통화 연결
                      - generic [ref=e141]:
                        - generic [ref=e142]: ·
                        - text: 접수 미확인
              - generic [ref=e143]:
                - term [ref=e144]: 차량 지원
                - definition [ref=e145]:
                  - strong [ref=e146]:
                    - generic [ref=e147]: 요청 전
              - generic [ref=e154]:
                - term [ref=e155]: 보험사
                - definition [ref=e156]:
                  - strong [ref=e157]:
                    - generic [ref=e158]: 요청 전
          - button "보낼 내용 확인" [ref=e166] [cursor=pointer]
      - button "기록으로 돌아가기" [ref=e168] [cursor=pointer]
  - status [ref=e169]: 이 기기에 보관됨
```

# Test source

```ts
  103 |   expect(result?.vehicles[0].heading).toBe(15)
  104 |   expect(result?.contact).toEqual({ x: .48, y: .53 })
  105 |   await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  106 |   await expect(page.getByText('처음 제안된 도식', { exact: true })).toBeVisible()
  107 |   await expect(page.getByRole('button', { name: '오른쪽으로 이동', exact: true })).toBeDisabled()
  108 |   await page.getByRole('button', { name: '정정본 보기', exact: true }).click()
  109 |   await expect(page.getByRole('button', { name: '오른쪽으로 이동', exact: true })).toBeEnabled()
  110 | })
  111 | 
  112 | test('unsupported roads expose no fabricated diagram or editing controls', async ({ page }) => {
  113 |   await mount(page, { diagram: { ...original, road: 'unsupported' } })
  114 |   await expect(page.getByText('이 도로는 도식으로 표현하기 어려워요', { exact: true })).toBeVisible()
  115 |   await expect(page.getByTestId('diagram-canvas')).toHaveCount(0)
  116 |   await expect(page.getByRole('button', { name: '도식 정정 저장', exact: true })).toHaveCount(0)
  117 | })
  118 | 
  119 | test('a missing rear clip leaves the front clip playable and shows actual duration', async ({ page }) => {
  120 |   await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4' }, { evidence: video('rear', 'unavailable') }] })
  121 |   await expect(page.getByText('제공된 영상이 없어요', { exact: true })).toBeVisible()
  122 |   await expect(page.getByText('충돌 시점 미확인', { exact: true })).toBeVisible()
  123 |   await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  124 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  125 |   await expect(page.getByText('00:20', { exact: true })).toBeVisible()
  126 | })
  127 | 
  128 | test('unrelated case updates preserve a draft and restored history supplies the original', async ({ page }) => {
  129 |   const corrected = structuredClone(original)
  130 |   corrected.revision = 2; corrected.origin = 'user'; corrected.vehicles[0].position.x = .45
  131 |   await mount(page, { diagram: corrected, original })
  132 |   await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  133 |   await page.evaluate(value => window.reconstructionRerender(value), structuredClone(corrected))
  134 |   await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  135 |   expect(await page.evaluate(() => window.reconstructionResult?.vehicles[0].position.x)).toBe(.5)
  136 |   await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  137 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(350 650)')
  138 | })
  139 | 
  140 | test('decode failure in one clip leaves the other usable', async ({ page }) => {
  141 |   await mount(page, { clips: [{ evidence: video('front'), corrupt: true }, { evidence: video('rear'), path: '/journey-samples/rear-20s.mp4' }] })
  142 |   await expect(page.getByText('영상을 재생할 수 없어요', { exact: true })).toBeVisible()
  143 |   await page.getByRole('button', { name: '후방 영상 재생', exact: true }).click()
  144 |   await expect.poll(() => page.locator('video').last().evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  145 | })
  146 | 
  147 | test('invalid evidence range is rejected without seeking another clip', async ({ page }) => {
  148 |   await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4', range: { start: 90, end: 110 } }] })
  149 |   await expect(page.getByText('이 영상에서 해당 구간을 열 수 없어요', { exact: true })).toBeVisible()
  150 |   await expect(page.locator('video')).toHaveJSProperty('currentTime', 0)
  151 |   await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  152 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  153 | })
  154 | 
  155 | test('only supplied event times become markers and evidence playback stops at the selected end', async ({ page }) => {
  156 |   const evidence = video('front')
  157 |   evidence.metadata.eventTime = 11
  158 |   await mount(page, { clips: [{ evidence, path: '/journey-samples/front-20s.mp4', range: { start: 10, end: 11 } }] })
  159 |   await expect(page.getByLabel('충돌 시점 00:11', { exact: true })).toBeVisible()
  160 |   await page.getByText('근거 구간 확인', { exact: true }).click()
  161 |   await page.getByRole('button', { name: '선택 구간 재생', exact: true }).click()
  162 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBe(11)
  163 |   await expect(page.locator('video')).toHaveJSProperty('paused', true)
  164 | })
  165 | 
  166 | test('leaving the clip view pauses playback without discarding the current position', async ({ page }) => {
  167 |   await mount(page, { clips: [{ evidence: video('front'), path: '/journey-samples/front-20s.mp4' }] })
  168 |   await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
  169 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(.2)
  170 |   await page.evaluate(() => window.reconstructionSetClipActive(false))
  171 |   await expect(page.locator('video')).toHaveJSProperty('paused', true)
  172 |   const position = await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)
  173 |   await page.evaluate(() => window.reconstructionSetClipActive(true))
  174 |   await expect(page.locator('video')).toHaveJSProperty('paused', true)
  175 |   expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeCloseTo(position, 2)
  176 | })
  177 | 
  178 | test('small mobile and enlarged text preserve all reconstruction controls', async ({ page }) => {
  179 |   await page.setViewportSize({ width: 360, height: 800 })
  180 |   await mount(page, { diagram: original })
  181 |   await expect(page.getByRole('button', { name: '도식 정정 저장', exact: true })).toBeVisible()
  182 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  183 |   await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  184 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  185 |   await expect(page.getByRole('button', { name: '반시계 방향으로 회전', exact: true })).toBeVisible()
  186 | })
  187 | 
  188 | test('representative mobile diagram and clip remain visually reviewable', async ({ page }, testInfo) => {
  189 |   await page.setViewportSize({ width: 393, height: 852 })
  190 |   await mount(page, { diagram: original, clips: [{ evidence: { ...video('front'), metadata: { ...video('front').metadata, eventTime: 11 } }, path: '/journey-samples/front-20s.mp4' }] })
  191 |   await expect(page.getByRole('button', { name: '전방 영상 재생', exact: true })).toBeEnabled()
  192 |   await page.screenshot({ path: testInfo.outputPath('mobile-reconstruction.png'), fullPage: true })
  193 | })
  194 | 
  195 | test('journey integration restores clips and edited diagrams after reload without losing urgent drafts', async ({ page }) => {
  196 |   await page.setViewportSize({ width: 393, height: 852 })
  197 |   await page.goto('/?study=journey&fixture=partial-evidence&device=mobile')
  198 |   await page.getByRole('button', { name: '이 상황으로 시작', exact: true }).click()
  199 |   await page.getByRole('button', { name: '시연 event: 사고 자료 확보', exact: true }).click()
  200 |   await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  201 |   await page.getByRole('button', { name: '사고 기록 남기기', exact: true }).click()
  202 |   await page.getByRole('button', { name: '내용 확인으로', exact: true }).click()
> 203 |   await page.getByRole('button', { name: '전방 영상 재생', exact: true }).click()
      |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  204 |   await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
  205 |   await page.getByRole('button', { name: '사고 도식', exact: true }).click()
  206 |   await page.getByRole('button', { name: '오른쪽으로 이동', exact: true }).click()
  207 |   const edited = await page.getByRole('button', { name: '내 차량 위치', exact: true }).getAttribute('transform')
  208 |   await page.getByRole('button', { name: '시연 event: 위험 정보', exact: true }).click()
  209 |   await expect(page.locator('[data-journey-stage]')).toHaveAttribute('data-journey-stage', 'response')
  210 |   await page.getByRole('button', { name: '내용 확인으로 돌아가기', exact: true }).click()
  211 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', edited!)
  212 |   await page.getByRole('button', { name: '도식 정정 저장', exact: true }).click()
  213 |   await expect(page.getByText('이 기기에 보관됨', { exact: true })).toBeVisible()
  214 |   await page.reload()
  215 |   await page.getByRole('button', { name: '사고 도식', exact: true }).click()
  216 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', edited!)
  217 |   await page.getByRole('button', { name: '원본 보기', exact: true }).click()
  218 |   await expect(page.getByRole('button', { name: '내 차량 위치', exact: true })).not.toHaveAttribute('transform', edited!)
  219 | })
  220 | 
  221 | 
  222 | test('approved diagram preview shows exact positions without editing actions', async ({ page }) => {
  223 |   await mount(page, { diagram: original, readOnly: true })
  224 |   const preview = page.getByRole('region', { name: '보낼 사고 도식', exact: true })
  225 |   await expect(preview.getByRole('img', { name: '내 차량 위치', exact: true })).toHaveAttribute('transform', 'translate(350 650)')
  226 |   await expect(preview.getByRole('button')).toHaveCount(0)
  227 |   await expect(preview.getByText('사용자 정정', { exact: true })).toHaveCount(0)
  228 | })
  229 | 
```