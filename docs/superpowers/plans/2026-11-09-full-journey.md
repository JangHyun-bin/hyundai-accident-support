# 사고 대응 전체 여정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 사용자가 별도 delegation을 선택한 경우에만 superpowers:subagent-driven-development 사용. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Pleos flat 긴급 대응 경험을 유지하며 차량 상태, mobile 기록, 사고 내용 확인, 접수와 후속 처리까지 실행 가능한 Web prototype으로 확장.

**Architecture:** 기존 emergency route를 회귀 기준으로 유지하고 journey route를 추가. `JourneyCase`가 새 여정의 정본이며 기존 `Session`을 포함하고 transition의 scene/fact 규칙만 제한적으로 재사용. 새 payload·기관별 요청 identity·승인은 새 reducer가 소유. IndexedDB transaction으로 case와 media를 보존하고 외부 결과는 명시적인 review fixture/event로 공급.

**Tech Stack:** 기존 React 19.3.1, TypeScript 5.9.3, Vite 8.3.6, Motion 14.9.1, Playwright 1.64.1/system Chrome. IndexedDB·MediaRecorder·getUserMedia·SVG 등 browser API 우선. 별도 state/form/test library 추가 없음. Node >=22.12, 검증 환경 24.4.1.

**Spec:** [전체 여정 제품 및 UI/UX spec](../specs/2026-11-09-full-journey-design.md). 구현자는 이 plan과 spec을 함께 읽음.

상태: 문서 검토·builder check 반영 완료, 착수 준비. 기준 commit `70c4946`. 아래 checkbox는 구현 완료 기록이며 현재 모두 미착수. 이 문서 작성은 제품 구현·외부 연동·push·merge 실행을 뜻하지 않음.

## Global Constraints

- 차량 canvas 2560 × 1440, app/map 각 1232 × 1152, app 내부 box gap 24, radius 32, 내부 card radius 24, padding 세로 24 / 가로 40.
- 차량 type: Headline 60/48, Action 36/32, Body 28/26, Label 24/20. Mobile type(font-size/line-height): 28/36, 22/30, 17/26, 15/22, 13/18.
- Mobile 기준 393 × 852, 최소 폭 360, 좌우 padding 20, section gap 24, 내부 gap 12/16, radius 20, 주 button 높이 56 이상, 조작 target 48 이상.
- Foreground `#EDEEF2`, surface `#1D1E21`, line `#313236`, secondary `#A4A8AE`, confirmed `#00E074`, urgent `#FF4C28`.
- Appear 250ms, crossfade 200ms, exit 150ms 이하. Reduced motion은 이동·반복 animation 제거.
- JPEG/PNG/WebP, 사진당 15 MiB, 현재 draft photo evidence 최대 12개, 보존 중인 과거 asset까지 포함한 case media 총 150 MiB. 음성 최대 120초, 진술 최대 5,000자.
- Schema version 1, IndexedDB `after-care-journey-v1`, store `cases/assets/meta`. 기존 localStorage는 명시적 import에서 읽기만 함.
- 실제 전화·기관 전송·차량 제어·실제 기기 sync·외부 STT/AI·ElevenLabs 생성은 별도 integration. Fixture 성공을 실제 연동으로 표현하지 않음.
- 기존 날짜 문서는 일괄 재작성하지 않음. 과거 결정과 새 결정을 구분하며 English commit message 사용.
- 제품 code 착수 첫 단위는 Task 1의 대표 화면. 영상 제작은 Task 12의 code·시각 검증 후.

## Review Focus

1. 저장 불가·quota·두 tab 동시 편집에서 자료 손실과 거짓 저장 완료 방지 — Task 3.
2. Permission 거절·미지원 MIME·STT 미제공에서 실제 입력에 가상 결과를 섞지 않음 — Task 5/6.
3. 근거 삭제·정정·늦은 AI 결과에서 사용자 내용 보존과 승인 무효화 — Task 8.
4. Double click·reload·과거 요청의 늦은 결과에서 중복 전송과 최신 상태 퇴행 방지 — Task 9.
5. 작은 mobile·긴 한국어·keyboard·200% text에서 주 행동·focus·의미 단위 읽기 유지 — Task 1/11.

## 실행 방식과 검증 위치

한 작업을 구현·검증한 뒤 다음 작업으로 진행. 별도 worker 병렬 변경은 초기 전제 아님. Storage와 case contract가 고정되기 전에 media/report 작업을 동시에 시작하지 않음.

이 문서의 `npm` 명령은 `prototype/web`에서 실행. `node --test specs/...` 명령은 repository root에서 실행. Playwright config가 dev server를 시작하며 실행 중인 동일 repo server만 재사용. 외부 CI runner 등록·실행과 관계없는 기존 local 개발 검증임.

Logic test도 기존 Playwright runner에서 수행해 새 test dependency 추가를 피함. Browser가 필요한 저장·media·keyboard test는 실제 page/context 사용. 새 test의 실패는 import/기능 부재 또는 기대한 행동 실패인지 확인하고, 문법·설정 오류를 유효한 red test로 간주하지 않음.

