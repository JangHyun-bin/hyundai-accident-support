# 사고 대응 지원 · Web prototype

기본 진입 `/`는 차량·mobile **전체 여정**이다. `?study=emergency`는 공유 manifest의 긴급 상황 storyboard다. 실제 차량·전화·보험사 연계가 아니라 local 시연이며, 카메라·마이크·미디어·저장은 실제 browser API를 사용한다.

현재 계약·신뢰성 repair 실행 결과는 [전역 완료 추적](../../specs/after-care-system/completion.md)과 [32개 요구 상태](../../evidence/contract-reliability-repair/requirements.json)에서 확인한다. 과거 screenshot이나 PASS 기록을 현재 branch의 통과로 해석하지 않는다.

## 실행

Node.js 22.12 이상과 npm이 필요하다. Google Chrome은 browser 검사에 사용한다.

```sh
cd prototype/web
npm ci
npm run dev
```

개발 서버: <http://127.0.0.1:5173/>. 기본 명령은 loopback·strict port5173을 사용한다. 이미 다른 작업의 서버가 있으면 종료하지 말고 소유자와 실행 범위를 확인한다.

## 화면 경로

| 경로 | 역할 | production |
|---|---|---|
| `/`, `?study=journey` | 대표 전체 여정과8개 fixture | 제공 |
| `?study=emergency` | SC01–SC05·60개 장면 | 제공 |
| `?study=design-system` | 공용 token·component·layout catalog | 제공 |
| `?study=journey-catalog`, `?study=emergency-catalog` | 공용 catalog 진입 | 제공 |
| `?study=tools` | 네 디자인 도구의 과거 비교 | 제공 |
| `?study=legacy&view=focus`, `?study=legacy&view=context`, `?study=legacy&catalog` | 과거 행동/상황 중심·기준 비교 | 제공 |
| `?study=flow`, `interaction`, `vehicle`, `surroundings` | 독립 연구 화면 | DEV 전용; production은 기본 여정으로 이동 |
| `?study=response-alts&focus=surface`, `split`, `numeral` | surface·분할·숫자 연구 | DEV 전용 |
| `/studies/*.html` | 독립 재질 연구 | public 정적 자료 |

DEV 전용은 독립 연구 page 노출 범위다. 공용 FlowBoard·주변 상황 component는 실제 기본 여정에서도 사용한다. 기본 URL에서 `view`·`catalog`만 지정하는 오래된 링크는 legacy route를 선택하지 않는다.

## 긴급 상황과 상태

[상황 정본](../../specs/emergency-experience/scenarios.json)은 SC01 부상15·SC02 이동불가10·SC03 무응답12·SC04 보험 선택12·SC05 접수 미확인11, 총60개 장면이다.

- SC01/SC03 초기 장면은10초 뒤 구호 연결 시연으로 전환한다. 실제119 발신이 아니다.
- 연결·전송·접수·도착·인계는 다른 상태다. 외부 결과는 검토자가 명시적으로 공급한다.
- 요청 ID·전송 당시 승인 scope/기록·draft·기관별 상태를 구분한다. 조회는 전송 횟수를 늘리지 않는다.
- `나중에 이어하기`와 검토용 `시연 일시 중단`은 다르다. 업무 중단은 외부 요청 취소가 아니다.
- `3초 보기`는 검토 UI를 숨겼다가 가리는 이해도 검토 도구다. 실제 사용자 평가는 아직 수행하지 않았다.

Emergency 저장은 `after-care-session-v1-${scenarioId}` localStorage다. 같은 URL의 reload와 scene 없는 scenario 진입은 저장 세션 복원을 시도한다. 다른 scene 직접 선택은 fixture 진입이고 scenario 선택은 새 시연이다. 저장 차단 시 현재 화면의 메모리만 유지된다. 같은 scenario의 여러 탭을 revision으로 조정하는 기능은 없다.

## 전체 여정과 저장

차량 상태·안전 행동 → 사진·음성 → 영상·도식·경위서 → 전송 범위·승인 → 결과·정비 후속 처리 순서로 검토한다. 대표 화면의7단계와 도메인 stage(response/record/review/follow-up)는 다른 계층이다.

- 실제 사진 decode·MediaRecorder Blob·재생과 직접 진술 입력을 지원한다. 실제 녹음에서 STT나 사고 분석을 수행하지 않는다.
- case·media는 IndexedDB `after-care-journey-v1`의 같은 transaction에 보관한다. revision 충돌·quota·사용 불가·invalid를 구분한다.
- 사진은 JPEG/PNG/WebP·파일당15MiB·최대12장, case media는 승인/과거 이력 포함150MiB, 음성120초·진술5,000자·경위서100문장 상한이다.
- 승인 snapshot은 나중의 draft·정정과 분리한다. 저장 실패·충돌 recovery는 메모리이며 browser 강제 종료의 백업이 아니다.
- `case` URL은 이 browser의 기록을 가리킨다. device 보기 전환은 실제 기기 간 sync가 아니다. 저장소 삭제·다른 origin/device·누락 media에서 복원할 수 있다고 보장하지 않는다.
- 정비소·지도·대차·기관 전송 결과는 합성이다. 정비소 선택은 실제 예약이 아니다.

