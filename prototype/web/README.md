# 사고 대응 지원 · Cult UI 비교 PoC

사고 직후의 동일한 가상 상황을 두 구조로 비교한다. `focus`는 행동 중심, `context`는 상황 중심이다. 사용자는 2026-11-05 `focus`를 선택하였다. 후속 상태 확장 전에 anti-slop 도구 조사를 진행한다.

Node.js 22.12 이상이 필요하다. 이 작업 환경에서는 Node.js 24.4.1로 확인하였다.

```sh
cd prototype/web
npm ci
npm run dev
```

[행동 중심](http://127.0.0.1:5173/?view=focus), [상황 중심](http://127.0.0.1:5173/?view=context), [Design 기준](http://127.0.0.1:5173/?catalog)을 연다. 아래 A/B button으로 구조를 전환한다. `도움 요청 안내 보기`와 `안내 접기`로 200 ms 전환을 비교한다. 구조 전환 중에도 안내의 열림 상태를 유지한다. 새로고침하면 초기화된다.

1440 × 810 CSS px는 검토용 canvas다. Browser 크기에 맞춰 축소하며 `원래 크기`로 전체 크기를 확인할 수 있다. Mobile에서도 review control을 제공하지만 차량 화면을 mobile app으로 재배치하지 않는다.

## 확인

```sh
npm run check
npm run test:ui
```

Browser test는 설치된 Google Chrome을 사용한다. 네 가지 검사는 동일 상황 유지, 안내 상태·keyboard focus 유지, 잘못된 URL 값의 기본 처리·작은 browser, laptop에서 비교 control의 표시를 확인한다. `evidence/`에는 실제 browser screenshot과 [전환 동영상](evidence/comparison.webm)이 있다.

## 범위

실제 전화·정보 전송·차량 신호·기관 연계를 수행하지 않는다. 전체 E2E, Pleos 적합성, native 재현은 아직 검증하지 않았다. Source 출처와 변경은 [SOURCES.md](SOURCES.md), 선택과 검증은 [검토 기록](../../docs/reviews/cult-design-poc.md)에 기록한다.