## File map

| 경로 | 책임 |
|---|---|
| `prototype/web/src/emergency/EmergencyCatalog.tsx` | 기존 catalog에 새 component·mobile token 검토 진입 추가 |
| `prototype/web/src/emergency/emergency.css` | 기존 paint 유지, 필요한 semantic token scope 재사용 |
| `prototype/web/src/emergency/EmergencyStudy.tsx` | 제품 surface 추출 후 legacy controller·review controls 유지 |
| `prototype/web/src/emergency/EmergencySurface.tsx` (new) | 기존 긴급 UI를 controlled props로 render; 저장·timer 소유하지 않음 |
| `prototype/web/src/emergency/PleosDisplay.tsx` | 선택적인 지도 내용 slot, 기존 default 지도 유지 |
| `prototype/web/src/journey/case.ts` (new) | Types·initial case·검증·pure state transition·revision 규칙 |
| `prototype/web/src/journey/case-store.ts` (new) | IndexedDB transaction·import·load·case 삭제·충돌 검출 |
| `prototype/web/src/journey/JourneyStudy.tsx` (new) | Load/commit·device·stage·review event orchestration |
| `prototype/web/src/journey/JourneyLayout.tsx`, `journey.css` (new) | 차량/mobile shell·공통 action/status/evidence 표현 |
| `prototype/web/src/journey/JourneyCatalog.tsx` (new) | 새 component states·대표 3개 화면의 fixture preview |
| `prototype/web/src/journey/VehiclePanel.tsx` (new) | 차량 observation·행동·지도·이어가기 UI |
| `prototype/web/src/journey/EvidencePanel.tsx`, `capture.ts` (new) | 자료 목록·촬영/교체·camera 생명주기 |
| `prototype/web/src/journey/VoiceRecordPanel.tsx`, `voice-capture.ts` (new) | 녹음·실제 spectrum·playback·진술 확인 |
| `prototype/web/src/journey/ClipPlayer.tsx` (new) | 영상 playback·time range·missing/decode error |
| `prototype/web/src/journey/DiagramEditor.tsx` (new) | SVG 도식·pointer/button/keyboard 편집 |
| `prototype/web/src/journey/ReportPanel.tsx` (new) | 문장 정정·근거 drawer·확인 |
| `prototype/web/src/journey/SubmissionPanel.tsx` (new) | 수신처·전송 선택·snapshot preview·접수·상대방 공유 |
| `prototype/web/src/journey/FollowUpPanel.tsx` (new) | 정비·길 안내·수리 항목·대차 시연 |
| `specs/emergency-experience/journey-fixtures.json` (new) | 재현 가능한 sample case·결과·coverage ID |
| `prototype/web/public/journey-samples/` (new) | 합성/권한 확인 media와 `SOURCES.md` |
| `prototype/web/tests/journey-*.spec.ts` (new) | 아래 Task별 행동·시각 검사 |
| `prototype/web/scripts/record-journey-flow.mjs` (new) | 새 전체 여정 녹화, 기존 SC recorder와 분리 |

공통 UI primitive는 이미 있는 것을 우선 재사용. 위 파일은 책임 경계이며 빈 wrapper를 만들라는 뜻이 아님. 분리 필요가 없는 짧은 helper는 소유 component에 둠.

## 공통 interfaces

Task 2가 다음 contract를 정본으로 정의하고 후속 Task가 사용. ID는 opaque string이며 fixture ID와 사용자가 생성한 case ID를 구분. 시간은 ISO 문자열, 없는 시각은 null. 총 저장 revision과 개별 내용 revision을 구분.

```ts
type Device = 'vehicle' | 'mobile'
type Stage = 'response' | 'record' | 'review' | 'follow-up'
type Agency = 'rescue' | 'vehicle' | 'insurance'
type EvidenceKind = 'photo' | 'audio' | 'video'
type Availability = 'pending' | 'available' | 'failed' | 'unavailable' | 'skipped'
type Source = 'device' | 'user' | 'fixture'
type AssetWrite = { id: string; caseId: string; blob: Blob }
type PayloadSelection = {
  observationIds: string[]; statementIds: string[]; evidenceIds: string[]
  includeDiagram: boolean; includeReport: boolean
}
type CommitResult =
  | { ok: true; value: JourneyCase }
  | { ok: false; reason: 'conflict' | 'unavailable' | 'quota' | 'invalid'; draft: JourneyCase }
type ApprovalResult =
  | { ok: true; value: JourneyCase }
  | { ok: false; reason: 'recipient' | 'empty-selection' | 'missing-evidence' |
      'unreviewed-content' | 'retry-not-allowed' }
function createCase(session: Session, id: string, now: string): JourneyCase
function validateCase(value: unknown): value is JourneyCase
function reduceCase(current: JourneyCase, command: CaseCommand): JourneyCase
function makeSubmission(current: JourneyCase, input: {
  agency: Agency; recipient: string; selection: PayloadSelection; id: string; now: string
}): ApprovalResult
function makeShare(current: JourneyCase, input: {
  recipient: string; selection: PayloadSelection; id: string; now: string
}): ApprovalResult
async function loadCase(id: string): Promise<JourneyCase | null>
async function commitCase(next: JourneyCase, expectedRevision: number | null,
  assets?: AssetWrite[]): Promise<CommitResult>
async function readAsset(caseId: string, assetId: string): Promise<Blob | null>
async function deleteCase(id: string, expectedRevision: number): Promise<boolean>
```

