# 119 통화 Voice field

사용자가 A 시안 선택 후 ribbon mesh 개선안을 확인하고 “응 이거 좋아. 이걸로 가자”로 승인한 결과를 Web prototype에 반영.

## Approaches

- A: 전화 표시를 중심으로 입체 ribbon mesh가 음성에 반응. 사용자 선택.
- B: 수평 Wave ribbon. 비교 후 미선택.
- C: Signal lens. 비교 후 미선택.

## 승인된 표현과 적용 범위

- 두 겹의 triangle mesh, 폭 `0.22`, 꼬임 `0.45`, 가상 음성 반응 `0.75`, 시점 `[-0.18, 0.6]`.
- 표면 normal·anisotropic highlight·depth test·약한 bloom 적용. 시안에서 artifact가 확인된 MSAA 경로는 제외.
- 기존 기관 상태 중 `rescue.status === connected`인 장면에만 표시. 통화 연결과 접수 확인을 구별하는 문구·상태 유지.
- 기존 WebGL2 방식과 dependency 사용. 시안의 slider·wireframe·시점 조절은 제품 화면에 반영하지 않음.
- 시연은 가상 audio envelope 사용. 화면 밖 검토 UI에 가상 반응임을 표시. 실제 상대 음성·microphone·통화 연동은 범위 밖.
- 시연 중단·3초 보기 가림·비활성 tab·reduced motion에서는 GPU 반복 렌더링 중단. 재개 시 중단한 위치에서 이어짐.
- WebGL2 불가·shader 실패·context loss 시 전화 glyph와 기존 통화 상태 문구 유지. 화면 전체는 계속 사용 가능.
- 다른 장면으로 나가면 animation과 GPU 자원 해제. 실제 통화가 끊기면 기존 연결 미확인 장면으로 돌아감.
- Android 반영, 실제 차량 GPU 성능 평가, push·PR·merge는 이번 범위 밖.

## 검증

실제 Chrome의 mesh pixel 변화·중단·재개·reduced motion·상태 전환·GPU 오류 fallback·자원 해제를 확인. 기존 Web suite와 manifest 검사도 실행. Pleos 창과 좁은 browser에서 화면 확인.

## 후속 결정 · 2026-11-08

사용자가 장식성이 과하다고 판단하여 ribbon ring 제거 결정. 본문의 ribbon 구현·검증·capture는 과거 기록. 현재 Web prototype은 큰 solid phone glyph와 기존 통화 문구만 표시.
