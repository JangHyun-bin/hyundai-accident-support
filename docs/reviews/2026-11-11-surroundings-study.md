# Contour 주변 상황·사고 playback 시안

사용자가 선택한 B / Contour의 차체를 유지하면서 주변 상황과 사고 당시의 움직임을 같은 공간에서 검토하는 시안. DEV route `/?study=surroundings`로 제공. 실제 차량 sensor, 사고 재구성, 기관 전송과 연결하지 않은 authored fixture 사용.

## 구현 범위

- 현재 주변: 정차한 내 차량과 상대 차량, 옆 차로의 통과 차량, 차선과 도로 경계. 시연 재생·일시정지와 신호 끊김·복원 지원. 신호가 끊기면 마지막 위치 유지.
- 사고 재생: 충돌 전 8초부터 이후 6초까지 재생, scrub, 0.5×/1×/2×, 처음으로, 충격 시점 이동, 현재로 복귀. 추정 구간은 차체·경로·timeline에서 구별.
- 차량 상세: 같은 SVG 차체를 확대. 부위 선택 시 차체를 옆으로 이동하고 충격 방향·비상등·트렁크 설명 제공. 상세는 현재 상태임을 명시. 사고 장면으로 돌아가면 재생 위치 유지.
- 오른쪽 안내: 현재 대응 상태 유지. 119 통화 연결과 구호 접수 미확인을 구분.
- 기존 Contour의 차체 geometry를 `ContourCar`로 추출. 부위 설명과 상태 의미도 기존 component에서 공유.

## 검증

- `npm run check`: TypeScript 및 Vite build 통과. 기존 main bundle 500 kB 경고 유지.
- `tests/surroundings-study.spec.ts`: 4개 통과. 재선택 후 animation 지속, 신호 중단·복원, replay 독립성, scrub와 추정 표시, 끝에서 정지, 확대 geometry, keyboard 복귀, reduced motion, viewport와 글자 크기 검증.
- `tests/vehicle-contour.spec.ts`: 기존 7개 통과. 공용 차체 추출 후 unknown·immobility 의미와 부위 상호작용 유지.
- 1920 / 1440 / 393 / 360 px, 기본 글자 및 200% 글자에서 상세 겹침·가로 overflow 없음 확인.
- localhost와 기존 Cloudflare URL에서 render 확인. 공개 route HTTP 200, 충격 표시 확인, browser page error 없음.
- 검증 중 SVG transform origin을 viewBox 원점으로 fix. 작은 화면 및 큰 글자에서는 상세를 차체 아래로 배치하도록 높이 계산 fix.

## 시안의 한계

움직임·충격 시점·추정 구간 모두 시각 검토용 예시이며 실제 관측의 confidence나 시간 정확도를 표현하지 않음. 실제 data adapter, 기록 저장, 실차 검증은 이 시안 범위 밖. 새 주변 view는 제품 기본 route에 적용하지 않음.

검토 image: `/tmp/surroundings-final-replay.png`, `/tmp/surroundings-final-detail.png`, `/tmp/surroundings-final-mobile.png`.

## 차량 비중 확대 후속 검토

사용자 feedback: 내 차량의 화면 내 비중이 작고 공간 활용이 부족함.

- 고정 600×600 viewBox를 실제 SVG 영역 크기로 변경. 넓은 영역에서 생기던 좌우 빈 공간 제거.
- 현재 주변 camera는 차체 길이 48%를 목표로 설정. 주변 차량의 경로가 잘리지 않도록 화면 폭에 따라 scale 제한. Replay는 진입 차량까지 포함하는 범위 사용.
- 현재 주변의 표시 영역 높이를 늘리고 하단 최소 높이를 204 px에서 80 px로 축소. 부위 상세는 표시 영역 높이의 78%를 목표로 확대.
- 1600×1050 viewport 관찰: SVG 영역 676×546 px, 내 차량 길이 260.77 px로 영역 높이의 47.76%. 이전 구성은 약 25%.
- 1920 / 1440 / 393 / 360 px 및 200% 글자에서 기본 차체 길이 42% 이상 확인. 상세 겹침·overflow 없이 관련 4개 test 통과. TypeScript·build 통과.
- 검토 image: `/tmp/surroundings-larger-current.png`, `/tmp/surroundings-larger-replay.png`, `/tmp/surroundings-larger-detail.png`.

## 접촉 강조 대안 및 trajectory 개선

사용자가 접촉 강조 여러 안과 더 부드러운 trajectory를 요청. 비교 시안 `prototype/web/impact-alternatives.html` 추가. A는 양쪽 접촉 contour, B는 차체에 붙는 anchor와 leader·부위 이름, C는 작은 soft light와 선명한 중심 표시. 비교 시안의 coral은 #FF816A. 기본 제품 scene의 접촉 표현은 선택 전까지 기존 방식 유지.

