# Four-tool design comparison

## Shared brief

현대차 제안용 사고 후 대응 지원 app의 첫 화면을 비교한다. 최종 app은 Kotlin + Compose이며, 이 React prototype은 시각과 interaction을 검토하는 용도이다.

- 기존 `FocusView`가 baseline이다. 사용자가 선택한 행동 중심 방향을 유지한다.
- Impeccable, UI UX Pro Max, Hallmark, anti-slop을 각각 독립 적용한다. 각 도구의 결과는 해당 도구를 적용한 이번 구현이며, 도구 전체의 성능을 대표하지 않는다.
- 동일한 `cases.urgent`를 사용한다. 부상 있음 / 고속도로 / 차량 이동 가능 / 조작·경로 미확인의 네 사실과 기관별 요청 상태를 그대로 유지한다.
- 제목, 안내 문구, CTA, 이동 전 확인 문구는 바꾸지 않는다. 실제 전화·전송 기능을 추가하지 않는다.
- `Guidance`의 TransitionPanel, focus 처리, reduced motion, 펼침 상태를 공유한다. 화면 전환으로 기관 요청 상태가 변하면 안 된다.
- 1440 × 810 canvas, Asta font, 기존 dark palette와 semantic color를 공통 기반으로 삼는다. CSS px는 차량 dp로 검증된 값이 아니다.
- 행동 안내를 우선한다. layout, typography, density, surface, 간격과 장식의 사용은 도구마다 독립 판단한다.
- 각 구현은 자신의 wrapper에 CSS를 한정한다. baseline과 다른 구현의 CSS를 바꾸지 않는다.
- 같은 시연 상황과 두 상태(접힘·펼침)를 실제 browser에서 확인한다.

## Comparison

도구 이름을 숨긴 네 후보를 번호로 전환하고, 같은 상황의 두 후보를 나란히 볼 수 있게 한다. baseline은 별도로 열 수 있다. 이름 공개 기능과 URL 재현을 제공한다. 선택 결과는 사용자 판단이며 통계적 A/B 실험으로 표현하지 않는다.

## Scope

원본 flow, native app, backend, production routing은 바꾸지 않는다. 범위는 독립 화면 네 개, 비교 UI, 동작 검증, 도구별 적용 근거와 browser 증거이다.