`createCase`의 초기 revision은 0. 신규 `commitCase(..., null)`은 ID 미존재를 요구하고 revision 1을 저장. 기존 commit은 DB revision과 expectedRevision이 같을 때만 +1. Reducer는 저장 revision을 올리지 않고 statement/report 등 내용 revision만 변경. Commit 실패 때 UI draft 보존.

`CaseCommand`는 stage 이동/복귀, observation 수신, safety action 확인, 긴급 edge 실행, evidence 추가·교체·제거, statement 편집·확인, diagram 정정·확인, report 결과·정정·확인, request 결과, 후속 선택으로 구분한 discriminated union. Media Blob은 command 안에 넣지 않으며 `commitCase`의 assets로 함께 저장. Task 2에서 field 이름과 validation을 확정.

`makeSubmission`은 선택 자료 존재·현재 revision 확인·recipient·재시도 조건을 검증하고 immutable snapshot과 현재 요청 상태를 같은 next case에 추가. 잘못된 입력은 원본을 변경하지 않고 reason을 반환. 실제 network 호출을 수행하지 않음. Contact attempt는 이 함수를 통하지 않으며 자료 승인을 요구하지 않음.

기관별 현재 ID는 `activeSubmissionIds: Record<Agency, string | null>`. Submission kind는 `new | imported | contact`. Imported/contact의 payload·approvedAt은 null 가능. Observation에는 `legacyFactId: string | null`을 포함하며 `emergency.facts`는 observation에서 projection. 기존 단일 `requestId`를 새 요청 identity로 쓰지 않음.

상대방 공유는 `ShareRecord[]`를 사용하고 기관 상태·active ID를 변경하지 않음. makeShare는 같은 payload validation을 재사용하되 기관의 retry guard는 적용하지 않음. 공유 결과는 caseId/shareId로 지정. AssetWrite는 새 ID만 허용, 기존 Blob overwrite는 invalid. Snapshot은 metadata와 실제 asset 양쪽이 불변.

---

### Task 1 / P0: 공통 catalog와 대표 화면

**Files:** Modify `src/emergency/EmergencyCatalog.tsx`, `src/emergency/emergency.css`, `src/main.tsx`. Create `src/journey/JourneyLayout.tsx`, `JourneyCatalog.tsx`, `journey.css`, `tests/journey-design.spec.ts`.

**Interfaces:** `JourneyLayout({ device, summary, children, action }: { device: Device; summary: ReactNode; children: ReactNode; action?: ReactNode })`; `JourneyCatalog()`는 상태 변경 없는 preview. Device type은 Task 2 이전에는 같은 literal union을 사용하고 이후 정본 import로 교체.

- [x] 기존 catalog의 색·type·radius를 읽고 새 semantic alias만 공통 scope로 노출. 기존 CSS selector의 paint 변화는 만들지 않음.
- [x] 차량 상태+주 행동, mobile voice review, 경위서+근거의 대표 3개 화면을 고정 fixture로 구성. 기능 구현 전 정보 위계와 실내용 길이를 확인.
- [x] 상태별 component preview: unknown/pending/confirmed/failed/skipped, 긴 label, 자료 없음. Raw media를 제외한 모든 paint가 token을 사용하도록 구성.
- [x] `journey-design.spec.ts`: 393×852/360×800/차량 canvas에서 `scrollWidth <= clientWidth`; button의 전체 label 노출; 200% text에서 핵심 content 접근 가능; reduced motion에서 반복 animation 없음을 검사.
- [x] `npm run test:ui -- tests/journey-design.spec.ts tests/emergency-flat.spec.ts --workers=1`, `npm run check` 통과 후 대표 screenshot을 사람이 확인. 색만 바꾼 시안이 아닌 정보량·조작 위계 확인 기록을 남김.
- [x] Local commit: `feat: establish full-journey component previews`. 사용자 preview 의견으로 구조가 바뀌면 다음 Task 전에 catalog에 반영.

**완료:** 기존 긴급 화면의 회귀 없이 새 3개 대표 화면을 review 가능. 이 단계만으로 실제 기록 기능이 구현됐다고 표시하지 않음.

### Task 2 / P1: Case domain과 긴급 상태 연결 규칙

**Files:** Create `src/journey/case.ts`, `specs/emergency-experience/journey-fixtures.json`, `tests/journey-domain.spec.ts`. Read `src/emergency/session.ts` and existing manifest; 기존 manifest 60 scenes를 새 자료로 덮지 않음.

