# Contract reliability repair 실행 결과

상태: **필수 신규 음성 부재로 merge 차단 · 독립 리뷰 P2 두 건 closure · Draft PR #11 생성**. raw 실행 시각은 UTC다. 32개 수용 기준과 필수 gate를 모두 충족하기 전에는 merge하지 않는다.

- 실행 지시: [goal query](../plans/2026-11-12-contract-reliability-repair-goal-query.md), [32개 계약](../specs/2026-11-12-contract-reliability-repair-design.md)
- 기준: `2ed19146d500882fd11211f65b660f91336015eb`; branch: `fix/contract-reliability-repair`
- 최종 검증 제품·검사 commit: `2bd7c258187772399bacfe62fdb8b6f3254c642a`
- [명령·exit·실행 commit](../../../evidence/contract-reliability-repair/run.json), [32개 요구 판정](../../../evidence/contract-reliability-repair/requirements.json)
- 현재 로컬 preview: [Journey](http://127.0.0.1:5185/?study=journey&device=mobile), [실제 browser 관찰](../../../evidence/contract-reliability-repair/preview.json). 작업 소유 `RepairPreview` 서비스만 사용자 확인용으로 유지한다.

## 검증 결과

| 검사 | 실제 결과 | 원시 근거 |
|---|---|---|
| root check/model/review/server | 4종 성공: graph13/17, model826, review48/70·5 walkthroughs, server1 | [원문](../../../evidence/contract-reliability-repair/checks/) |
| 공유 manifest | 12/12 | [원문](../../../evidence/contract-reliability-repair/checks/manifest.txt) |
| audio generator/recording scripts | 5/5 | [원문](../../../evidence/contract-reliability-repair/audio/audio-script-tests.txt) |
| clean TypeScript/production build | `npm run check` 성공 | [원문](../../../evidence/contract-reliability-repair/web/web-build-clean-review.txt) |
| 최신 clean Web full | **434/447**, 실패13·skip0, 기본5 workers. 실패는 전부 신규 음성4개 누락 | [원문](../../../evidence/contract-reliability-repair/web/web-full-review.txt) |
| 리뷰 P2 직접 회귀 | 33/33, 기본5 workers. 지연된 실제 read/write 완료와 편집 잠금·recovery·durable 근거 선택 | [원문](../../../evidence/contract-reliability-repair/web/web-targeted-review-fix2.txt) |
| 영상 read/commit 회귀 | 14/14; 통제된 실제 저장 경계와 native playback·도식·reload 보존 | [원문](../../../evidence/contract-reliability-repair/web/web-reconstruction-fix1.txt) |
| Android build | debug·instrumentation APK build 성공 | [원문](../../../evidence/contract-reliability-repair/android/android-build-fix2.txt), [두 APK 지문](../../../evidence/contract-reliability-repair/android/final-apk-fingerprints.json) |
| 실제 API28 ARM64 · emulator-5556 | 41/41, failure/error/skip0, 정상 shader fallback | [XML](../../../evidence/contract-reliability-repair/android/api28-instrumentation.xml), [화면](../../../evidence/contract-reliability-repair/android/api28-suspended.png) |
| 실제 API35 ARM64 · emulator-5554 | 41/41, failure/error/skip0, 지원 Satin shader | [XML](../../../evidence/contract-reliability-repair/android/api35-final-instrumentation.xml), [화면](../../../evidence/contract-reliability-repair/android/api35-final-suspended.png) |
| 기존 음성만의 offline decode | 기존64/64 hash·sidecar·duration·ffmpeg decode 성공. 전체 C05 통과가 아님 | [원문](../../../evidence/contract-reliability-repair/audio/audio-existing-decode.txt) |
| 전체 offline audio 검증 | 필수4개 누락으로 실패 | [원문](../../../evidence/contract-reliability-repair/audio/audio-offline.txt) |

Android UI는 SC05의 11개 state 전체다. SC01–SC04는 parser 지원만 하며 native 제품 UI 이식을 주장하지 않는다. 전체 공유 manifest는 5개 scenario·60개 scene, Journey는 8개 fixture다. 실제 기관/차량 API나 기기 간 동기화는 없다.

실행 환경은 macOS26.6.2 arm64, Node25.0.0, Chrome157.0.8103.78, Python3.9.6, ffmpeg8.1.1, JDK25.0.2, Gradle9.6.0, SDK/API28·35다. [preflight](../../../evidence/contract-reliability-repair/preflight.json)와 [Android 환경](../../../evidence/contract-reliability-repair/android/environment.json)을 함께 본다. 환경 파일의 최초 준비 상태를 최종 검사 결과로 재해석하지 않는다.

## 수정·실패 원인

- Android: typed 공유 schema, override/effect·복수 action·승인 snapshot·기관별 누적 상태·suspend/resume·전체 recreation을 연결했다. 조회/재개는 재전송하지 않는다.
- 기록: 공통 durable 성공의 URL publication, statement identity/revision 동기화, dirty/IME/pending audio recovery, 100문장 제한의 명시적 거절, 실패 시 draft 유지.
- 안내: 실제 storage/기관 상태의 공통 resolver와 context 소유권. 거절을 보류로 읽지 않고 저장 실패를 성공으로 읽지 않는다. 초기 countdown audio의 persistence key race도 수정했다.
- 영상: commit 전 Blob miss를 asset ID에 영구 캐시하던 결함을 durable revision 기준으로 무효화했다. 유효 bytes는 다시 읽지 않는다.
- 검증: `.audit` 전제를 없애고 실행별 output을 격리했다. 고정350ms 대신 실제 native encoder readiness를 관찰한다.

[인과 분석](../../../evidence/contract-reliability-repair/failure-analysis.md)은 native encoder 통제 실험의 빈 Blob/error 대 유효 decode/review, targeted와 병렬 full을 연결한다. **유실된 과거 PR #10 trace의 유일한 interleaving을 복구했다고 주장하지 않는다.** 초기 API28 focus fixture, Node JSON import, TS fixture 타입, 정적 cue pin, 초기 음성 key race, 영상 read/commit 실패와 잘못 호출한 build 명령도 raw에 남겼다.

## 실제 browser 관찰 범위

- [합성 진술 UI 저장·동일 case URL reload](../../../evidence/contract-reliability-repair/web/manual-browser.json)
- [SC04 거절→지원→중단 및 실제 기존 declined MP3 재생 진입](../../../evidence/contract-reliability-repair/web/manual-emergency.json)
- [무 Audio mock의 실제 countdown fallback](../../../evidence/contract-reliability-repair/web/manual-native-autoplay.json). 관찰 시 user activation이 true였으므로 무 activation이나 유일한 차단 원인을 주장하지 않는다.
- [실제 native MP4 재생·decode 상태](../../../evidence/contract-reliability-repair/web/manual-clip.json), [나중의 자연 종료 화면](../../../evidence/contract-reliability-repair/web/manual-clip.png). screenshot만으로 timing을 판단하지 않는다.

저장 실패·2탭 conflict·IME·100/101 경계와 viewport/font/keyboard/reduced-motion은 full의 실제 Chromium UI 회귀로 검사했다. 별도 managed Chrome 관찰을 모든 조합의 수동 평가로 표현하지 않는다. 실제 사람 청취·물리 차량·OS IME 후보창 평가는 하지 않았다.

## 신규 음성: 명시적 merge 차단

필수 원고4개·총251 codepoint다. 기존 로컬 ElevenLabs key 파일과 환경변수에서 사용 가능한 자격을 찾지 못했고 authenticated browser relay도 연결되지 않았다. **TTS HTTP0회, 신규 MP3/sidecar0개**다. quota를 확인하거나 사용했다고 주장하지 않는다.

[권한·사용량](../../../evidence/contract-reliability-repair/audio/authority.json), [정확한 누락 원고·hash](../../../evidence/contract-reliability-repair/audio/missing-assets.json)에 남겼다. 허용 상한은 기존 JaeGyu/eleven_v4, 신규4문장·1,200 codepoint·실패 포함4 TTS HTTP 호출이다. 새 결제·key 권한 확대·다른 유료 API는 하지 않았다. 가짜 파일·다른 원고·skip·fallback으로 C05를 닫지 않는다. C01/C03의 의미 선택 회귀가 실행됐어도 필수 신규 실제 음성 재생까지 완료했다고 기록하지 않는다.

## 원시 증거와 source 관계

[artifact index](../../../evidence/contract-reliability-repair/artifact-index.json)는 14개 실행·557개 파일·466,100,243 bytes를 연결한다. 실패 trace, 원시 frame JSON, 실제 recorder WebM/진단, PNG를 tracked 경로에 보존하고 Android XML과 audio 검사도 함께 보존한다. 개인 절대경로만 명시적으로 정규화하고 원본/공개 SHA를 둘 다 남겼다. 525개 파일은 byte-identical이며 media/numeric frame payload는 바꾸지 않았다. 초기 dot reporter의 inline JSON 미보존도 숨기지 않는다. 원래 11개 실행을 덮지 않고 review 산출물 3개 그룹을 추가했다. 최대 trace 56.62MiB의 GitHub 권장 크기 경고는 있었으나 push는 성공했으며 새 유료 LFS/CI는 도입하지 않았다.

[source-sha256.json](../../../evidence/contract-reliability-repair/source-sha256.json)의 410개 입력 mapping SHA-256은 `bd915f03442699a5c24cd08864643b2cf22583e1a17706a5e0673bc68cdef27f`이다. [검사별 입력 동일성](../../../evidence/contract-reliability-repair/source-input-relation.json)은 root/manifest·audio scripts·Android의 이전 실행 입력과 최종 입력이 같음을 연결한다. 원본 board/archive/assets·공유 JSON·보호한 preset/token 입력60개는 기준 commit과 동일하다. C guidance caller인 ResponseLayoutPreview 수정은 불변으로 위장하지 않는다.

증거·문서만 추가한 후속 HEAD는 실행한 제품 commit과 다르다. [A/D 전범위 리뷰](../../../evidence/contract-reliability-repair/review/native-docs.json)와 [B/C/E 전범위 리뷰](../../../evidence/contract-reliability-repair/review/web-initial.json)는 `e9a463f66400e9d5f51465336e5069695bd37fb7`를 대상으로 했다. [P2 수정 독립 closure](../../../evidence/contract-reliability-repair/review/web-closure.json)는 최종 제품 source `2bd7c25`를 검토했다. 두 P2는 닫혔으나 전체 repair의 merge 승인은 아니다. [Draft PR #11](https://github.com/JangHyun-bin/hyundai-accident-support/pull/11)의 본문·영구 관찰 comment에 정확한 최종 head/base·실행 source·지문을 별도로 기록하며 merge/auto-merge는 실행하지 않는다. [생성 시 원격 관찰](../../../evidence/contract-reliability-repair/github-pr-created.json)은 당시 head의 역사 snapshot이지 최종 head라고 위장하지 않는다.

## 독립 리뷰에서 추가로 해결한 경계

최신 기록을 읽는 동안 편집 가능해 snapshot 뒤 입력이 유실되던 경계는 수집/읽기/adopt 전 구간의 editor 잠금으로 닫았다. voice/photo/review/submission의 기존 DOM은 유지하고 native focus/keyboard 입력을 막으며 finally에서 해제한다. 119/긴급 surface는 잠금 밖이다. 경위서 저장 중 근거 checkbox가 바뀌던 경계는 textarea/action과 같은 saving 잠금으로 닫았다.

[실제 지연 I/O 회귀 자료](../../../evidence/contract-reliability-repair/web/raw/review-targeted/)와 최신 full이 해당 경로를 통과했다. dedicated held-load runtime은 normal layout을 사용하고 representative layout은 동일 workspace 배치를 독립 source review로 확인했다. 이 차이를 모든 조합의 수동 실험으로 표현하지 않는다.

## 전역 목표와 승계

[completion.md](../../../specs/after-care-system/completion.md)는 원래 goal의 각 항목과 repair32개를 분리한다. 누락 시각 계약은 [현행 구현 기준 재구성](../specs/2026-11-12-figma-visual-contract.md)이며 승인 원문 복원본이 아니다. 과거 PASS·영상·청취 체크를 최신 성공으로 재사용하지 않는다. 신규 전체 E2E 영상, 사람 청취, 실차 평가와 제품화 의사결정은 여전히 미완료다.

[최종 문서·증거 독립 closure](../../../evidence/contract-reliability-repair/review/native-docs-closure.json)는 후보 `3e1b9f2`의 D05·원시 보존·source 연속성을 확인했다. 이후 status-only 문서 지문은 다시 검사하고 최종 게시 head/base·410개 동일 입력·32개 판정을 영구 PR 본문/comment로 연결한다. 이는 C01/C03/C05·E03의 미충족을 면제하거나 merge를 승인하지 않는다.