Trajectory 개선은 `/?study=surroundings`에도 반영. 차량 위치와 궤적이 같은 monotone cubic Hermite curve를 사용하며, waypoint별 접선 연속성을 유지. 마지막 waypoint에서 속도 0으로 정차. 4.8초 history를 시간에 따라 fading하고, 추정 구간은 dash 유지. Segment마다 dash가 처음부터 반복되지 않도록 누적 길이에 맞춰 phase 연결. 공용 차체 silhouette를 mask로 사용해 궤적이 차체 내부를 관통하지 않도록 처리.

검증: waypoint 오차 0, 각 구간에서 축별 overshoot 0, 수치 미분 간격 0.0001초에서 접선 변화 차이 최대 0.00578 미만. Path는 모두 cubic이며 NaN 없음. 관련 browser 검사 4개와 기존 Contour 검사 7개 통과. TypeScript·build 통과. 비교 시안 mobile 가로 overflow 없음, 공개 URL HTTP 200, browser page error 없음. Screenshot `/tmp/impact-alternatives-final.png`.

접촉 anchor와 경로는 authored fixture의 표현이며 실제 사고 좌표의 정확도를 검증한 결과가 아님. 실제 data가 방향만 제공하면 접촉 점으로 단정하지 않고 부위 범위로 표시하는 추가 설계 필요.

## A+B 선택 반영

사용자가 A 기본 표시 + 선택 시 B 설명 조합을 확정. 공용 `CareVehicleContact`와 contact accent token 추가 후 surroundings 시안에 연결.

- A: 양쪽 차체의 해당 contour 구간을 #FF816A로 강조. 차체 local 좌표에 붙여 이동·회전·확대에 함께 반응.
- B: 접촉 표시를 누르면 leader와 `접촉 기록 · 우측 전방` 설명 표시. Desktop에서는 간결한 annotation, 작은 화면에서는 차량 아래 정보 행 사용.
- Current에서는 접촉 기록 유지. Replay의 0초 이전에는 표시하지 않고 0초 이후에는 기록된 부위 표시 유지. Replay에서 설명을 열면 재생 일시정지.
- 닫기, 같은 표시 재선택, 바깥 클릭, Escape 지원. 닫기·Escape 후 원래 접촉 button으로 focus 복귀. 48×48 px touch target 유지.
- 실제 차체 SVG 좌표와 marker의 화면상 anchor 오차 0.000024 px 미만 관찰. 이는 rendering 정합성 검사이며 실제 사고 위치의 정확도 검증이 아님.
- 관련 browser 검사 6개, TypeScript·build 통과. 1920 / 1440 / 393 / 360 px 및 200% 글자에서 설명·legend 겹침이나 가로 overflow 없음. 공개 route에서 A+B 동작, HTTP 200, page error 없음 확인.
- Screenshot: `/tmp/contact-ab-default.png`, `/tmp/contact-ab-final.png`, `/tmp/contact-ab-mobile.png`.

## 내 차 상태를 기본으로 변경

협업자 의견을 반영해 내 차 상태를 기본 화면으로 설정. 주변 상황은 별도 button으로 진입하는 하위 view로 변경. 사용자 요청에 따라 기존 DEV study에 적용.

- 첫 화면에서 큰 차체와 충격 방향·비상등·트렁크 상태 표시. 차체 높이는 표시 영역의 78%를 목표로 유지. 이동 가능 여부 미확인은 하단에 표시.
- `주변 상황 보기` 하나로 현재 주변 진입. 같은 ContourCar를 유지하면서 camera가 멀어지고 차선·주변 차량이 나타나는 전환 사용.
- 주변 화면에 `내 차 상태로`와 `현재 주변 / 사고 재생` 배치. 기본 화면에는 재생 control을 표시하지 않음.
- 부위를 누르면 차체가 옆으로 이동하며 상세 표시. 닫기·Escape는 전체 항목으로 복귀. 기본 상태에서 Escape를 눌러도 주변 view로 전환하지 않음.
- 사고 재생에서 내 차 상태로 돌아오면 일시정지. 다시 주변에 진입하면 현재 view를 열고, 사고 재생을 선택하면 이전 재생 위치 유지.
- 차체의 coral 접촉 contour와 leader를 기본 상태에도 표시. Camera가 안정된 뒤 설명선과 항목이 나타나도록 순서 조정. Reduced motion에서는 지연 없이 전환.
- 초기 viewport 측정 전 camera를 그리지 않아 첫 진입의 불필요한 확대 움직임 방지. View 전환 시 제목·현재 주변 button으로 keyboard focus 이동.

검증: 관련 browser 검사 7개, TypeScript·Vite build 통과. 기본 화면 hierarchy, 같은 car 유지, camera framing, 부위 상세, 신호 중단, replay와 contact 동작 확인. 1920 / 1440 / 393 / 360 px 및 200% 글자에서 상세 겹침·가로 overflow 없음. 기존 main bundle 500 kB 경고 유지. Cloudflare URL에서 HTTP 200, 기본 vehicle view와 replay 진입, page error 없음 확인.

검토 image: `/tmp/vehicle-home.png`, `/tmp/vehicle-expanded.png`, `/tmp/vehicle-home-detail.png`, `/tmp/vehicle-home-mobile.png`.