**Interfaces:** 위 공통 types·createCase·validateCase·reduceCase·makeSubmission의 validation 골격. Spec §7의 fields를 구체 type으로 정의.

- [ ] Red test: createCase의 `emergency`는 전달한 Session의 승인·거절·requestId를 보존; 기존 savedRecord는 첫 Statement로 정확히 복사; 새 media·도식·AI 사실은 자동 생성되지 않음.
- [ ] Red test: SC05 import의 rescue/vehicle은 서로 다른 imported reference, payload null, 기존 submissions count 불변. Received는 resend 불가, unknown은 조회만 가능. Legacy 기록은 변경되지 않음.
- [ ] Red test: 모르는 case command·잘못된 enum·5,001자 statement·존재하지 않는 evidence 참조 거절. `confirmedRevision`은 내용 revision과 같을 때만 유효.
- [ ] 초기 case와 validation 구현. Media limits와 copy 가능한 label은 한 곳에서 정의. Domain validation은 DB restore와 fixture load 양쪽에서 재사용.
- [ ] `긴급 edge 실행`은 현재 scene의 edge만 수락하고 기존 `transition`의 scene/fact 결과만 채택. 반환된 legacy requests/record/approval 값은 사용하지 않음. Countdown cancel/expire는 현재 auto_contact 대상만 허용. Record/save/return·suspend/resume·submit/receive/not_received와 destination request_overrides는 spec §7.1의 새 command 경로로 처리.
- [ ] Scenario cursor는 진입 맥락으로 유지하고 stage를 별도로 이동. SC01→보험사 검토에서도 scenarioId·구호 요청 보존 test. Observation 상충은 summary 미확인, 상세 양쪽 보존. 외부 결과에 해당 scene edge가 없어도 기관 상태만 갱신 가능.
- [ ] Rescue 최초 연결/reconnect마다 contact reference 생성. 명시된 외부 결과는 해당 reference와 agency가 일치해야 적용. 자료 승인 없이 연락 가능하되 차량 지원·보험 자동 요청 없음.
- [ ] 상태 fixture: 정상 전체 여정, 무응답, 이동 불가, 자료 없음/부분 자료, 보험 거절, 중단 중 접수, 늦은 결과를 정의. 기존 SC ID와 provenance를 명시하고 실제 sensor 결과로 표시하지 않음.
- [ ] `npm run test:ui -- tests/journey-domain.spec.ts --workers=1` 및 root의 `node --test specs/emergency-experience/manifest.test.mjs` 통과. Commit `feat: model incident records and journey transitions`.

**완료:** UI·storage 없이도 입력·정정·긴급 복귀의 의미를 test로 확인 가능. 승인 snapshot의 세부 구현은 Task 9가 소유.

### Task 3 / P1: 원자적 저장·복원·legacy import

**Files:** Create `src/journey/case-store.ts`, `tests/journey-storage.spec.ts`. Modify case.ts only if validation requires a concrete field.

**Interfaces:** 공통 loadCase/commitCase/readAsset/deleteCase. `importLegacySession(session: Session, id: string, now: string): Promise<CommitResult>`는 createCase와 commitCase만 조합.

- [ ] Red browser tests: case+Blob commit 후 reload 동일 내용; transaction abort면 둘 다 미반영; 2개 page의 동일 revision 수정은 하나만 성공; 실패한 draft는 반환값에 남음.
- [ ] Red tests: 저장 차단·quota 실패에 `ok:false`; 손상 case는 load 불가지만 원본 삭제 안 함; 다른 case asset ID 참조 차단; legacy localStorage bytes가 import 전후 동일.
- [ ] Red tests: 기존 assetId overwrite 거절; 교체 시 새 ID 사용; 과거 승인 snapshot으로 readAsset하면 이전 Blob, 새 draft는 새 Blob 반환. Draft photo 12개 제한과 과거 asset을 포함한 150 MiB 제한을 별도로 검사.
- [ ] IndexedDB transaction 구현. DB operation 오류를 성공으로 삼키지 않음. Asset limit·case ownership을 commit 시 검증. Blob URL은 저장하지 않음.
- [ ] 삭제는 case와 해당 assets만 한 transaction으로 처리. 과거 report/전송/공유 snapshot이 참조하는 asset의 draft 삭제는 물리 삭제하지 않음. 참조 없는 asset만 명시적 자료 삭제 때 제거, 전체 case 삭제 시 보존 asset도 제거.
- [ ] `npm run test:ui -- tests/journey-storage.spec.ts tests/journey-domain.spec.ts --workers=1`, `npm run check` 통과. Commit `feat: persist incident records and media atomically`.

**완료:** Media 입력을 붙이기 전에 실제 browser 저장과 실패 복구의 기반 검증.

### Task 4 / P2: 차량 상태·안전 행동·mobile shell