## 화면·접근성 기준

현재 화면은 `CareSurface`·공용 action/layout/token을 사용한다. 과거 고정1232×1152 app·두 flat box screenshot은 역사 자료다.

대표 wide 차량 display는 최대2560×1440의16:9이며 status bar와 dock을 포함한다. 단계·이전/다음·시연 설정은 display 밖 sibling이다. 환경이 허용하면 고정 editor slot 주변에서 surface만 이동한다. 좁은 환경·mobile·확대 text는 document profile을 사용하며16:9에 억지로 맞추거나 글자를 줄이지 않는다.

차량64/mobile48 CSS px target, 사용자 text 확대·keyboard·reduced motion을 유지한다. 이는 물리 dp/mm·실차 가독성 인증이 아니다. [Display 기준](../../docs/design-system/pleos-display-and-controls.md), [현행 시각 기준과 승인 원문 미확보 기록](../../docs/superpowers/specs/2026-11-12-figma-visual-contract.md)을 참고한다.

## 음성 안내

Browser TTS가 아니라 **사전 생성 JaeGyu/eleven_v4 MP3**를 정확한 원고로 lookup해 재생한다. 일반 장면 원고와 실제 저장·기관 상태에 따른 원고를 구별한다. 실제 저장 실패를 보관 성공으로, 거절을 보류로 설명하면 안 된다.

장면·안내 context 변경·pagehide·숨김·사용자 녹음 시작에서 이전 재생을 중단한다. 파일 부재·재생 실패는 정확한 원고와 오류를 표시하며 잘못된 MP3를 대신 재생하지 않는다. 필수 신규 자산이 없는 상태는 repair 완료가 아니다. 실제 자산 수·미생성 상태는 완료 추적을 따른다.

API key는 frontend·repo에 없다. 앱 실행은 local MP3를 사용하며, 생성 script는 별도 권한으로 provider를 호출한다. 자동 전사·decode·browser 재생과 사람 청취를 구분한다. 통화 spectrum은119 실제 audio 분석이 아니고, 사용자 녹음 meter와 다르다.

## 검사

```sh
npm run check
npm run test:ui
```

`check`는 TypeScript와 production build다. 별도 lint command는 없다. Playwright는 설치된 Chrome·Vite 개발 서버·기존 병렬 설정을 사용한다. 하나의 output directory에 여러 process를 동시에 실행하지 않는다. 진단 자료는 test별 outputPath·attachment로 남기며 `.audit` 선생성을 전제로 삼지 않는다.

Repo root의 manifest 검사:

```sh
node --test specs/emergency-experience/manifest.test.mjs
```

현재 실행한 명령·결과·raw evidence는 repair 결과에서 확인한다. `evidence/emergency-complete/`, `evidence/journey/final-review-2026-11-10/`와 과거 stable 결과는 해당 source의 기록이다. 마지막 과거 display 전체 실행394/395의 음성 최대시간 실패는 단독1/1 성공으로 해결된 것으로 취급하지 않는다.

## 영상 재생성

개발 서버와 Google Chrome·FFmpeg·FFprobe, 필요 시 Playwright FFmpeg가 준비된 상태에서 실행한다.

```sh
node scripts/record-emergency-flow.mjs /absolute/path/emergency-flow.mp4
node scripts/record-journey-flow.mjs /absolute/path/journey-flow.mp4
```

현재 recorder는 안내 음성을 mux한 전체 MP4와 timeline/검증 JSON을 생성한다. Emergency의 과거 `-app.mp4` 별도 crop·무음 출력 설명은 현행 script와 다르다. Journey는 두 device의 시연을 하나의 영상으로 연결한다. 앱/영상 생성 script는 실제 기관 API를 호출하지 않는다. Emergency는 같은 stem의 JSON만 존재하는 경우 덮어쓰기 방어가 부족하므로 새로운 출력 stem을 사용한다.

Script 존재가 최종 영상 제작·사람 청취 완료를 의미하지 않는다. 최신 전체 공통 음성 포함 E2E 영상은 전역 goal의 별도 완료 항목이다.

## 출처와 한계

[Source·license](SOURCES.md), [원래 전역 목표](../../specs/after-care-system/goal.md), [완료 추적](../../specs/after-care-system/completion.md)을 함께 읽는다. 실제 Pleos/AAOS 권한·GPU·차량 audio focus·안전 문구 승인·개인정보 운영 정책·사용자 이해도·기기 간 동기화는 이 local prototype의 검증 범위 밖이다.
