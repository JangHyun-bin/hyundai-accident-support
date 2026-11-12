# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guidance-audio.spec.ts >> every scene, journey and runtime script has an exact static speech asset
- Location: tests/guidance-audio.spec.ts:45:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   "기록을 이 기기에 저장하지 못했어요. 입력한 내용은 현재 화면에만 남아 있어요. 화면을 닫으면 사라져요.",
+   "전송을 보류했어요. 기록을 이 기기에 저장하지 못해 현재 화면에만 남아 있어요. 구호·차량 지원은 계속 진행돼요.",
+   "보험 접수는 아직 확인되지 않았어요. 전송과 접수는 별도로 확인해요. 구호·차량 지원은 계속 진행돼요.",
+   "보험 접수가 되지 않은 것을 확인했어요. 다시 보내려면 전송 범위를 확인하고 새로 승인해 주세요. 구호·차량 지원은 계속 진행돼요.",
+ ]
```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - link "AFTER / CARE" [ref=e5] [cursor=pointer]:
      - /url: /?study=journey
    - navigation "Design system" [ref=e6]:
      - link "단계별 공간 전환" [ref=e7] [cursor=pointer]:
        - /url: /?study=flow
      - link "전체 흐름" [ref=e10] [cursor=pointer]:
        - /url: /?study=journey
      - link "Surface 조절" [ref=e13] [cursor=pointer]:
        - /url: /?study=response-alts&focus=surface
  - generic [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]: B″ / GLOBAL SYSTEM
      - heading "AFTER / CARE design system" [level=1] [ref=e19]
      - paragraph [ref=e20]: 새 화면은 이 catalog의 token과 component를 사용. 필요한 표현은 공용 기준에 먼저 추가.
    - paragraph [ref=e21]: 차분한 정보, 명확한 다음 행동.선택한 B의 공간과 질감을 제품 전체의 규칙으로.
  - region "Color tokens" [ref=e22]:
    - generic [ref=e23]:
      - generic [ref=e24]: "01"
      - heading "색의 역할" [level=2] [ref=e25]
      - paragraph [ref=e26]: 상태는 색·icon·문구로 함께 표현.
    - generic [ref=e27]:
      - generic [ref=e28]:
        - strong [ref=e30]: 바탕
        - code [ref=e31]: "#09090c"
        - generic [ref=e32]: "--ac-background"
      - generic [ref=e33]:
        - strong [ref=e35]: 기본 surface
        - code [ref=e36]: "#18181c"
        - generic [ref=e37]: "--ac-surface"
      - generic [ref=e38]:
        - strong [ref=e40]: Control
        - code [ref=e41]: "#303037"
        - generic [ref=e42]: "--ac-control"
      - generic [ref=e43]:
        - strong [ref=e45]: 본문
        - code [ref=e46]: "#f4f4f8"
        - generic [ref=e47]: "--ac-text"
      - generic [ref=e48]:
        - strong [ref=e50]: 보조
        - code [ref=e51]: "#b6b6bf"
        - generic [ref=e52]: "--ac-muted"
      - generic [ref=e53]:
        - strong [ref=e55]: 확인됨
        - code [ref=e56]: "#a7e3bf"
        - generic [ref=e57]: "--ac-confirmed"
      - generic [ref=e58]:
        - strong [ref=e60]: 진행 중
        - code [ref=e61]: "#f2a541"
        - generic [ref=e62]: "--ac-pending"
      - generic [ref=e63]:
        - strong [ref=e65]: 일반 정보
        - code [ref=e66]: "#6c8ef5"
        - generic [ref=e67]: "--ac-info"
      - generic [ref=e68]:
        - strong [ref=e70]: 주의·실패
        - code [ref=e71]: "#ffb39c"
        - generic [ref=e72]: "--ac-attention"
      - generic [ref=e73]:
        - strong [ref=e75]: 차량 상단 bar
        - code [ref=e76]: "#131417"
        - generic [ref=e77]: "--ac-ivi-surface"
      - generic [ref=e78]:
        - strong [ref=e80]: 통신·외부 온도
        - code [ref=e81]: "#ffffffa3"
        - generic [ref=e82]: "--ac-ivi-muted"
      - generic [ref=e83]:
        - strong [ref=e85]: 사고 대응 mode
        - code [ref=e86]: "#f2a541"
        - generic [ref=e87]: "--ac-mode-amber"
  - region "Surface components" [ref=e88]:
    - generic [ref=e89]:
      - generic [ref=e90]: "02"
      - heading "빛과 깊이" [level=2] [ref=e91]
      - paragraph [ref=e92]: Grain 12% · CA 1px. 글자와 icon은 선명하게.
      - button "알림 시연" [ref=e93] [cursor=pointer]
    - generic [ref=e94]:
      - region "통화 surface" [ref=e95]:
        - generic [ref=e96]: 119 긴급 통화
        - paragraph [ref=e100]: "119"
        - heading "통화 연결됨" [level=3] [ref=e101]
        - paragraph [ref=e131]: 구호 접수 미확인
      - region "안내 surface" [ref=e132]:
        - generic [ref=e133]: 움직일 수 있으면
        - heading "가드레일 밖으로 대피하세요" [level=3] [ref=e134]: 가드레일 밖으로대피하세요
        - paragraph [ref=e135]: 안전한 곳에서 기다리세요.
  - region "Interactive components" [ref=e136]:
    - generic [ref=e137]:
      - generic [ref=e138]: "03"
      - heading "행동과 상태" [level=2] [ref=e139]
      - paragraph [ref=e140]: 차량 touch target 64px · 실제 mobile 48px · Keyboard focus · Reduced motion.
    - generic [ref=e141]:
      - generic [ref=e142]:
        - generic [ref=e143]: 미확인
        - generic [ref=e148]: 확인 중
        - generic [ref=e153]: 접수 확인
        - generic [ref=e157]: 전송 실패
        - generic [ref=e161]: 보류함
        - generic [ref=e164]: 일반 정보
      - generic [ref=e168]:
        - button "말로 기록하기" [ref=e169] [cursor=pointer]
        - button "직접 입력" [ref=e173] [cursor=pointer]
        - button "기록 저장" [disabled] [ref=e174]
      - generic [ref=e175]:
        - text: 기억나는 내용
        - textbox "기억나는 내용" [ref=e176]:
          - /placeholder: 확실한 내용만 남겨주세요
  - generic [ref=e177]:
    - generic [ref=e178]:
      - generic [ref=e179]: "04"
      - heading "Typography와 공간" [level=2] [ref=e180]
    - generic [ref=e181]:
      - generic [ref=e182]:
        - generic [ref=e183]: Asta · 400 / 600 / 700
        - heading "지금 필요한 행동을, 한눈에." [level=2] [ref=e184]
        - paragraph [ref=e185]: 2560px IVI 본문 26px · label 24px. 작은 화면 하한 본문 18px · 보조 15px · 상태 label 14px. 한국어 단어를 유지하고 긴 내용은 자연스럽게 이어짐.
      - paragraph [ref=e186]: Card 28px · Control 16px · Gap 16px · 여백 24–32px
      - paragraph [ref=e187]: IVI 상단 bar · 2560×72 기준 Asta 26/34 · 좌우 여백 56px · 작은 화면에서는 사고 대응 mode를 다음 행에 표시.
  - region "Response layout preview" [ref=e188]:
    - generic [ref=e189]:
      - generic [ref=e190]: "05"
      - heading "Three cells · 실제 내용과 공간" [level=2] [ref=e191]
      - button "긴 문구 보기" [ref=e192] [cursor=pointer]
    - generic [ref=e193]:
      - generic [ref=e194]:
        - text: Scenario
        - combobox "Scenario" [ref=e195]:
          - option "SC01 · 부상 있음" [selected]
          - option "SC02 · 차량 이동 불가"
          - option "SC03 · 응답 미확인"
          - option "SC04 · 전송 보류·거절"
          - option "SC05 · 접수 미확인"
      - generic [ref=e196]:
        - text: State
        - combobox "State" [ref=e197]:
          - option "연결 대기"
          - option "연결 취소"
          - option "자동 연결"
          - option "연결 중"
          - option "통화 연결" [selected]
          - option "연결 실패"
          - option "구호 접수"
          - option "현장 도착"
          - option "구호 인계"
          - option "사고 기록"
          - option "기록 저장"
          - option "무응답 통화"
          - option "무응답 연결 실패"
          - option "무응답 구호 접수"
          - option "무응답 구호 인계"
      - link "이 장면 조작하기" [ref=e198] [cursor=pointer]:
        - /url: /?study=emergency&scenario=SC01&scene=connected
    - region "시각 중심 사고 대응" [ref=e199]:
      - generic [ref=e201]:
        - generic [ref=e204]:
          - generic [ref=e205]:
            - heading "충돌 감지 · 부상 있음" [level=2] [ref=e210]
            - button "음성 안내 듣기" [ref=e211] [cursor=pointer]
          - generic [ref=e216]:
            - generic [ref=e217]:
              - term [ref=e218]: 운전자 조작
              - definition [ref=e219]:
                - generic [ref=e220]: 미확인
            - generic [ref=e225]:
              - term [ref=e226]: 이동 경로
              - definition [ref=e227]:
                - generic [ref=e228]: 미확인
        - generic [ref=e235]:
          - generic [ref=e236]: 긴급 통화
          - generic [aria-hidden] [ref=e240]: "119"
          - heading "119 통화 연결됨" [level=1] [ref=e242]
        - generic [ref=e274]:
          - paragraph [ref=e278]: 움직일 수 있으면
          - heading "가드레일 밖으로 대피하세요" [level=2] [ref=e279]
        - generic "기관별 요청 상태" [ref=e281]:
          - generic [ref=e282]:
            - term [ref=e283]: 구호
            - definition [ref=e284]:
              - strong [ref=e285]:
                - generic [ref=e291]:
                  - generic [ref=e292]: 통화 연결
                  - generic [ref=e293]:
                    - generic [ref=e294]: ·
                    - text: 접수 미확인
          - generic [ref=e295]:
            - term [ref=e296]: 차량 지원
            - definition [ref=e297]:
              - strong [ref=e298]:
                - generic [ref=e299]: 요청 전
          - generic [ref=e306]:
            - term [ref=e307]: 보험사
            - definition [ref=e308]:
              - strong [ref=e309]:
                - generic [ref=e310]: 요청 전
        - generic [ref=e318]:
          - heading "위치 확인 중" [level=2] [ref=e322]
          - paragraph [ref=e323]: 아직 안내 지점이 확인되지 않았어요.
        - button "사고 기록 남기기" [ref=e326] [cursor=pointer]
  - region "Vehicle contour preview" [ref=e327]:
    - generic [ref=e328]:
      - generic [ref=e329]: "06"
      - heading "B / Contour · 차량 상태" [level=2] [ref=e330]
      - link "차량 상태 시안 열기" [ref=e331] [cursor=pointer]:
        - /url: /?study=vehicle
    - navigation "차량 상황 page" [ref=e332]:
      - link "전방 시점" [ref=e333] [cursor=pointer]:
        - /url: /?study=surroundings&view=front
      - link "현재 주변" [ref=e334] [cursor=pointer]:
        - /url: /?study=surroundings&view=current
      - link "사고 재생" [ref=e335] [cursor=pointer]:
        - /url: /?study=surroundings&view=replay
    - generic [ref=e337]:
      - generic [ref=e338]:
        - generic [ref=e339]:
          - text: 내 차량
          - heading "차량 상태" [level=2] [ref=e340]
        - generic [ref=e341]: 차량 전방
      - generic [ref=e344]:
        - img "충격 방향 미확인" [ref=e345]
        - generic [ref=e366]:
          - button "충격 방향 자세히 보기" [ref=e367] [cursor=pointer]:
            - generic [ref=e368]: 충격 방향
            - strong [ref=e371]: 미확인
          - button "비상등 자세히 보기" [ref=e374] [cursor=pointer]:
            - generic [ref=e375]: 비상등
            - strong [ref=e378]: 미확인
          - button "트렁크 자세히 보기" [ref=e381] [cursor=pointer]:
            - generic [ref=e382]: 트렁크
            - strong [ref=e385]: 미확인
      - generic [ref=e388]:
        - generic [ref=e389]: 차량 이동
        - generic [ref=e390]: 가능 여부 미확인
  - region "Journey workspace preview" [ref=e395]:
    - generic [ref=e396]:
      - generic [ref=e397]: "07"
      - heading "전체 여정 · 실제 component" [level=2] [ref=e398]
      - paragraph [ref=e399]: 시연 상황을 선택해 입력·검토·전송·복귀까지 조작.
    - generic [ref=e400]:
      - region "시연 설정" [ref=e402]:
        - generic [ref=e403]:
          - text: 시연 상황
          - combobox "시연 상황" [ref=e404]:
            - option "사고 대응부터 후속 처리까지" [selected]
            - option "응답 없음과 늦은 응답"
            - option "차량 이동 불가"
            - option "자료 없이 이어가기"
            - option "일부 자료만 확보"
            - option "보험사 전송 거절 유지"
            - option "중단 중 접수 결과 도착"
            - option "과거 요청의 늦은 결과"
        - button "이 상황으로 시작" [ref=e405] [cursor=pointer]
        - generic [ref=e406]:
          - text: 음성 입력
          - combobox "음성 입력" [ref=e407]:
            - option "이 기기 microphone" [selected]
            - option "준비된 음성 sample"
      - generic [ref=e408]:
        - heading "상황을 선택해 여정을 시작하세요" [level=2] [ref=e412]
        - paragraph [ref=e413]: 기록은 이 browser에만 보관돼요.
```