**Files:** Create `src/journey/JourneyStudy.tsx`, `VehiclePanel.tsx`, `src/emergency/EmergencySurface.tsx`, `tests/journey-vehicle.spec.ts`. Modify `EmergencyStudy.tsx`, `PleosDisplay.tsx`, `src/main.tsx`, `JourneyLayout.tsx`.

**Interfaces:** `VehiclePanel({ value, onCommand }: { value: JourneyCase; onCommand: (command: CaseCommand) => void })`. `PleosDisplay`에 optional `navigation?: ReactNode`; 없으면 기존 지도 유지. `EmergencySurface`는 Session·scene·countdown·voice 상태와 action callback을 받아 render하며 effects를 소유하지 않음.

- [ ] 기존 EmergencyStudy의 제품 JSX만 controlled EmergencySurface로 추출. 기존 timer·speech·URL·storage·review 동작은 controller에 유지. 먼저 기존 `emergency-urgent`, `emergency-complete`, `emergency-call-symbol` tests 통과.
- [ ] JourneyStudy에서 case load/commit 실패·device/stage 전환·review event를 관리. 한 tab의 저장을 직렬화하고 비동기 작업 결과는 최신 case에 command로 적용. 녹음 시작 시점의 snapshot으로 이후 긴급 event를 덮지 않음. `?study=journey`와 `?study=journey-catalog`만 추가하며 기존 entry point 유지.
- [ ] 차량 summary/details: 충격 방향·세기·출처·시각·미확인, user/device 확인 구분, 불가능한 행동. 확정 근거 없는 손상·주행 가능 그림 없음.
- [ ] 명시된 fixture 위치만 map slot에 render. 좌표 없는 경우 marker/거리/대피 경로 숨김. 같은 browser device switch는 durable commit 후 이동, 다른 browser context는 case 없음 상태.
- [ ] Tests: 기록 도중 위험 event에 저장 Promise 해결 전 response 표시·draft 유지; 늦은 저장이 response를 되돌리지 않음; 위험 event로 countdown 재시작 안 함; 안전 행동 tap만으로 device 확인 안 됨; unknown mobility 유지; 최신 case 없는 기기에서 인계 완료 표시 안 됨.
- [ ] `npm run test:ui -- tests/journey-vehicle.spec.ts tests/emergency-urgent.spec.ts tests/emergency-complete.spec.ts tests/emergency-call-symbol.spec.ts --workers=1`, `npm run check`. Commit `feat: connect vehicle status and mobile journey views`.

**완료:** 실제 기록 기능 전에도 차량 대응과 mobile 표현을 같은 case에서 이어 확인 가능.

### Task 5 / P3: 현장 촬영과 자료 목록

**Files:** Create `src/journey/EvidencePanel.tsx`, `capture.ts`, `tests/journey-evidence.spec.ts`. Modify case.ts, JourneyStudy.tsx, JourneyCatalog.tsx.

**Interfaces:** `EvidencePanel({ value, onSave, onCommand }: { value: JourneyCase; onSave: (command: CaseCommand, assets: AssetWrite[]) => Promise<CommitResult>; onCommand: (command: CaseCommand) => void })`. `capturePhoto(stream: MediaStream): Promise<Blob>`는 caller가 시작한 stream의 frame만 capture, 권한 요청은 UI 명시 동작에서 수행.

- [ ] Red tests: JPEG/PNG/WebP 수락; 15 MiB 초과·미지원 MIME·13번째 photo 거절; 저장 실패 때 기존 photo·draft 보존; 한 대상에 사진이 여러 장이어도 대상 확보 수는 1.
- [ ] 자료 목록과 one-target capture/review/replace/skip 구현. Preview 사용 전 Blob decode 검증. 거절·미지원 때 file input과 skip 제공.
- [ ] Commit 성공 후에만 available로 표시. Object URL cleanup과 track stop을 close/unmount/error에 적용.
- [ ] Browser fake media device는 test에서만 사용. 실제 사용자 camera는 자동 실행하지 않음. Skip 이후 자료 없이 review stage 진입 가능 test.
- [ ] `npm run test:ui -- tests/journey-evidence.spec.ts tests/journey-storage.spec.ts --workers=1`, `npm run check`. Commit `feat: capture and preserve incident photo evidence`.

### Task 6 / P3: 음성 기록·검토

**Files:** Create `src/journey/VoiceRecordPanel.tsx`, `voice-capture.ts`, `tests/journey-voice.spec.ts`. Modify case.ts, JourneyStudy.tsx, JourneyCatalog.tsx.

**Interfaces:** `VoiceRecordPanel({ value, mode, onSave }: { value: JourneyCase; mode: 'sample' | 'device'; onSave: (command: CaseCommand, assets: AssetWrite[]) => Promise<CommitResult> })`. `startVoiceCapture(stream: MediaStream, onLevel: (level: number) => void): { stop(): Promise<Blob>; cancel(): void }`. Mode는 review shell이 명시적으로 선택하고 sample audio/transcript는 같은 fixture ID로 묶음.

