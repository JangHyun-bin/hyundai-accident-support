# AFTER / CARE 목표와 Contract Reliability Repair 완료 추적

갱신일: 2026-11-13. **현재 repair 실행 중이며 전체 목표 완료 선언이 아니다.** 상태를 실제 evidence에 따라 갱신한다.

- 원래 요구: [goal.md](goal.md)
- 현행 설계: [design.md](design.md), [시각 기준의 출처·원문 미확보](../../docs/superpowers/specs/2026-11-12-figma-visual-contract.md)
- 이번 범위: [repair 스펙](../../docs/superpowers/specs/2026-11-12-contract-reliability-repair-design.md), [실행 계획](../../docs/superpowers/plans/2026-11-12-contract-reliability-repair.md)
- 현재 실행 기준·차단 사항: [preflight](../../evidence/contract-reliability-repair/preflight.json), [32개 요구별 상태](../../evidence/contract-reliability-repair/requirements.json)

## 상태 정의

- **verified:** 현재 source 범위에 맞는 직접 검사·관찰·문서 근거가 있음.
- **implemented-unverified:** 관련 구현은 있지만 현재 실행 증거가 아직 없거나 전체 요구를 입증하지 못함.
- **unmet:** 필수 산출물·검증이 없음.
- **blocked:** 외부 권한·환경 때문에 현재 완료 불가.
- **historical:** 과거 source·시점의 기록이며 현재 통과로 재사용하지 않음.

## 1. 이번 repair — 32개 요구

32개 요구의 authoritative 상태는 위 `requirements.json`이다. 코드 worker 완료와 실행 통과는 별개다.

| 범위 | 요구 | 현재 상태 | 직접 확인/남은 조건 |
|---|---|---|---|
| Android 공유 계약 | A01–A09 | implemented-unverified | 11-state 세션·effect·승인·복수 action 복구 작업 중. API28/API35 실제 instrumentation 필요 |
| 기록 신뢰성 | B01–B07 | implemented-unverified | URL·statement reload·paragraph 거절 수정/회귀 작업 중. 실제 저장·2탭·IME 검증 필요 |
| 상태별 음성 | C01–C06 | blocked | resolver·원고 작업 중. 기존 ElevenLabs 자격이 없어 신규 실제 MP3 생성 불가; 묵음·다른 원고로 대체하지 않음 |
| 재현성·원인·증거 | E01–E05 | implemented-unverified | 출력 격리·maximum-duration 분석 중. targeted/full 및 영구 원시 증거 필요 |
| 정본·문서 승계 | D01–D05 | implemented-unverified | 승인 원문 미확보를 표시한 시각 기준 재구성. 현재 문서·링크 검증과 실행 결과 반영 필요 |

PR/merge는 32개 요구를 모두 충족한 경우에만 허용한다. 현재 merge 완료 증거는 없다.

## 2. 원래 goal 항목별 추적

아래 경로는 repo root 기준이다. 코드 존재는 제품 사용성·실차 적합성·현재 전체 실행의 통과를 뜻하지 않는다.

| 목표 / 원래 요구 | 현재 근거 | 상태·한계 |
|---|---|---|
| G1.1 색·semantic 상태·type·spacing·radius·border·surface·grain·CA·icon·motion·정보 우선순위 | `src/design-system/tokens.css`, `surfaces.ts`, 공용 `after-care.tsx`; 현행 시각 기준 | implemented-unverified. 승인 원문은 미확보이며 현행 값의 provenance만 재구성 |
| G1.2 B 비례·문구·접점·사선·여백 조정, rounded split·text 안전 영역 | `flow-plan.ts`, `FlowBoard.tsx`, `split-geometry.ts`, stable layout spec | implemented-unverified. 최신 실제 frame 검증 필요 |
| G1.3 화면 역할·정보량에 따른 layout 유형 | `after-care-layout.tsx`, `use-bounded-frame.ts`, bounded/document 기준 | implemented-unverified |
| G1.4 Three cells를 공용 체계의 대표 layout으로 구성 | `EmergencySurface.tsx`, `ResponseLayout`, catalog | implemented-unverified. 과거 fixed-canvas flat 시안과 구분 |
| G1.5 C·C_02 보존, 전역 기본값과 preset 관계 | `surfaceStorageKey`, `SurfaceTheme.tsx`, `semanticSurfaces()` | implemented-unverified. 기존 저장 slot을 재작성하지 않음 |
| G2.1 제품과 같은 token·component catalog | `DesignSystemCatalog.tsx`와 제품 공용 import | implemented-unverified |
| G2.2 실제 layout·내용 위 색·shade·grain·CA 조절 및 preset 비교 | `ResponseSurfaceStudy.tsx`, surface editor | implemented-unverified. DEV route 노출과 production component 사용을 구분 |
| G2.3 grain12%·CA1px를 기준으로 전 화면 질감·가독성 검토 | `applyStudioFinish`, 과거 token/rendering evidence | historical. 최신 전 화면 사람 가독성·실차 평가 근거 아님 |
| G2.4 catalog 변경을 제품에 동일 반영 | `after-care-theme-v1`, custom/storage event·provider | implemented-unverified |
| G3.1 viewport·내용 변화에 대응하는 공용 component/layout | VehicleShell·TaskLayout·ResponseLayout·FlowFrame | implemented-unverified |
| G3.2 차량·통화·map·대피·요청·입력·저장·보험 전달 연결 | JourneyFlow·JourneyStudy·EmergencySurface·panel 모듈 | implemented-unverified. 실제 기관·차량 API 없음 |
| G3.3 화면별 독립 skin 대신 공용 token/component 사용 | `src/components/ui/after-care*`, catalog/product imports | implemented-unverified |
| G4.1 repo 전체 화면·상태·분기 inventory와 구현 대조 | `inventory.md`, scenarios60-state·journey8-fixture | historical + implemented-unverified. 과거 PASS 표를 최신 실행으로 사용하지 않음 |
| G4.2 대표 flow 검증 뒤 전체 적용 | complete-journey·과거 stable 결과 | historical. 현재 repair full/browser gate 전 |
| G4.3 정상/미확인/대기/실패/재시도/취소/복귀·voice 시작/입력/확인/저장 | Session·JourneyCase·VoiceRecordPanel·기존 regression | implemented-unverified. 이번 B/E가 누락 경로와 maximum-duration 원인을 복구 |
| G4.4 긴 한국어·크기 변화·keyboard·reduced motion·rendering 비용 | layout/IME/visual tests, 과거 rendering-measurement | implemented-unverified. 실차 GPU·물리 target 검증 없음 |
| G4.5 통화·접수·현장 도착 구별 | 기관별 requests/facts, approval/submission 모델 | implemented-unverified. 현재 native 호환성 복구도 필요 |
| G5.1 공통 motion·spectrum·상태 전환 | `motion.ts`, `FlowBoard`, 공용 spectrum | implemented-unverified. 시연 spectrum은 실제 119 audio가 아님 |
| G5.2 JaeGyu asset·원고·화면 timing 연결 | `src/audio/assets.json`, `useGuidanceAudio.ts`, 생성·녹화 script | blocked. 기존64개는 보존됐으나 새 상태 안내 자산과 현재 timing 검증이 필요 |
| G5.3 code/full 검증 뒤 E2E 영상 제작 | `record-emergency-flow.mjs`, `record-journey-flow.mjs` | unmet. script 존재는 새 영상 완성이 아님 |
| G5.4 대표 전체 흐름·주요 분기의 영상/capture 제공 | 과거 recording metadata·대표 screenshot | historical / unmet. 과거 MP4 절대경로는 현재 파일 부재; 최신 공통 음성 포함 전체 영상 미제작 |