# Test source

```ts
  1   | import {expect,test} from '@playwright/test'
  2   | import emergencyGuidance from '../src/audio/emergency-guidance.json' with { type: 'json' }
  3   | 
  4   | declare global {interface Window { audioCalls:{src:string;paused:boolean;ended:boolean;fail:boolean}[]; audioFails:boolean; finishAudio:()=>void }}
  5   | function fakeAudio(){
  6   |   window.audioCalls=[];window.audioFails=false
  7   |   class Playback extends EventTarget {
  8   |     src:string;currentTime=0;preload='';record:{src:string;paused:boolean;ended:boolean;fail:boolean}
  9   |     constructor(src=''){super();this.src=src;this.record={src,paused:false,ended:false,fail:window.audioFails};window.audioCalls.push(this.record);window.finishAudio=()=>{this.record.ended=true;this.dispatchEvent(new Event('ended'))}}
  10  |     play(){if(this.record.fail)return Promise.reject(new Error('unavailable'));this.dispatchEvent(new Event('playing'));return Promise.resolve()}
  11  |     pause(){this.record.paused=true} load(){} removeAttribute(){}
  12  |   }
  13  |   Object.defineProperty(window,'Audio',{value:Playback})
  14  | }
  15  | for(const reason of ['scene','pagehide','hidden'] as const)test(`guidance stops on ${reason} and cannot overlap`,async({page})=>{
  16  |  await page.addInitScript(fakeAudio);await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  17  |  await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
  18  |  await expect.poll(()=>page.evaluate(()=>window.audioCalls.length)).toBe(1)
  19  |  expect(await page.evaluate(()=>window.audioCalls[0].src)).toMatch(/guidance-audio\/[^/]+\.mp3$/)
  20  |  await expect(page.getByRole('button',{name:'음성 안내 중지',exact:true})).toBeVisible()
  21  |  if(reason==='scene')await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  22  |  if(reason==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')))
  23  |  if(reason==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
  24  |  expect(await page.evaluate(()=>window.audioCalls[0].paused)).toBe(true)
  25  | })
  26  | test('asset failure keeps script available and retry replaces playback',async({page})=>{
  27  |  await page.addInitScript(fakeAudio);await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  28  |  await page.evaluate(()=>{window.audioFails=true});await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
  29  |  await expect(page.getByRole('status').filter({hasText:'음성 재생을 사용할 수 없어요'})).toContainText('구호 접수는 아직 미확인')
  30  |  await page.evaluate(()=>{window.audioFails=false});await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
  31  |  await expect(page.getByRole('button',{name:'음성 안내 중지',exact:true})).toBeVisible()
  32  |  expect(await page.evaluate(()=>window.audioCalls.filter(a=>!a.paused&&!a.ended).length)).toBe(1)
  33  |  await page.evaluate(()=>window.finishAudio());await expect(page.getByRole('button',{name:'음성 안내 듣기',exact:true})).toBeVisible()
  34  | })
  35  | test('journey tasks use JaeGyu and stop when their retained panel becomes hidden',async({page})=>{
  36  |  await page.addInitScript(fakeAudio);await page.goto('/?study=journey&fixture=partial-evidence')
  37  |  await page.getByRole('button',{name:'이 상황으로 시작',exact:true}).click();await page.getByRole('button',{name:'사고 기록 남기기',exact:true}).click()
  38  |  await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).filter({visible:true}).click()
  39  |  await expect.poll(()=>page.evaluate(()=>window.audioCalls.length)).toBe(1)
  40  |  await page.getByRole('button',{name:'내용 확인으로',exact:true}).click()
  41  |  expect(await page.evaluate(()=>window.audioCalls[0].paused)).toBe(true)
  42  |  await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).filter({visible:true}).click()
  43  |  expect(await page.evaluate(()=>window.audioCalls.filter(a=>!a.paused&&!a.ended).length)).toBe(1)
  44  | })
  45  | test('every scene, journey and runtime script has an exact static speech asset',async({page})=>{
  46  |  await page.goto('/?study=design-system')
  47  |  // Resolve through the browser's Vite graph to exercise the runtime lookup rather than a Node copy.
  48  |  const result=await page.evaluate(async()=>{
  49  |   const sessionPath='/src/emergency/session.ts',audioPath='/src/audio/manifest.ts',journeyPath='/src/audio/journey-guidance.json',variantsPath='/src/audio/emergency-guidance.json'
  50  |   const {manifest}=await import(sessionPath);const {guidanceAsset}=await import(audioPath)
  51  |   const journey=(await import(journeyPath)).default,variants=(await import(variantsPath)).default
  52  |   const scripts=[...manifest.scenarios.flatMap((s:any)=>s.states.map((state:any)=>state.voice)),...Object.values(journey),...Object.values(variants)]
  53  |   return scripts.filter(text=>!guidanceAsset(text))
> 54  |  });expect(result).toEqual([])
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  55  | })
  56  | 
  57  | test('call spectrum pauses while the document is hidden',async({page})=>{
  58  |  await page.goto('/?study=emergency&scenario=SC01&scene=connected')
  59  |  const spectrum=page.locator('.ac-call-content .ac-spectrum')
  60  |  await spectrum.scrollIntoViewIfNeeded();await expect(spectrum).toHaveAttribute('data-active','true')
  61  |  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
  62  |  await expect(spectrum).toHaveAttribute('data-active','false')
  63  | })
  64  | 
  65  | test('browser decodes the actual JaeGyu asset and stops it on demand',async({page})=>{
  66  |  await page.addInitScript(()=>{const AudioClass=window.Audio;Object.defineProperty(window,'Audio',{value:class extends AudioClass{constructor(src?:string){super(src);Object.assign(window,{actualGuide:this})}}})})
  67  |  await page.goto('/?study=emergency&scenario=SC01&scene=connected');await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
  68  |  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.currentTime)).toBeGreaterThan(.1)
  69  |  await page.getByRole('button',{name:'음성 안내 중지',exact:true}).click()
  70  |  expect(await page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.paused)).toBe(true)
  71  | })
  72  | 
  73  | for(const [id,text]of Object.entries(emergencyGuidance))test(`actual runtime asset ${id} has exact hashes and plays in the browser`,async({page})=>{
  74  |  await page.addInitScript(()=>{
  75  |   const AudioClass=window.Audio
  76  |   Object.defineProperty(window,'Audio',{value:class extends AudioClass{constructor(src?:string){super(src);Object.assign(window,{actualGuide:this})}}})
  77  |  })
  78  |  const scene=id==='record_storage_failed'?'record_saved':id==='deferred_storage_failed'?'deferred':'support'
  79  |  const scenario=id==='record_storage_failed'?'SC02':'SC04'
  80  |  await page.goto(`/?study=emergency&scenario=${scenario}&scene=${scene}`)
  81  |  // Seed the real versioned session, then let EmergencyStudy restore it and select the script.
  82  |  await page.evaluate(async({id,scene,scenario})=>{
  83  |   const path='/src/emergency/session.ts';const {createSession,storageKey}=await import(path)
  84  |   const session=createSession(scenario,scene)
  85  |   if(id==='insurance_unconfirmed')session.requests.insurance='unknown'
  86  |   if(id==='insurance_not_received')session.requests.insurance='not_received'
  87  |   localStorage.setItem(storageKey(scenario),JSON.stringify(session))
  88  |  },{id,scene,scenario})
  89  |  if(id.endsWith('storage_failed'))await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')}})
  90  |  await page.reload()
  91  |  await expect(page.locator('.emergency-screen')).toContainText(text)
  92  |  // Asset lookup and crypto run in the browser, where exact runtime text is the public lookup contract.
  93  |  const asset=await page.evaluate(async text=>{
  94  |   const path='/src/audio/manifest.ts';const {guidanceAsset}=await import(path)
  95  |   const asset=guidanceAsset(text);if(!asset)return null
  96  |   const digest=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('')
  97  |   const response=await fetch(asset.path);if(!response.ok)throw new Error(`Missing asset: ${asset.path}`)
  98  |   return {scriptHash:asset.scriptHash,actualScriptHash:await digest(new TextEncoder().encode(text)),audioHash:asset.audioHash,actualAudioHash:await digest(await response.arrayBuffer()),duration:asset.duration}
  99  |  },text)
  100 |  expect(asset,`Required real JaeGyu asset missing for ${id}`).not.toBeNull()
  101 |  expect(asset!.actualScriptHash).toBe(asset!.scriptHash);expect(asset!.actualAudioHash).toBe(asset!.audioHash)
  102 |  expect(asset!.duration).toBeGreaterThan(0)
  103 |  await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
  104 |  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.currentTime)).toBeGreaterThan(.1)
  105 |  await page.getByRole('button',{name:'음성 안내 중지',exact:true}).click()
  106 |  expect(await page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.paused)).toBe(true)
  107 | })
  108 | 
```