- [ ] Red tests: permission 거절 후 직접 입력 가능; stop/cancel/pagehide에서 track 종료; 120초 자동 stop은 review까지만; TTS와 capture 동시 재생 없음.
- [ ] Red tests: 실제 녹음 mode+STT 없음은 가상 transcript 미출력; 기존 진술에 추가 녹음 실패해도 기존 내용 유지; 5,000자 저장·5,001자 입력 제한; save 실패에 saved 표시 없음.
- [ ] Red test: Blob 생성·저장 중 위험 event에 즉시 response 표시, track 종료, 메모리 draft 보존. 저장 실패 후 record로 복귀하면 재저장 가능하며 긴급 상태를 되돌리지 않음.
- [ ] Browser 지원 MIME을 검사하고 MediaRecorder·AnalyserNode로 capture와 spectrum 구현. 상수 animation으로 실제 음량을 대신하지 않음.
- [ ] Ready/listening/review/error 상태를 공통 catalog 기준으로 구현. Playback·정정·추가 녹음·직접 입력·저장 제공. 원본 audio와 확정된 text를 연결.
- [ ] `npm run test:ui -- tests/journey-voice.spec.ts tests/journey-storage.spec.ts --workers=1`, `npm run check`. Commit `feat: add voice-first incident recording and review`.

**완료:** STT integration 없이도 실제 녹음과 정직한 fallback이 작동. ElevenLabs 변경·credit 사용은 없음.

### Task 7 / P3–P4: Dashcam 확인과 사고 도식 편집

**Files:** Create `src/journey/ClipPlayer.tsx`, `DiagramEditor.tsx`, `tests/journey-reconstruction.spec.ts`, `public/journey-samples/SOURCES.md`와 sample assets. Modify fixtures, case.ts, JourneyCatalog.tsx.

**Interfaces:** `ClipPlayer({ evidence, blob, range }: { evidence: Evidence; blob: Blob | null; range?: { start: number; end: number } })`; `DiagramEditor({ value, onChange }: { value: Diagram; onChange: (next: Diagram) => void })`.

- [ ] Red tests: missing rear clip에도 front 재생 가능; decode 실패 후 다른 자료 접근 유지; 잘못된 time range는 clamp 또는 오류 표시하고 다른 영상으로 연결하지 않음.
- [ ] 출처 문서가 있는 합성 front/rear 20초 clip과 사진 사용. 실제 사고 영상·사용자 개인 자료를 repository fixture로 넣지 않음. 자동 생성 가능 단순 vector scene은 외부 의존성 없이 제작.
- [ ] Video playback·timeline·marker·source/availability 구현. Decode 후 실제 duration으로 seek range 검증.
- [ ] Red tests: drag와 방향 button/keyboard 이동의 결과 좌표 동일; 좌표 0–1 범위 유지; undo 복원; 수정 후 confirmedRevision 해제; 지원하지 않는 도로 fixture에서 그럴듯한 도식 생성 안 됨.
- [ ] 두 차량·직선 차선의 SVG 도식 구현. 정정본/원본 구별, mobile 세부 조작 target 확보. Shortcut 한계를 comment와 spec의 지원 범위에 유지.
- [ ] `npm run test:ui -- tests/journey-reconstruction.spec.ts --workers=1`, `npm run check`. Commit `feat: review dashcam evidence and edit accident diagrams`.

### Task 8 / P4: 경위서와 근거 확인

**Files:** Create `src/journey/ReportPanel.tsx`, `tests/journey-report.spec.ts`. Modify case.ts, fixtures, JourneyCatalog.tsx, JourneyStudy.tsx.

**Interfaces:** `ReportPanel({ value, onCommand }: { value: JourneyCase; onCommand: (command: CaseCommand) => void })`. Report 결과 command는 `basedOnRevision`과 paragraph provenance를 필수로 가짐.

- [ ] Red tests: 문장 정정→해당 확인 해제; 자료/진술/도식 정정→report 확인 무효화; 근거 삭제→broken reference 표시; 이미 보낸 snapshot은 불변.
- [ ] Red tests: 늦은 fixture 생성 결과는 현재 편집을 덮지 않음; 비교 후 교체만 가능; user-confirmed 추정은 여전히 추정; 자료가 없는 빈 case에 사실 문장 자동 생성 없음.
- [ ] 문장별 편집·확인, 근거 drawer, 원문 확인, 미확인 항목 표시 구현. Drawer 닫힘 후 trigger에 focus 복귀.
- [ ] 기존 report의 revision과 새 결과를 비교하는 적용 동작 구현. 사용자 진술은 실제 입력만 사용하고 fixture mode의 결과는 fixture case에서만 제공.
- [ ] `npm run test:ui -- tests/journey-report.spec.ts tests/journey-reconstruction.spec.ts --workers=1`, `npm run check`. Commit `feat: review evidence-linked accident statements`.

### Task 9 / P5: 전송 snapshot·보험사 접수·상대방 공유

