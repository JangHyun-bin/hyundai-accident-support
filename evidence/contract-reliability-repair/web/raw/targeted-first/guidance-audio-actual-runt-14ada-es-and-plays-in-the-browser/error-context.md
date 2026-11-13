# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guidance-audio.spec.ts >> actual runtime asset insurance_not_received has exact hashes and plays in the browser
- Location: tests/guidance-audio.spec.ts:73:57

# Error details

```
Error: Required real JaeGyu asset missing for insurance_not_received

expect(received).not.toBeNull()

Received: null
```

# Page snapshot

```yaml
- main [ref=f1e3]:
  - generic [ref=f1e4]:
    - link "AFTER / CARE Emergency storyboard" [ref=f1e5] [cursor=pointer]:
      - /url: /?study=emergency
      - text: AFTER / CARE
      - generic [ref=f1e6]: Emergency storyboard
    - generic [ref=f1e7]:
      - generic [ref=f1e8]: 가상 scenario · 실제 전화·전송 없음
      - generic [ref=f1e9]: 안전 안내 시안 · 승인 전
      - link "Design system" [ref=f1e10] [cursor=pointer]:
        - /url: /?study=design-system
      - link "이전 design 비교" [ref=f1e11] [cursor=pointer]:
        - /url: /?study=tools
  - generic [ref=f1e14]:
    - generic [ref=f1e15]:
      - heading "상황을 보고, 다음 행동으로." [level=1] [ref=f1e16]
      - paragraph [ref=f1e17]: 장면을 바꿔 핵심 상황·행동·미확인이 어떻게 전달되는지 확인해 보세요.
    - button "현재 장면 spec" [ref=f1e18] [cursor=pointer]
  - navigation "상황 선택" [ref=f1e23]:
    - button "부상 있음" [ref=f1e24] [cursor=pointer]:
      - generic [ref=f1e25]: SC01
      - strong [ref=f1e26]: 부상 있음
    - button "차량 이동 불가" [ref=f1e27] [cursor=pointer]:
      - generic [ref=f1e28]: SC02
      - strong [ref=f1e29]: 차량 이동 불가
    - button "응답 미확인" [ref=f1e30] [cursor=pointer]:
      - generic [ref=f1e31]: SC03
      - strong [ref=f1e32]: 응답 미확인
    - button "전송 보류·거절" [pressed] [ref=f1e33] [cursor=pointer]:
      - generic [ref=f1e34]: SC04
      - strong [ref=f1e35]: 전송 보류·거절
    - button "접수 미확인" [ref=f1e36] [cursor=pointer]:
      - generic [ref=f1e37]: SC05
      - strong [ref=f1e38]: 접수 미확인
  - generic [ref=f1e39]:
    - paragraph [ref=f1e40]: "시작 상황: 사고 기록 초안 확인 · 보험사 전송 범위 검토 · 구호·차량 지원은 별도"
    - generic [ref=f1e41]:
      - button "3초 보기" [ref=f1e42] [cursor=pointer]
      - button "시연 일시 중단" [ref=f1e46] [cursor=pointer]
  - generic [ref=f1e51]:
    - region "차량 상태 표시" [ref=f1e52]:
      - time [ref=f1e53]: 오후 9:12
      - generic [ref=f1e54]: 차분 · 사고 대응 모드
      - generic "5G, 외부 온도 18°C" [ref=f1e57]: 5G 18°C
    - region "시각 중심 사고 대응" [ref=f1e59]:
      - generic [ref=f1e61]:
        - generic [ref=f1e64]:
          - generic [ref=f1e65]:
            - heading "사고 기록 · 전송 보류" [level=2] [ref=f1e70]
            - button "음성 안내 듣기" [ref=f1e71] [cursor=pointer]
          - generic [ref=f1e76]:
            - generic [ref=f1e77]:
              - term [ref=f1e78]: 사고 기록
              - definition [ref=f1e79]:
                - generic [ref=f1e80]: 초안 있음
            - generic [ref=f1e84]:
              - term [ref=f1e85]: 전송 승인
              - definition [ref=f1e86]:
                - generic [ref=f1e87]: 승인 전
        - generic [ref=f1e93]:
          - generic [ref=f1e94]:
            - heading "다른 지원은 계속 진행돼요" [level=1] [ref=f1e95]
            - paragraph [ref=f1e96]: 보험 접수가 되지 않은 것을 확인했어요. 다시 보내려면 전송 범위를 확인하고 새로 승인해 주세요. 구호·차량 지원은 계속 진행돼요.
          - generic [ref=f1e98]:
            - generic [ref=f1e99]:
              - term [ref=f1e100]: 구호·차량 지원
              - definition [ref=f1e101]: 접수 확인 · 도착은 별도 확인
            - generic [ref=f1e102]:
              - term [ref=f1e103]: 보험사 전송
              - definition [ref=f1e104]: 미접수 확인
          - generic [ref=f1e105]:
            - button "보험사 전송 다시 검토" [ref=f1e106] [cursor=pointer]
            - button "나중에 이어하기" [ref=f1e107] [cursor=pointer]
        - heading "안전한 곳에서 기다리세요" [level=2] [ref=f1e114]
        - generic "기관별 요청 상태" [ref=f1e116]:
          - generic [ref=f1e117]:
            - term [ref=f1e118]: 구호
            - definition [ref=f1e119]:
              - strong [ref=f1e120]:
                - generic [ref=f1e121]: 접수 확인
          - generic [ref=f1e127]:
            - term [ref=f1e128]: 차량 지원
            - definition [ref=f1e129]:
              - strong [ref=f1e130]:
                - generic [ref=f1e131]: 접수 확인
          - generic [ref=f1e137]:
            - term [ref=f1e138]: 보험사
            - definition [ref=f1e139]:
              - strong [ref=f1e140]:
                - generic [ref=f1e141]: 미접수 확인
        - generic [ref=f1e148]:
          - heading "위치 확인 중" [level=2] [ref=f1e152]
          - paragraph [ref=f1e153]: 아직 안내 지점이 확인되지 않았어요.
    - generic [aria-hidden] [ref=f1e155]:
      - generic [ref=f1e156]: 22.5°
      - generic [ref=f1e168]: 22.5°
  - status
  - generic [ref=f1e169]:
    - navigation "장면 선택" [ref=f1e170]:
      - button "기록 확인" [ref=f1e171] [cursor=pointer]
      - button "기록 정정" [ref=f1e176] [cursor=pointer]
      - button "전송 범위" [ref=f1e181] [cursor=pointer]
      - button "전송 보류" [ref=f1e186] [cursor=pointer]
      - button "전송 거절" [ref=f1e191] [cursor=pointer]
      - button "전송 중" [ref=f1e196] [cursor=pointer]
      - button "전송 실패" [ref=f1e201] [cursor=pointer]
      - button "접수 미확인" [ref=f1e205] [cursor=pointer]
      - button "결과 조회" [ref=f1e210] [cursor=pointer]
      - button "보험 접수" [ref=f1e215] [cursor=pointer]
      - button "남은 지원 현재" [pressed] [ref=f1e220] [cursor=pointer]:
        - generic [ref=f1e224]: 남은 지원
        - generic [ref=f1e225]: 현재
      - button "보관 후 중단" [ref=f1e226] [cursor=pointer]
    - generic [ref=f1e231]:
      - generic [ref=f1e232]: 외부 결과 시연
      - paragraph [ref=f1e233]: 다른 장면을 선택해 비교할 수 있어요.
  - generic [ref=f1e234]:
    - generic [ref=f1e235]: Spec v0.2 · 5 scenarios / 60 scenes
    - generic [ref=f1e236]: 이해도 평가 전 · 실제 차량 동작 미검증
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
  54  |  });expect(result).toEqual([])
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
> 100 |  expect(asset,`Required real JaeGyu asset missing for ${id}`).not.toBeNull()
      |                                                                   ^ Error: Required real JaeGyu asset missing for insurance_not_received
  101 |  expect(asset!.actualScriptHash).toBe(asset!.scriptHash);expect(asset!.actualAudioHash).toBe(asset!.audioHash)
  102 |  expect(asset!.duration).toBeGreaterThan(0)
  103 |  await page.getByRole('button',{name:'음성 안내 듣기',exact:true}).click()
  104 |  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.currentTime)).toBeGreaterThan(.1)
  105 |  await page.getByRole('button',{name:'음성 안내 중지',exact:true}).click()
  106 |  expect(await page.evaluate(()=>(window as typeof window&{actualGuide:HTMLAudioElement}).actualGuide.paused)).toBe(true)
  107 | })
  108 | 
```