# 사고 대응 지원 · Design prototype

현재 검토 대상은 [긴급 상황 storyboard](http://127.0.0.1:5173/?study=emergency)의 세 칸 화면(① 감지 / ② 차량 / ③ 나)이다. [상황 spec](../../specs/emergency-experience/principles.md)을 직접 읽어 SC01–SC05 전체 5개 scenario, 60개 장면을 보여준다. 차량 지원·사고 기록·전송 범위 승인·거절·보류·업무 중단·복원을 포함한다. 구호가 요청 전인 장면은 10초 countdown 뒤 구호만 자동 연결한다. `3초 보기`는 검토 UI를 숨기고 차량 화면만 3초 보여 준 뒤 가린다. Source graph와 미결정 사항을 `현재 장면 spec`에서 확인할 수 있다.

현재 사고 대응 화면은 Pleos dark basic scale·Asta·48×48 기반 flat glyph 사용. 금속 plate·각인·gradient·glow와 Satin 선택 제거. 이전 `material=satin` URL도 장면을 유지한 채 flat 화면으로 표시. Native app에는 미반영.

App 내부는 상단 상황 정보와 하단 대응 영역을 독립적인 rounded box 두 개로 분리. 두 box 사이 24px 여백, radius 32. 하단 box에는 통화·기관 상태·대피 안내 포함.

기관 상태는 3열 공통 header·본문 row 사용. `통화 연결`과 `접수 미확인`은 의미 단위로 두 줄 배치하며 각 열의 첫 상태 줄은 같은 높이. 단어 중간 줄바꿈·생략 없음.

이전 [Optical materials PoC](http://127.0.0.1:5173/studies/optical-materials.html?view=compare)의 A/B/C 비교와 C 선택 기록은 보존했다. [실행 방법과 구현 범위](public/studies/README.md)를 참고한다.

선행 비교안도 보존한다. `focus`는 행동 중심, `context`는 상황 중심이며 사용자가 A를 선택했다. 이후 [네 design 도구 적용안](http://127.0.0.1:5173/?study=tools)을 만들었다. 사용자가 긴급 상황의 읽기 부담을 지적하여 시각 indicator 중심 storyboard로 범위를 발전시켰다.

Node.js 22.12 이상이 필요하다. 이 작업 환경에서는 Node.js 24.4.1로 확인하였다.

```sh
cd prototype/web
npm ci
npm run dev
```

[Storyboard](http://127.0.0.1:5173/?study=emergency)에서 scenario를 선택하고 화면의 주 행동을 눌러본다. `외부 결과 시연`은 가상의 연결·접수 결과를 공급한다. 장면을 직접 선택해 비교할 수도 있다. 일시 중단·재개는 현재 시연 장면을 유지하며, 실제 외부 요청의 중단·취소를 뜻하지 않는다. URL에 scenario·scene을 저장한다.

`음성 안내 듣기`는 browser TTS를 사용한다. Countdown 진입 시 자동 안내를 시도하며, 장면 변경·중단 시 취소한다. 재생을 사용할 수 없으면 음성 원고를 표시한다.

[네 도구 비교](http://127.0.0.1:5173/?study=tools)는 이름 숨김·공개와 두 화면 비교를 제공한다. [행동 중심](http://127.0.0.1:5173/?view=focus), [상황 중심](http://127.0.0.1:5173/?view=context), [Design 기준](http://127.0.0.1:5173/?catalog)도 열 수 있다.

현재 Pleos 검토용 canvas는 2560 × 1440 CSS px이며 사고 대응 app과 내비 창은 각각 1232 × 1152로 같은 크기다. 두 rounded box 사이에 32px 여백을 두고 차량 상태와 공조/app 전환 bar는 상·하단에 분리한다. 이전 비교안의 canvas는 1440 × 810이다. Browser 크기에 맞춰 축소하며 `원래 크기`로 전체 크기를 확인할 수 있다. Mobile에서도 review control을 제공하지만 차량 화면을 mobile app으로 재배치하지 않는다.

## 확인

```sh
npm run check
npm run test:ui
```

Browser test는 설치된 Google Chrome을 사용한다. 기존 비교 동작과 새 storyboard의 미확인·기관별 상태, URL fallback, keyboard focus, 중단·재개, 음성 lifecycle과 실패 fallback을 검사한다. Manifest 검사는 repo root에서 `node --test specs/emergency-experience/manifest.test.mjs`로 실행한다.

`evidence/emergency-urgent/`에는 세 칸 구조의 12개 장면과 흑백 countdown 화면이 있다(2026-11-08). `evidence/emergency/`에는 이전 9개 장면의 실제 browser screenshot과 검토 화면이 있다. [이해도 평가 절차](../../specs/emergency-experience/acceptance.md)는 아직 수행하지 않았다. [네 도구 적용 근거](../../docs/reviews/design-tools/README.md)도 기록하였다.

`evidence/emergency-flat/`에는 현재 flat 화면과 mobile 검토 화면 기록. `tests/emergency-flat.spec.ts`는 모든 장면의 flat paint·기관별 row 정렬·상태 잘림과 과거 Satin URL 호환성을 검사. Glyph 대비·type scale·상태 전환은 기존 emergency tests에서 검증. `evidence/emergency-satin/`과 `evidence/emergency-glyphs/`의 금속 시안 capture는 과거 기록.

### 119 통화 표시

[통화 연결 장면](http://127.0.0.1:5173/?study=emergency&scenario=SC01&scene=connected)에는 112px phone glyph와 통화 상태 제목, 그 아래 가로 audio spectrum 표시. 사용자 결정으로 ribbon ring 제거 후 부제 대신 spectrum 적용. 31개의 단색 막대는 가상 반응이며 실제 audio 입력 없음. 검토 header에 시연임을 표시하고, 일시 중단·보기 가림에서는 정지하며 reduced motion에서는 정적 형태 유지. 연결 시도·접수 조회에는 나타나지 않으며, 통화 끊김 event 뒤에는 기존 연결 미확인 표시로 복귀.

`npm run test:ui -- tests/emergency-call-symbol.spec.ts`로 연결 확인·끊김 전환과 spectrum 중단·reduced motion 검증. `evidence/voice-field/`와 이전 design 문서는 폐기된 ribbon 시안의 과거 기록.

## End-to-end flow 영상 재생성

`npm run dev` 실행 상태에서 아래 명령으로 실제 Chrome motion을 녹화. Full Pleos view(2560×1440)와 app crop(현재 1232×1152)을 MP4로 출력. 무음·가상 시연이며 SC01–SC05 전체와 취소·실패·재시도·기록 입력·범위 변경·승인·보류·거절·중단·재개 경로 포함. 현재 app에 녹화용 layout·chapter card를 넣는 작업은 별도 browser context에만 적용.

```sh
npx playwright install ffmpeg
node scripts/record-emergency-flow.mjs /absolute/path/emergency-flow.mp4
```

기존 output은 덮어쓰지 않음. 같은 위치에 `-app.mp4`와 장면별 시각·검증 결과를 담은 `.json` 생성. FFmpeg·FFprobe·Google Chrome 필요.

## 범위

실제 전화·정보 전송·차량 신호·기관 연계를 수행하지 않는다. 실제 기관을 포함한 E2E, 공식 Pleos 적합성, 현재 화면의 Android 이식은 범위 밖이다. Source 출처와 변경은 [SOURCES.md](SOURCES.md), 선택과 검증은 [검토 기록](../../docs/reviews/cult-design-poc.md)에 기록한다.


## 전체 scenario · 2026-11-09

[현재 실행](http://127.0.0.1:5173/?study=emergency) · [Component catalog](http://127.0.0.1:5173/?study=emergency-catalog)

| Scenario | 구현 범위 |
| --- | --- |
| SC01 | 부상, countdown·취소·재연결, 무응답 중 통화 실패·연결·접수·인계, 사고 기록 |
| SC02 | 차량 이동 불가, 요청 내용 확인·승인, 전송 실패·재시도, 기록 보관, 접수·도착 |
| SC03 | 무응답과 부상·의식 미확인 유지, 위험 정보 갱신, 응답 전 구호 진행, 늦은 응답 |
| SC04 | 기록 정정, 수신처·목적·항목 선택, 보류·거절, 다른 지원 확인, 재승인·전송·접수 |
| SC05 | 기존 요청 조회, 업무 중단·복원, 중단 중 접수·인계, 미접수 후 재승인·재요청 |

제품의 `나중에 이어하기`는 진행 상태를 보존. 검토 영역의 `시연 일시 중단`은 animation·countdown을 멈추는 별개 control. 요청 identity와 전송 당시 승인 snapshot, draft, 기록, 독립된 기관 상태를 localStorage에 보존한다. 저장이 차단되면 경고를 표시하며 같은 화면 안의 상태만 유지한다.

같은 URL의 reload와 `?study=emergency&scenario=SC05` 진입은 저장된 진행을 복원. 다른 `scene` URL이나 검토 장면 선택은 명시적인 fixture 진입이다. 상단 scenario 선택은 해당 scenario를 처음부터 새 시연으로 시작한다. 실사용 재개용 URL에는 `scene`을 직접 지정하지 않는다.

검토 외부 event는 결과 입력이며 실제 기관 API가 아니다. 조회는 전송 횟수를 늘리지 않는다. 미접수/전송 실패가 확인된 경우만 새 승인으로 재요청한다. 운영 미결정 사항의 구현 가정은 [설계 문서](../../docs/superpowers/specs/2026-11-09-complete-scenarios-design.md)에 기록.

```sh
npm run test:ui -- tests/emergency-complete.spec.ts tests/emergency-visual.spec.ts --workers=2
```

모든 장면 desktop/mobile screenshot은 `evidence/emergency-complete/`. 하나의 output directory에 여러 Playwright process를 동시에 실행하지 않는다.
