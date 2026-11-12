# Maximum-duration 실패 분석과 검증 증거 계약

상태: **소스 분석 및 검사 수정 완료, 실행 결과 미수집**. 이 문서는 E02의 원인 확정·targeted/full 통과를 주장하지 않는다. 구현 worker는 baseline 재현, 테스트, build, formatter를 실행하지 않았다. 실제 S2/S3 결과와 원시 산출물 연결은 통합 검증 담당이 확정한다.

## 1. 관찰 사실과 근거의 한계

| 구분 | 근거 | 확인된 사실 |
|---|---|---|
| 과거 실행 기록 | [`pleos-display-and-controls.md`](../../docs/design-system/pleos-display-and-controls.md)의 마지막 전체 실행 기록 | 전체 394/395, `journey-voice.spec.ts` maximum-duration에서 저장 버튼을 찾지 못했다. 같은 source의 단독 실행은 1/1이었다. 앞선 전체 395/395와 마지막 실패 기록은 다른 실행이다. |
| 회수한 원격 기록 | [`historical-pr10.json`](historical-pr10.json), [PR #10](https://github.com/JangHyun-bin/hyundai-accident-support/pull/10), merged 2026-11-12T02:53:33Z | PR body에도 full 394/395, save button timeout, 동일 source 단독 1/1, 원인 미확정만 기록되어 있다. 당시 phase/Blob/trace는 포함하지 않는다. |
| 현재 checkout 탐색 | 작업 시작 시 `prototype/web/test-results/**`, `prototype/web/.audit/**` 경로 탐색 | 해당 경로에 과거 실패 artifact가 없었다. 실패 당시 trace, screenshot, error-context, recorder event, Blob bytes, phase를 직접 읽지 못했다. |
| 과거 임시 산출물 탐색 | 통합 담당의 알려진 `/tmp` 산출물 경로 탐색 보고 | 원시 실패 자료를 회수하지 못했다. 이 항목은 worker가 직접 탐색한 결과가 아니라 통합 담당의 회수 결과 보고다. |
| 소스 분석 | [`journey-voice.spec.ts`](../../prototype/web/tests/journey-voice.spec.ts), [`VoiceRecordPanel.tsx`](../../prototype/web/src/journey/VoiceRecordPanel.tsx), [`voice-capture.ts`](../../prototype/web/src/journey/voice-capture.ts) | 종전 검사는 `page.clock.install()` 후 고정 350ms를 기다리고 application clock을 120100ms 전진시켰다. 실제 encoder 완료 조건을 관찰하지 않았다. |

**확정하지 않은 것:** 과거 실패에서 빈 Blob, recorder error, listening timer 미설치, 예상치 않은 pagehide/visibility 변화 중 무엇이 발생했는지. 단독 green 또는 향후 targeted green만으로 이를 확정하지 않는다.

## 2. 소스에서 확인한 메커니즘

1. **서로 다른 시간:** UI 제한은 `Date.now()`와 listening effect의 100ms `setInterval`로 계산된다. `page.clock.fastForward(120100)`은 이 시간을 전진시키지만 native `AudioContext.currentTime`, 실제 audio frames, `MediaRecorder` encoder의 작업을 120초 수행하지 않는다.
2. **준비 상태:** fixture는 oscillator → gain → `MediaStreamAudioDestinationNode`의 실제 stream을 제공한다. 제품의 `MediaRecorder.start(250)`에 전달하는 250ms timeslice는 이벤트 도착의 최대 지연을 보장하지 않는다. listening UI나 analyser의 양수 level도 `dataavailable`의 유효 bytes를 보장하지 않는다. 따라서 고정 350ms 대기는 encoder readiness의 증거가 아니었다.
3. **빈 결과 경로:** 제품은 non-empty `dataavailable`만 chunks에 넣는다. `stop()`은 native stop을 요청하고 즉시 stream tracks를 해제한다. `onstop`에서 만든 Blob이 비면 `Empty recording`으로 reject한다. 이 rejection을 panel은 `error` phase로 처리하며, 신규 진술·pending clip이 없으면 저장 버튼 대신 녹음 시작 UI를 그린다. 이는 **저장 버튼이 없는 상태를 만들 수 있는 소스상의 확정 경로**이지, 과거 실행이 반드시 이 경로를 탔다는 관찰은 아니다.
4. **stop/finished 경쟁:** `finishRecording`은 active ref를 먼저 비우고 `stopPromise`를 공유한다. `active.finished` callback은 capture identity를 검사한다. capture adapter도 `stopped`와 동일 result Promise를 사용한다. 이 소스에는 timer/finished 동시 완료로 중복 clip을 만든다는 확정 근거가 없다. 새 검사는 native stop call 1회와 clip 1개를 검사한다.
5. **effect·cleanup:** listening interval은 React effect에서 설치된다. UI listening만으로 effect 설치 시점을 단정하지 않는다. stage 변경과 pagehide는 녹음 종료를 요청하고 unmount는 cancel한다. 이 panel은 visibilitychange 자체를 녹음 종료 조건으로 사용하지 않는다. 새 계측은 phase, visibilitychange, pagehide, native stop/data/error를 별도 기록한다. fixture track cleanup도 반복 stop에 안전하게 변경했다.
6. **Blob·phase·저장:** save action은 review의 pending clip/text와 busy 상태에 의존한다. review 진입, 실제 clip bytes/decode, tracks 종료, durable audio 미저장을 각각 검사해야 하며 버튼 enabled 하나로 대신하지 않는다.

## 3. 원인 판정과 수정 범위

- **확정한 검사 결함:** 실제 encoder readiness와 무관한 고정 sleep 뒤 다른 clock을 전진시켰다. 수정은 그 sleep을 늘리는 것이 아니라 native non-empty `dataavailable`, live/unmuted audio track, running source AudioContext와 진행한 audio clock을 관찰하는 것이다.
- **과거 실패의 원인:** **미확정**. 회수한 PR #10 원문도 원인이 확정되지 않았다고 명시한다. 위 readiness 결함이 과거 394/395의 직접 원인이었는지는 phase/Blob/trace 부재로 증명하지 못했다. 전체 병렬 부하는 가능한 지연 요인이지 관찰된 원인으로 쓰지 않는다.
- **제품 변경:** 이 검사 트랙에서는 제품 소스를 바꾸지 않았다. 새 실행에서 제품 결함이 드러나면 해당 trace/phase/bytes/event order를 보존하고 recorder 제품 owner에게 causal fix를 넘긴다.
- **승인하지 않는 결론:** 단독 재실행 성공, timeout/retry/worker 조정, 빈 encoder mock, 고정 sleep 증가로 E02를 닫지 않는다. targeted/full에서 모두 통과해도 과거 원인과의 관계는 별도 근거로 판정한다.

## 4. 작성한 회귀와 진단

[`helpers/voice-recorder.ts`](../../prototype/web/tests/helpers/voice-recorder.ts)는 native constructor·stream·event bytes를 대체하지 않고 start/stop 호출과 native events를 관찰한다. 실제 microphone hardware 대신 합성 tone을 사용하지만 실제 Chrome `MediaRecorder` encoding 경로를 유지한다. 일반 fixture는 source context resume을 기다리며, 아래 통제 회귀만 의도적으로 native source를 suspend한다.

- maximum-duration: 최초 non-empty encoded data 확인 → application clock 전진 → review → 저장 action enabled → 실제 review Blob bytes 및 browser decode frames/duration 양수 → native stop 1회 → tracks 전체 ended → durable case audio 0개.
- controlled readiness regression: 실제 AudioContext를 suspend한 채 live stream으로 native recorder를 시작한다. 과거의 **동일한 350ms** 동안 기다리고 application clock도 전진시킨 뒤, source clock이 전혀 진행하지 않고 source가 여전히 suspended인데 recorder/track은 recording/live인 상태를 검사한다. `held-source-after-legacy-threshold` attachment를 남긴다. 이 350ms는 readiness 대기나 지연 증가가 아니라 과거 가정의 반례를 관찰하는 고정 실험 구간이다. source를 명시적으로 resume한 뒤에만 실제 encoded data를 기다리고 maximum-duration → review → decode 양수 → tracks ended → 자동 저장 없음 계약을 검사한다. fake audio bytes나 recorder mock은 사용하지 않는다. 이 반례는 sleep/가상시간만으로 real audio readiness를 보장할 수 없음을 검증하도록 작성했지만, **실행 전이며 당시 full 실패의 root cause를 재현했다고 주장하지 않는다.**
- 두 번째 녹음도 실제 encoded data 확인 뒤 pagehide → review → clip 2개 → tracks 전체 ended. 저장 성공 안내가 없어야 한다.
- 다른 실제 녹음 경로의 종료·중단·저장도 첫 encoded data를 기다린다. WebM 승인 검사는 두 native chunks를 기다린 뒤 기존 bounded-range 검증을 유지한다. unexpected microphone ending의 고정 350ms도 같은 readiness 조건으로 교체했다.
- `recorder-timeline.json`: 최대 시간 검사 finally에서 기록. native event별 bytes/state, 원본 monotonic clock과 application Date, phase/visibility, stop call 수, audio source 상태/currentTime, track 상태, 최종 UI phase/message/clip 수를 포함한다.
- `maximum-duration-recording.webm`: review UI의 실제 Blob URL에서 읽은 bytes. decode 실패여도 bytes와 decode error metadata를 먼저 attachment로 보존하고 검사는 실패시킨다.
- `reviewed-recording` JSON attachment: bytes, MIME, native duration 문자열, decode duration/frames/channels/sampleRate 또는 decode error. native WebM duration의 Infinity는 decode 결과와 구별한다.

**시간 해석:** 이 검사는 application의 120초 제한을 실제 encoder와 함께 가속 검증한다. 첨부 파일이 실제 120초 분량이라고 주장하지 않는다. 실제 encoded duration과 UI의 최대시간 metadata는 서로 다른 시간이다.

## 5. 출력 경로와 재현 운용

[`stable-voronoi-motion.spec.ts`](../../prototype/web/tests/stable-voronoi-motion.spec.ts)는 `testInfo.outputPath('stable-voronoi-normal-motion.json')`으로 raw frames를 쓰고 그 파일을 `normal-motion.json` attachment로 연결한다. `.audit` 디렉터리·marker·사전 mkdir는 필요하지 않다. frame assertions는 기존 geometry·text·opacity 계약을 그대로 유지한다.

[`playwright.config.ts`](../../prototype/web/playwright.config.ts)의 기본 outputDir는 UTC 시각과 process PID를 포함하는 `test-results/run-…`이다. 각 test의 outputPath는 그 아래 test/worker별 경로를 사용한다. 서로 다른 Playwright process가 기본 `test-results` 하나를 지우거나 덮어쓰지 않는다. 명시적인 경로는 `PLAYWRIGHT_OUTPUT_DIR`로 지정할 수 있으며, 실행마다 다른 경로를 선택한다. 병렬성, retries, timeout은 변경하지 않았다.

통합 담당의 S2/S3 명령은 [실행 계획](../../docs/superpowers/plans/2026-11-12-contract-reliability-repair.md)의 전체 targeted/full gate를 따른다. 아래는 **미실행한 E 범위 명령 예시**이며 full gate를 대체하지 않는다. `prototype/web`에서 실행한다.

```sh
PLAYWRIGHT_OUTPUT_DIR=test-results/contract-reliability-repair-targeted npm run test:ui -- tests/journey-voice.spec.ts tests/stable-voronoi-motion.spec.ts
PLAYWRIGHT_OUTPUT_DIR=test-results/contract-reliability-repair-full npm run test:ui
```

clean 환경의 E01은 `.audit` 부재를 기록한 상태에서 normal-motion을 실행하고 raw frame attachment가 실제 생성되었는지 확인한다. 동시 Playwright 실행은 하지 않는다. 같은 source를 반복 실행해 green을 고르지 않는다.

## 6. 통합 검증 담당이 채울 증거

현재 아래 항목은 모두 **미수집**이다. 미래 경로를 실제 실행 증거로 읽지 않는다.

| 항목 | 수집할 내용 |
|---|---|
| S2 targeted / S3 full | 실제 명령, UTC 시각, exit status, pass/fail/skip 수, 기본 병렬성, tested commit, 각각 다른 outputDir, 원문 `.txt` |
| E01 clean output | `.audit` 부재 확인, normal-motion의 실제 raw frame JSON/attachment, 대표 screenshot |
| E02 event order | first non-empty data → before-maximum-duration → native stop 1회 → final data/stop → review, clip bytes/decode, track ended, durable audio 0개 |
| E02 controlled readiness | `held-source-after-legacy-threshold`: 350ms 이후 suspended source/정지 audio clock과 recording/live 상태, resume 이후 최초 실제 data/유효 decode. 과거 실패 원인과 이 통제 실험의 범위를 구별 |
| 실패 발생 시 | 실패한 source와 원문 trace/error context/timeline/blob를 보존. 수정 후 영향 gate를 다시 실행하되 실패 artifact는 삭제하지 않음 |
| 영구 보존 | outputPath의 원본과 attachment를 `web/targeted/`, `web/full/`의 서로 다른 경로에 복사하고 원본 outputPath → 영구 상대 경로 매핑 |
| 원인 closure | 과거 기록과 새 관찰을 구별하고 causal fix 설명·controlled regression·병렬 full 결과를 연결. 미확정이면 E02 미충족을 유지 |

manifest 계약은 스펙 [§7.4](../../docs/superpowers/specs/2026-11-12-contract-reliability-repair-design.md#74-영구-증거-계약)을 따른다.

- `run.json`: UTC, OS/arch/toolchain, tested commit/base, 명령/exit/result counts, 환경·미검증 범위, test output → permanent evidence mapping.
- `source-sha256.json`: 제품·tests·config·공유 JSON·음성/media 자산의 path/SHA-256. evidence 자체는 hash 집합에서 제외한다.
- `requirements.json`: 각 A/B/C/E/D 요구 ID의 실제 status, 검사 명령, 원시 evidence 경로, review closure. 구현 존재만으로 verified 처리하지 않는다.
- evidence/docs만 후속 commit했다면 tested commit과 최종 HEAD를 구분한다. runtime/test/config/asset 변경 시 관련 gate와 지문을 갱신한다.

E01–E05의 실제 상태 확정과 source fingerprint·review·merge 대상 일치 검증은 통합 단계의 책임이다. 이 초안은 이를 선행 통과로 기록하지 않는다.