**Files:** Create `src/journey/SubmissionPanel.tsx`, `tests/journey-submission.spec.ts`. Modify case.ts, JourneyStudy.tsx, fixtures, JourneyCatalog.tsx.

**Interfaces:** makeSubmission 완성. `SubmissionPanel({ value, onApprove, onCommand })`; `onApprove`는 makeSubmission 결과를 commit한 뒤에만 sending을 사용자에게 표시. Response command는 `{ caseId, submissionId, agency, status, externalReceipt }`를 필수 식별 정보로 가짐.

- [ ] Red tests: recipient/선택 항목이 비었거나 현재 내용 확인이 유효하지 않으면 제출 차단; 동의 2회 click으로 snapshot 1개; commit 실패면 제출 횟수 불변.
- [ ] Red tests: 사진만 선택한 제출 허용; 선택하지 않은 미완료 도식은 차단 사유 아님; 포함 report의 broken reference는 차단; 사용자가 검토한 `미확인` 문장은 해당 표현을 유지한 채 제출 가능.
- [ ] Red tests: edit 후 새 승인 필요·기존 payload 불변; unknown/lookup failure는 재전송 불가; explicit failed/not_received 후 새 승인 가능; 과거 submission 결과는 새 요청의 현재 상태를 덮지 않음.
- [ ] Red tests: agency 불일치 결과 거절; 같은 submission의 received 후 unknown은 상태 퇴행 없음; imported payload는 null 유지하고 새 제출만 현재 승인 내용을 snapshot으로 가짐.
- [ ] 수신처·목적·선택 자료·실제 payload preview와 보류·거절 구현. 승인한 snapshot을 저장 transaction으로 보존. `emergency.requests`와 제출 이력은 한 reducer event에서 갱신.
- [ ] 기관 발급 번호 없는 received는 `접수번호 확인 중`. 내부 ID를 노출하지 않음. 다른 기관의 상태는 바꾸지 않음.
- [ ] 상대방 공유는 별도 recipient와 비어 있는 기본 selection으로 시작. 보험사 자료 자동 복제 없음. Preview 승인 뒤 결과 event가 있어야 공유 확인, button click만으로 완료 처리 안 함.
- [ ] makeShare와 ShareRecord 결과 command를 사용하며 Agency에 상대방을 끼워 넣지 않음. Test: 공유 승인·성공·실패 전후 보험사 active ID·현재 상태·기존 payload snapshot이 모두 불변.
- [ ] `npm run test:ui -- tests/journey-submission.spec.ts tests/journey-report.spec.ts tests/emergency-complete.spec.ts --workers=1`, `npm run check`. Commit `feat: preserve approved payloads and independent receipt states`.

### Task 10 / P5: 정비·길 안내·대차 후속 처리

**Files:** Create `src/journey/FollowUpPanel.tsx`, `tests/journey-follow-up.spec.ts`. Modify case.ts, fixtures, JourneyStudy.tsx, JourneyCatalog.tsx.

**Interfaces:** `FollowUpPanel({ value, onCommand }: { value: JourneyCase; onCommand: (command: CaseCommand) => void })`. 후속 결과는 선택한 shop/request ID와 source/updatedAt을 포함.

- [ ] Red tests: 빈 목록·오래된 입고 정보·조회 실패 표현; 예상 수리 항목이 확정 견적/주행 허용으로 변하지 않음; 대차 자격 미확인은 가입 사실로 덮지 않음.
- [ ] 정비소 선택·보낼 수리 항목 검토·경로 preview·대차 확인 상태 구현. 기존 map slot 재사용. 자동 예약·자동 전송 없음.
- [ ] 차량 지원 대기 중 후속 화면을 열어도 지원 상태·return stage 보존. 후속 업무 거절·중단은 구호 상태와 독립.
- [ ] `npm run test:ui -- tests/journey-follow-up.spec.ts tests/journey-submission.spec.ts --workers=1`, `npm run check`. Commit `feat: add repair and replacement-car follow-up previews`.

### Task 11 / P6: 전체 경로와 시각·접근성 검증

**Files:** Create `tests/journey-flow.spec.ts`, `tests/journey-visual.spec.ts`, `evidence/journey/` 산출물. Modify journey files only for findings; 기존 `tests/emergency-*.spec.ts`의 의미를 낮춰 통과시키지 않음.

**Interfaces:** Coverage ID는 fixtures의 case/step ID와 spec V1–F1을 연결. Route query로 실제 미확인 결과를 자동 확정하지 않음.