위 `src/` 경로는 `prototype/web/src/` 기준이다.

## 3. 진행 방식·완료 기준 추적

| 원래 요구 | 현재 근거 | 상태 |
|---|---|---|
| 전체 작업 순서·완료 기준 문서화·진행 갱신 | repair plan·spec·requirements | verified: 실행 전에 정의, 완료 표는 실제 gate별 갱신 |
| 기존 사용자 변경·preset 보존·기존 공용 구조 우선 | preflight, ownership 표·공통 불변 조건 | implemented-unverified: 최종 source/asset 지문·review 필요 |
| 승인 B 방향·제품 목적을 지키며 불필요한 승인 대기 없이 진행 | 병렬 A/B/C/E + 통합 D, 시각 기준 출처 구분 | implemented-unverified. 새로운 디자인 승인 발명 금지 |
| 실제 browser 확인·필요 검증 | 현재 실행 계획 S2/S3 | implemented-unverified: 계획은 실행 증거 아님 |
| 작업 branch checkpoint·최종 PR·별도 지시 범위 merge | 사용자 실행 query, branch `fix/contract-reliability-repair` | implemented-unverified: PR/merge gate 전 |
| catalog와 제품의 동일 구현 | 공용 import·catalog | implemented-unverified: 현재 gate 필요 |
| 정의된 전체 scenario 구현·검증 추적 | inventory + 32요구와 별도 전역 표 | implemented-unverified: 과거/현재 scope 분리 |
| localhost 실제 조작 가능 | 실제 서버·browser 조작 필요 | implemented-unverified: 설치만으로 확인하지 않음 |
| 전체 flow 공통 design·motion·음성 적용 | 공용 UI/audio + 새 runtime 상태 resolver | blocked: 신규 음성 자산과 full 검증 미충족 |
| 최종 E2E 영상·preview URL·검증·한계 제공 | 위 G5와 최종 결과 문서 | unmet: 영상 미제작. 한계는 이 문서에 명시 |

## 4. 역사 자료의 경계

- 2026-11-10 Journey 241/241, Emergency 88·glyph19·manifest12/12 및 Android21개는 해당 source 시점의 기록이다.
- 2026-11-12 stable389·외형391·display395 기록 뒤 **마지막 전체 실행은394/395**이며 maximum-duration 원인은 당시 미확정이었다. 단독1/1 성공은 전체 실패 해소 증거가 아니다.
- 과거 Emergency 녹화 source hash 중 현재와 다른 파일이 있어 해당 screenshot/영상 메타데이터를 최신 전체 검증으로 재사용하지 않는다.
- 자동 전사·decode·browser playback을 사람 청취로 표현하지 않는다. 실차·OS IME 내부 후보·AAOS·안전 문구 전문기관 승인·3초 사용자 이해도 평가는 미실시다.

## 5. 제품화·완료 선언 제한

실제 119·보험사·정비소·차량 API, 사용자 인증·기기 간 동기화·서버 백업, 개인정보 보유/철회 정책과 D01–D05 운영 결정은 이 repair로 확정하지 않는다. 이번 repair를 완수하더라도 위 전역 영상·사람 평가·실차 검증을 완료했다고 전달하지 않는다.
