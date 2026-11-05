# 사고 대응 지원 · Design prototype

현재 검토 대상은 [C · Satin을 적용한 긴급 상황 preview](http://127.0.0.1:5173/?study=emergency&material=satin)다. [상황 spec](../../specs/emergency-experience/principles.md)을 직접 읽어 부상·응답 없음·접수 미확인의 3개 scenario, 9개 장면을 보여준다. Source graph와 미결정 사항을 `현재 장면 spec`에서 확인할 수 있다.

`기존 flat / C · Satin`으로 같은 장면에서 재질을 비교한다. 표면 강도는 70%로 시작하며 재질을 바꿔도 장면·요청 상태·시연 중단 여부는 유지된다. 강도는 새로고침하면 초기화되고 재질과 장면은 URL로 재현한다. 왼쪽에 highlight를 두고 행동 영역과 지원 현황의 배경 밝기를 낮췄다. Native app에는 적용하지 않았다.

이전 [Optical materials PoC](http://127.0.0.1:5173/studies/optical-materials.html?view=compare)의 A/B/C 비교와 C 선택 기록은 보존했다. [실행 방법과 구현 범위](public/studies/README.md)를 참고한다.

선행 비교안도 보존한다. `focus`는 행동 중심, `context`는 상황 중심이며 사용자가 A를 선택했다. 이후 [네 design 도구 적용안](http://127.0.0.1:5173/?study=tools)을 만들었다. 사용자가 긴급 상황의 읽기 부담을 지적하여 시각 indicator 중심 storyboard로 범위를 발전시켰다.

Node.js 22.12 이상이 필요하다. 이 작업 환경에서는 Node.js 24.4.1로 확인하였다.

```sh
cd prototype/web
npm ci
npm run dev
```

[Storyboard](http://127.0.0.1:5173/?study=emergency)에서 scenario를 선택하고 화면의 주 행동을 눌러본다. `외부 결과 시연`은 가상의 연결·접수 결과를 공급한다. 장면을 직접 선택해 비교할 수도 있다. 일시 중단·재개는 현재 시연 장면을 유지하며, 실제 외부 요청의 중단·취소를 뜻하지 않는다. URL에 scenario·scene을 저장한다.

`음성 안내 듣기`는 browser TTS를 사용한다. 자동 재생하지 않으며 장면 변경·중단 시 취소한다. 재생을 사용할 수 없으면 음성 원고를 표시한다.

[네 도구 비교](http://127.0.0.1:5173/?study=tools)는 이름 숨김·공개와 두 화면 비교를 제공한다. [행동 중심](http://127.0.0.1:5173/?view=focus), [상황 중심](http://127.0.0.1:5173/?view=context), [Design 기준](http://127.0.0.1:5173/?catalog)도 열 수 있다.

1440 × 810 CSS px는 검토용 canvas다. Browser 크기에 맞춰 축소하며 `원래 크기`로 전체 크기를 확인할 수 있다. Mobile에서도 review control을 제공하지만 차량 화면을 mobile app으로 재배치하지 않는다.

## 확인

```sh
npm run check
npm run test:ui
```

Browser test는 설치된 Google Chrome을 사용한다. 기존 비교 동작과 새 storyboard의 미확인·기관별 상태, URL fallback, keyboard focus, 중단·재개, 음성 lifecycle과 실패 fallback을 검사한다. Manifest 검사는 repo root에서 `node --test specs/emergency-experience/manifest.test.mjs`로 실행한다.

`evidence/emergency/`에는 9개 장면의 실제 browser screenshot과 검토 화면이 있다. [이해도 평가 절차](../../specs/emergency-experience/acceptance.md)는 아직 수행하지 않았다. [네 도구 적용 근거](../../docs/reviews/design-tools/README.md)도 기록하였다.

`evidence/emergency-satin/`에는 C를 적용한 9개 장면, 원본 비교, 작은 화면과 contrast 측정 결과를 기록한다. Shader는 정지 상태이고 강도를 바꿀 때만 다시 그린다. WebGL 2가 없거나 context가 사라지면 기본 배경으로 돌아가고 검토 UI에 이를 표시한다. `npm run test:ui -- tests/emergency.spec.ts tests/emergency-satin.spec.ts`로 flow·재질 전환·fallback을 함께 확인한다.

## 범위

실제 전화·정보 전송·차량 신호·기관 연계를 수행하지 않는다. 전체 E2E, Pleos 적합성, native 재현은 아직 검증하지 않았다. Source 출처와 변경은 [SOURCES.md](SOURCES.md), 선택과 검증은 [검토 기록](../../docs/reviews/cult-design-poc.md)에 기록한다.
