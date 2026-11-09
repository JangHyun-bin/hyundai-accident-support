# 전체 여정 검증 · 2026-11-10

Task 11. 실제 journey route를 대상으로 정상 경로, 예외 경로, 시각·접근성을 확인.

## 경로와 근거

| 범위 | 실제 검증 |
| --- | --- |
| V1·V2 차량 상태·안전 행동 | `journey-flow`에서 연결 후 차량 상태와 비상등 사용자 확인. `journey-vehicle`에서 출처·상충 observation·위치 미확인 검증 |
| H1 이어가기 | 같은 case를 차량에서 mobile로 전환·reload. 별도 browser에서 없는 기록을 복원했다고 표시하지 않는 기존 test 유지 |
| R1 현장 사진 | 직접 생성한 PNG를 파일 입력으로 선택, preview 승인 후 저장. 실제 camera frame·권한 거절·교체 실패는 `journey-evidence` 검증 |
| R2 음성 기록 | 기존 한국어 sample 입력·검토·저장. `journey-voice`에서 실제 MediaRecorder와 합성 microphone stream, permission 거절·긴급 중단·늦은 permission·STT 미제공 검증 |
| R3·C1 영상·도식 | 저장된 전방 영상 재생, 위치 정정·저장·확인. 근거 drawer의 실제 media와 Escape focus 복귀 검증 |
| C2 경위서 | 관측·진술·추정 각각 검토. 정정 후 재확인, 늦은 초안·근거 누락·승인 무효화는 `journey-report`에서 검증 |
| S1·S2 승인·접수·공유 | 명시적으로 선택한 영상·음성·도식·경위서만 snapshot 포함. 보험사 접수번호와 별도 공유 결과 수신. Reload 후 payload 불변 확인 |
| F1 후속 처리 | 정비소·점검 항목 검토 저장, 경로 preview·안내, 대차 외부 결과 수신과 reload 복원 |
| SC02·SC03·SC05 연결 | 자료 없는 이동 불가 경로, countdown 이후 늦은 연결, 중단 중 결과와 재개. 기관 상태와 점검 draft 보존 |
| 실패 연결 | Camera·microphone permission 거절 후 직접 입력. 저장 quota 실패 뒤 입력 유지·재저장. 정정한 경위서 승인 후 접수 미확인은 재요청으로 바뀌지 않음 |

새 `journey-flow.spec.ts`의 정상 경로는 사용자 button으로 진행하며, 외부 결과만 명시적 review event 사용. Fixture의 coverage ID와 V1–F1 대응을 test attachment에 기록. 실제 전송·외부 분석 호출 없음.

## 발견과 fix

Keyboard로 ‘문장 확인’을 실행하면 해당 button이 사라져 focus가 body로 이동하는 현상 재현. 확인 시작 시 해당 article에 focus를 옮겨 결과가 바뀌어도 위치 유지. 정정 저장·취소·문장 제외도 유지되는 경위서 section에 focus 전달. 비동기 완료 시 다른 화면의 focus를 다시 빼앗지 않음.

`/tmp/hyundai-task11-focus-red.log`에서 article의 실제 focus가 inactive인 실패 확인. Fix 이후 `journey-flow`, `journey-report`, `journey-visual` 28개 test 통과. `/tmp/hyundai-task11-targeted.log`.

## 직접 확인한 화면

- `vehicle-2560.png`, `vehicle-1440.png`: 상단 상태와 작업 box 사이 실제 간격 유지. Map은 위치 미확인으로 표시. 작업 본문은 내부 scroll이며 하단 주 행동은 고정 영역에 유지.
- `mobile-393-normal.png`: 긴 한국어 진술과 확인·정정 행동의 위계, 기관별 상태 baseline 확인.
- `mobile-360-200.png`: 200% text에서 긴 진술·확인 상태·keyboard focus·행동 접근 확인. 좁은 폭에서는 상태와 tab을 세로 배치. 가로 넘침 없음.
- `mobile-unavailable.png`: 정비소 조회 실패와 대차 미확인을 각각 표시. 다시 확인과 사고 내용 복귀 가능. 성공 결과나 좌표를 만들지 않음.

새 visual test는 실제 render의 text color와 배경을 읽어 일반 text4.5:1·큰 text3:1 확인. Disabled control·raw media는 제외. Mobile 행동 target48px 이상, 주 행동56px 이상 확인. 기존 glyph contrast test는 mark·pictogram의3:1 검증 담당. Reduced motion에서 반복 animation 없음. 시각 test는 사람 검토를 대신하지 않으며, 위 다섯 화면은 root가 각각 확인.

1440×900 browser의 review shell 전체는 문서 scroll 대상. 제품 viewport를 화면에 맞춰 scroll한 뒤 하단 주 행동 노출 검사. 촬영 전용으로 제품 배치나 결과를 바꾸지 않음.

## 저장 손상 경계

Spec §7.3에 따라 누락된 Blob을 가진 저장 snapshot은 복원하지 않음. 원문·승인 snapshot·다른 case를 자동 삭제하지 않는 browser test 추가. 이 상태에서 전체 기록의 부분 복원 기능은 제공하지 않음. 정상 저장 실패의 draft 보존과 외부 저장소 손상의 복구를 같은 보장으로 표현하지 않음.

## 전체 검증

전체 suite221/221 통과(7.6분). Manifest12/12 통과. TypeScript·Vite build 통과. 기존500kB 초과 bundle 경고 유지.

실기 camera·microphone, 실제 차량·기관·지도 연동, 실제 기기 간 sync는 Not verified. 합성 입력의 성공은 실기 성능이나 기관 접수의 근거가 아님.

재현 명령과 원본 logs:

```sh
# repository root
node --test specs/emergency-experience/manifest.test.mjs
# prototype/web
npm run check
npm run test:ui -- tests/journey-*.spec.ts tests/emergency-*.spec.ts tests/glyphs-data.spec.ts --workers=1 --output=/tmp/hyundai-task11-suite
```

`/tmp/hyundai-task11-suite.log`, `/tmp/hyundai-task11-manifest.log`, `/tmp/hyundai-task11-build.log`. 기존 emergency screenshot test가 다시 쓴 과거 이미지14개는 HEAD 원본으로 복원. 새 시각 근거는 이 directory에서 보존.
