# 2026-11-13 repo 정리 결과

`25e07b399bc8f38cc7b56bf4fb8397dd5d315149` 이후의 문서·미사용 source·검증 ZIP 보관·필수 안내 음성 정리 결과다. [실행 요약](verification.json)은 이번 source의 검사다. PR #11 당시 [28 verified·3 blocked·1 unmet 판정](../contract-reliability-repair/requirements.json)은 역사 기록으로 그대로 보존한다.

## 현재 실행

| 검사 | 관찰한 결과 |
|---|---|
| Web `npm run check` | TypeScript·production build 통과. 큰 JavaScript chunk 경고는 남음 |
| Web `npx playwright test --reporter=line` | 447/447, 실패0, 실제7 workers. test·retry·timeout·worker 설정을 바꾸지 않음 |
| root board `check.mjs`, `test-model.mjs`, `test-review.mjs`, `test-server.py` | 모두 통과 |
| 공유 manifest·음성 script Node 검사 | 17/17 |
| Android `assembleDebug assembleDebugAndroidTest` | app·계측 APK 컴파일 통과. 에뮬레이터 계측 재실행은 아님 |
| 실제 browser | legacy 기준·화면 비교 링크 왕복과 SC04 렌더 확인. browser error0 |
| Android preview HTTP | `/` 200, 에뮬레이터 부재 시 `/frame` 503. native screenshot·tap은 미검증 |

Web 검사의 첫 시작은 별도로 띄운 browser smoke 서버가5173을 사용해 중단됐다. 그때 테스트는 실행되지 않았다. 해당 서버를 종료한 뒤 변경 없는 기본 전체 명령으로447개를 실행했다. 제품 오류를 숨기기 위한 retry나 검사 완화는 하지 않았다.

## 음성 4개 추가

기존 user-local ElevenLabs 설정과 기존 생성 script를 사용했다. JaeGyu·`eleven_v4`의 신규 원고4개·251 codepoint를 실패 포함4 TTS 호출 상한 안에서 생성했다. CLI 추가 설치·추가 결제·plan 변경·overage 활성화는 없었다.

기존64개 MP3와 metadata는 그대로다. 총68개 원고·출처·hash·sidecar·FFmpeg decode를 확인했다. 전체 browser suite는 새4개 실제 파일의 hash·decode·재생과 SC04 상태별 원고 경로를 통과했다. [생성 기록](audio-generation.json), [offline 검사](audio-verification.json), [browser smoke](browser-smoke.json)를 구분한다. 사람 청취는 수행하지 않았다.

## source와 문서 정리

미사용 `emergency/PleosDisplay.tsx`, `emergency/glyphs.tsx`, `emergency/motion.ts`와 전용 CSS를 제거했다. 동일한 `assets/page-53-927.svg`가 있는 `exports/integrated.svg` 복사본을 제거했다. unique 과거 캡처·원본 Figma archive는 보존했다.

Legacy 기준·비교 링크는 `study=legacy`를 유지한다. Android preview의 AVD는 문서에 있는 `accident-repair-api35`를 사용한다. [preview smoke](android-preview-smoke.json)는 실제 에뮬레이터가 없던 범위를 명시한다. 낡은 README 경로·공개 여부·suite 수치·계획 체크와 대체된 layout 규칙은 당시 기록과 현재 안내를 분리했다.

## 큰 검증 ZIP 분리

`trace.zip`96개, 445,091,835 bytes를 [보관 release](https://github.com/JangHyun-bin/hyundai-accident-support/releases/tag/evidence-contract-repair-2026-11-13)로 옮겼다. 별도 다운로드와 `tar -xf` 복원 후 원래557개 경로의 크기·SHA-256을 모두 대조한 다음 repo의 ZIP을 제거했다. [복원 증거](archive-verification.json)와 [다시 받는 명령](../contract-reliability-repair/trace-archive.md)을 남겼다.

JSON·screenshot·WebM 등 나머지461개 원시 파일과 원래 manifest·실패 로그는 Git에 남는다. 복원한 ZIP은 ignore된다. 이 작업은 Git 이력을 재작성하지 않으므로 기존 `.git` 용량을 줄이지 않는다. [source 파일 용량](content-size.json)은 `.git`·의존성·build·local cache를 뺀 논리 바이트 기준이다.

## 여전히 완료하지 않은 것

실차·실제119·보험사·정비소 API, 사람 청취·이해도·OS IME 후보창 평가, 신규 전역 E2E 영상과 원본 Figma 승인 복원은 이번 정리의 완료 범위가 아니다. PR #11의 merge 예외를 소급 취소하거나 당시 수용 기준을 통과한 것으로 바꾸지 않는다.
