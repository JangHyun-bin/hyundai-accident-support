# 실패 인과 분석과 원시 증거

최종 제품·검사 입력: `e76c9bcd7a91aa6ebc7dd9925e2840dd3e9e1fe5`. 최신 clean 전체 실행은 **432/445**, 실패 13개는 필수 신규 음성 4개 누락이다. maximum-duration과 영상 복원 경로는 이 병렬 전체 실행에서 통과했다. 전체 gate 성공이나 merge를 주장하지 않는다.

## 1. 과거 maximum-duration 실패의 경계

[과거 display 기록](../../docs/design-system/pleos-display-and-controls.md)과 [회수한 PR #10](historical-pr10.json)은 마지막 전체 394/395, 저장 버튼 timeout, 같은 source 단독 1/1, 원인 미확정을 기록한다. [당시 원시 증거 회수 결과](historical-evidence.json)에는 실패 trace·Blob·phase가 없다. 과거 395/395와 마지막 394/395는 다른 실행이다.

**과거 PR #10의 유일한 실제 interleaving은 회수하지 못했다.** 아래 통제 실험은 현재 코드의 인과 경로를 실제 encoder로 재현한 것이며, 잃어버린 과거 trace를 복원하거나 당시 원인을 유일하게 증명한 것이 아니다.

## 2. 서로 다른 clock과 확인된 causal mechanism

UI 제한은 `Date.now()`와 listening effect의 interval이다. `page.clock.fastForward(120100)`은 native AudioContext와 MediaRecorder에 실제 120초의 audio frames를 공급하지 않는다. 기존 검사의 고정 350ms는 encoder readiness 조건이 아니었다. `start(250)`의 timeslice도 첫 유효 chunk의 최대 도착 시간을 보장하지 않는다.

[실행 프로그램](web/encoder-experiment/experiment.mjs), [전체 원시 결과](web/encoder-experiment/result.json), [명령 원문](web/web-encoder-causal.txt)은 같은 native MediaRecorder와 실제 oscillator stream에서 source를 시작 전 suspend하고, 종전 350ms 기준 뒤 application clock을 전진시키는 비교다. encoder·event·bytes를 mock으로 대체하지 않았다.

| 전략 | 실제 Blob | UI 결과 | 저장 action |
|---|---|---|---|
| 기존 350ms 기준만 충족, native source 미준비 | 0 bytes | `error` | 없음/비활성 |
| source resume 후 native 유효 data·source clock 확인 | 실제 비어 있지 않은 WebM, browser decode frames/duration 양수 | `review` | 활성 |

빈 chunks → `Empty recording` rejection → 신규 pending clip 없는 error phase → 저장 버튼 없음이라는 제품 경로와 원래 관찰의 증상이 일치한다. 이 비교는 **readiness 결함의 원인·결과와 수정 효과를 직접 관찰**한다. 병렬 CPU 부하 자체를 당시 원인으로 단정하지 않는다.

## 3. 수정과 실제 녹음 계약

[recorder helper](../../prototype/web/tests/helpers/voice-recorder.ts)는 원래 constructor·start/stop·events를 관찰하고 다음을 기다린다.

- native non-empty `dataavailable`, live/unmuted track, running source AudioContext 및 진행한 audio clock.
- 그 뒤 application 최대시간 전환 → review → 저장 가능 → 실제 Blob bytes·decode frames/duration 양수.
- native stop 1회, 모든 track ended, 자동 durable audio 저장 0개.
- 별도 두 번째 녹음의 pagehide 종료와 held-source 회귀도 실제 encoder를 사용한다.

고정 sleep을 늘리지 않았고 retry·timeout·기본 worker 수를 바꾸지 않았다. production recorder에 근거 없는 재시도나 지연을 추가하지 않았다. UI의 120초 제한을 가속 검증하며, 첨부 WebM이 실제 120초 분량이라는 뜻은 아니다. native WebM duration의 `Infinity`와 AudioContext decode의 유한 duration을 구분한다.

증거는 [raw/full](web/raw/full/)과 [raw/recorder-states](web/raw/recorder-states/)의 maximum-duration 두 폴더에 있다. `recorder-timeline.json`, `reviewed-recording.json`, 실제 `.webm`, held-source JSON을 보존했다. targeted와 최신 기본 5-worker full 모두 해당 경로가 통과했다. 초기 dot reporter가 inline-body JSON을 별도 파일로 남기지 않은 한계도 [artifact index](artifact-index.json)에 명시했다. 최종 helper는 JSON 파일을 먼저 쓴 뒤 attachment로 연결한다.

## 4. 새 전체 실행에서 발견한 초기 자동 음성 소유권 결함

초기 persistence가 미확정인 render의 key로 자동 재생을 시작한 뒤 layout persistence 결과가 key를 바꿔 재생을 취소했다. 첫 결과 callback도 이전 key 소유라 fallback 원고가 비어 있었다. persistence가 해당 selection에 대해 확인된 뒤 countdown 진입당 한 번 재생하도록 분리했다. countdown·beep·119 timer는 바꾸지 않았다.

[28/28 회귀 원문](web/web-countdown-fix1.txt), [실제 native Chrome 관찰](web/manual-native-autoplay.json), [화면](web/manual-native-autoplay-fallback.png)을 남겼다. 실제 Chrome은 명시한 autoplay policy와 무 mock 상태에서 정확한 10초/119 fallback 원고를 표시했다. 관찰 시 user activation은 true였으므로 무 activation 상태나 유일한 차단 원인을 증명했다고 하지 않는다. 최신 full에서도 이 경로는 통과했다.

## 5. 새 전체 실행에서 발견한 영상 asset read/commit 결함

이전 full의 추가 실패는 `journey-reconstruction`에서 저장이 끝난 뒤에도 전방 영상 재생 버튼이 없는 상태였다. [실패 원문](web/web-full-final.txt), [실패 trace](web/raw/full-before-clip-fix/journey-reconstruction-jou-67cea-ithout-losing-urgent-drafts/trace.zip)를 보존했다.

`useJourneyCase.save`는 metadata를 낙관적으로 먼저 표시한다. `StoredClip`은 Blob을 durable storage에서 읽되 case/asset ID만으로 effect를 실행했으므로, commit 전의 `null` 조회가 commit 뒤에도 영구 캐시됐다.

[통제 실패](web/raw/reconstruction-red/journey-reconstruction-jou-67cea-ithout-losing-urgent-drafts/asset-read-commit-boundary.json)는 실제 metadata transaction의 완료 callback 전달을 보류한다. 원래 event·IndexedDB write·MP4 bytes는 대체하지 않는다. native 조회는 처음 `null`; 보류 해제 후 같은 ID가 revision 7의 실제 106,292-byte 전방 영상으로 저장됐는데도 조회는 1회뿐이고 UI는 재생 불가였다. [실패 명령](web/web-reconstruction-causal-red2.txt)이 같은 증상을 재현했다. 앞선 fixture 준비 실패도 `raw/reconstruction-setup`에 그대로 남겼다. 자료/진술 없는 경위서 시연 event는 의도된 no-op여서 보류할 write가 없었으며, 실제 observation write를 쓰도록 fixture를 고쳤다.

수정은 **durable revision이 바뀌면 이전 miss를 무효화**하고 case ID도 cache identity에 포함한다. 이미 읽은 immutable Blob은 다시 읽지 않으며, 저장 대기 중 miss를 영구 파일 실패로 설명하지 않는다. timer retry나 오류 억제가 아니다. [관련 14/14](web/web-reconstruction-fix1.txt), [최신 full](web/web-full-final2.txt), [실제 Chrome native playback](web/manual-clip.json), [실제 화면](web/manual-clip.png)을 보존했다. 수동 screenshot은 재생 관찰보다 나중의 자연 종료 화면이며 timing 증거가 아니다.

## 6. 깨끗한 실행과 보존 범위

clean detached checkout에서 별도 `npm ci`를 수행했고 `.audit` 없이 기본 병렬성을 유지했다. normal-motion은 `testInfo.outputPath`의 실제 frame JSON과 screenshot을 남긴다. 초기 build/collection/fixture 오류와 이후 수정 실행을 삭제하지 않았다. 잘못 호출한 `npm run build`는 없는 script 오류이며, 실제 정식 `npm run check` 성공과 구분한다.

[artifact index](artifact-index.json)는 11개 실행의 436개 파일, 원본 output → 영구 경로, 원본/공개 SHA-256을 기록한다. 공개 자료에서는 개인 절대경로와 대응 source-map 경로만 정규화했다. trace source/resource 식별자도 일치하게 갱신하고 ZIP CRC·JSON을 검사했다. binary media와 numeric timing/frame payload는 합성·수정하지 않았다. 405개 파일은 byte-identical 복사다. 원본 로컬 자료는 공개 복사본과 별개로 보존했으며 유일한 근거가 아니다.

최신 전체 실패 13개는 모두 C05 asset 부재이며 숨기지 않는다. [요구별 상태](requirements.json), [검증 입력 지문](source-sha256.json), [검사별 입력 동일성](source-input-relation.json), [실행 원문](run.json)이 최종 판정 근거다. 독립 review와 PR 상태는 실행 결과 문서에 따로 연결한다.