- [ ] 정상 전체 경로: response→device switch→photos/voice→diagram/report→승인→접수→후속 처리. 각 단계는 사용자 button으로 진행하고 외부 결과만 review event 사용.
- [ ] 예외 경로: SC03 무응답·늦은 응답, SC02 이동 불가, camera/mic 거절, 자료 없이 진행, 저장 실패, report 정정, 접수 미확인, SC05 중단 중 결과·재개. 원래 SC 전체 검증과 별개로 새 여정의 연결을 검사.
- [ ] 차량 전체·축소, mobile 393/360, 긴 한국어·keyboard·200% text·reduced motion 검사. 가로 overflow, focus 복귀, primary action 노출, column baseline 확인. Contrast는 raw media를 제외한 실제 render 색 기준.
- [ ] 정상·미확인·실패 대표 screenshot을 사람이 검토. Product copy에 구현 용어·시연 설명이 섞였는지 확인. 결과는 날짜별 새 evidence 문서에 기록.
- [ ] Root `node --test specs/emergency-experience/manifest.test.mjs`; web `npm run check`; `npm run test:ui -- tests/journey-*.spec.ts tests/emergency-*.spec.ts tests/glyphs-data.spec.ts --workers=1` 통과. 기존 optical/tools test는 관련 code를 건드린 경우에만 추가.
- [ ] Commit `test: verify the complete incident journey and recovery paths`. 남은 실기 검증은 Not verified로 기록, UI tests 통과와 혼동하지 않음.

### Task 12 / P6: 영상·preview·handoff 문서

**Files:** Create `scripts/record-journey-flow.mjs`, `evidence/journey/README.md`. Modify `prototype/web/README.md`에는 새 항목을 append. 기존 `record-emergency-flow.mjs`와 과거 영상은 보존.

**Interfaces:** `node scripts/record-journey-flow.mjs /absolute/path/journey-flow.mp4`. Output: 차량+mobile 순서의 MP4, 장면별 timeline/coverage JSON, simulation 경계·검증 기록이 있는 README. 기존 파일 overwrite 금지.

- [ ] 녹화 시작 전 Task 11 결과·asset 출처·sample/user mode 확인. 실제 개인정보가 없는 deterministic fixture 사용.
- [ ] 기존 recorder의 Chrome 시작·상태 대기·output 존재 검사를 재사용. 녹화용 layout은 해당 browser context에만 적용, 제품 code에 촬영 전용 상태 조작을 넣지 않음.
- [ ] 실제 UI 조작과 명시적 외부 event를 기록. 불필요한 timer 성공·영상 편집으로 UI 결과를 만들어내지 않음. 기본 무음, ElevenLabs 생성·음성 합성은 별도 결정.
- [ ] `node scripts/record-journey-flow.mjs <새 절대경로>` 후 ffprobe로 해상도·duration·decode 확인. Timeline의 요구 단계가 모두 존재하는지 검사하고 시작/중간/끝 및 화면 전환을 직접 확인.
- [ ] Preview 배포가 이번 실행에 포함됐을 때만 기존 Funnel의 8443 대상 snapshot 갱신. 다른 port·다른 프로젝트 설정을 변경하지 않음. 먼저 새 artifact를 준비·검증하고 현재 URL에서 확인.
- [ ] `docs: document the complete journey preview and verification` commit. Push/PR/merge는 실행 시 사용자의 범위와 repo checks에 따라 별도 수행.

## 착수 checklist

- [ ] 현재 branch와 변경 사항 재확인. 독립된 작업 branch/worktree 사용 여부는 실행 환경에 맞춰 결정, 사용자의 다른 변경 보존.
- [ ] 이 spec/plan의 vehicle+mobile 범위와 prototype integration 경계를 작업 시작 요약에 명시.
- [ ] Task 1만 먼저 착수. 첫 review 대상은 차량 상태·voice review·경위서 세 장면.
- [ ] Task 1 화면 검토 의견을 반영한 뒤 Task 2/3의 data·storage contract 고정.
- [ ] 실행 도중 승인·기록 보존·실제 연동 범위가 달라지면 해당 spec 항목과 test를 먼저 갱신.

## 이번 준비 작업의 확인 기록

- 현재 entry points, Session transition/storage, WorkflowPanel, catalog/CSS, Playwright config, 기존 recorder를 읽고 경로·검증 명령을 확인.
- Spec의 V1/V2/H1/R1/R2/R3/C1/C2/S1/S2/F1을 Task 4/5/6/7/8/9/10에 각각 연결. Catalog·storage·통합 검증은 Task 1/2/3/11/12에 배치.
- 새 code·dependency·media asset은 아직 만들지 않음. 문서 link·파일 경로·diff 검토만 이번 준비 작업에서 수행.
- 독립 builder check에서 legacy guard 충돌·기관별 identity·과거 요청 import·승인 최소 조건·녹음 중 긴급 전환을 발견. Spec §5/§6 S1/§7과 Task 2/4/6/9에 결정·검증을 추가.
- 후속 검토에서 공유 이력의 분리와 Blob 불변성을 추가 확인. Spec S2/§7, 공통 interfaces, Task 3/9에 반영.
- 상대 link·Markdown fence·공백·Task 1–12 연속성·V1–F1 총 11개 feature section·기존 target/test 경로 확인 완료. 제품 code가 없는 문서 작업이므로 build·browser·실기 test는 이번에 실행하지 않음.
