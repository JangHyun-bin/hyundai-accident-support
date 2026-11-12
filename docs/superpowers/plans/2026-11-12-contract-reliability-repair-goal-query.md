# Contract Reliability Repair — 자율 실행·머지 goal query

상태: **사용자 실행용 제안문**. 이 파일을 작성하거나 읽는 행위만으로 구현·과금·push·merge가 허가되지는 않는다. 사용자가 아래 query를 실행 지시로 제출했을 때 해당 범위의 권한으로 사용한다.

- [상세 스펙](../specs/2026-11-12-contract-reliability-repair-design.md)
- [병렬 실행 계획](2026-11-12-contract-reliability-repair.md)

## 제안한 자율 실행 권한의 상한

- 무료 개발 도구·Node dependency·JDK·Android SDK/emulator 설치와 해당 무료 Android SDK의 표준 license 동의를 포함한다. 사용자 도구의 삭제·강제 교체는 허용하지 않는다.
- 음성은 기존 JaeGyu/eleven_v4·기존 자격 증명·기존 구독 잔여 할당량만 사용한다. 신규 원고 최대 4개·합계 1,200 Unicode code point·TTS HTTP 요청 최대 4회(실패 포함)다. 추가 결제·자동 충전·plan 변경·key 권한 확대·다른 유료 API 호출은 허용하지 않는다.
- 별도 CI를 새로 설치하거나 유료 runner를 구매하는 권한은 포함하지 않는다. 실행 시 존재하는 required checks는 모두 존중한다. 로컬 full gate·실제 native 검증은 생략할 수 없다.
- 이 상한은 미래 실행자가 적용할 제안이다. 현재 계정 자격·잔여량·라이선스 수락 상태가 확인됐다는 뜻이 아니다.

## 복사해서 실행할 query

```text
이 저장소의 Contract Reliability Repair를 설계부터 실제 PR merge까지 끝내라.

먼저 다음 두 문서를 읽고 정본으로 사용하라.
- docs/superpowers/specs/2026-11-12-contract-reliability-repair-design.md
- docs/superpowers/plans/2026-11-12-contract-reliability-repair.md

목표는 Android 공유 schema 계약, 기록 신뢰성, 실제 상태별 음성 안내, 깨끗한 검증·최대 녹음 시간 실패 원인·원시 증거, 정본·문서 승계의 다섯 복구다. 스펙의 A01–A09, B01–B07, C01–C06, E01–E05, D01–D05를 모두 충족하라. 계획 작성이나 코드 작성만으로 멈추지 마라.

통합 담당 하나를 두고 A Android, B 기록, C 안내, E 검증 환경·원인 분석을 파일 소유권에 따라 병렬 실행하라. 통합 담당은 D 문서 조사·초안도 진행하라. E가 찾은 녹음 제품 수정은 B에게 넘겨 같은 파일의 동시 편집을 막아라. worker는 중간 build/lint/test/formatter·commit/push를 하지 말고, 통합 후 검증 담당 하나가 targeted와 full gate를 실행하라. 실제 새 실패는 원인을 고친 뒤 영향 gate로 검증하되 동일 source 재실행에서 green을 골라 완료 처리하지 마라.

현재 작업 트리와 원격 정책을 먼저 확인하라. 기본 main에서 작업 branch를 준비하되 기존 사용자 변경·현재 계획 문서·C/C_02 preset·원본 board·archive를 보존하라. 임의 reset/clean, main 직접 push, force push, admin bypass는 금지한다. 이 작업 산출물만 commit·push하고 main 대상 PR을 생성·갱신·merge하는 것을 허용한다. 단순 병렬성 때문에 별도 worktree를 만들 필요는 없다.

필요한 무료 개발 도구·npm dependency·JDK·Android SDK/API28·API35 emulator 설치 및 해당 무료 SDK의 표준 license 동의를 허용한다. 사용자 도구를 삭제·강제 교체하지 마라. 실제 native instrumentation이 불가능하면 build만으로 통과시키지 마라.

음성은 기존 JaeGyu/eleven_v4의 정확한 asset을 우선 재사용하라. 필요한 신규 원고 최대 4개, 합계 1,200 Unicode code point, TTS HTTP 요청 최대 4회(실패 포함)까지 기존 구독 잔여 할당량 안에서 생성하는 것을 허용한다. key는 출력·commit하지 마라. 추가 결제·자동 충전·plan 변경·key 권한 확대·다른 유료 API는 금지한다. 상한이나 권한이 부족하면 필수 asset을 생략하지 말고 merge blocker로 보고하라.

시작 guard만 삭제하거나, 실제 상태와 다른 음성을 묵음으로 숨기거나, 테스트 skip/retry/timeout 완화·병렬성 제거로 실패를 덮지 마라. 이미 보고된 전체 394/395 실패는 사실로 취급하고 원인 규명 없이 단독 성공으로 닫지 마라. 누락 visual contract는 원문을 찾거나 출처가 명시된 현행 기준 문서로 재구성하되 사용자 승인을 발명하지 마라. 이번 repair 완료와 과거 전역 디자인·영상 목표 전체 완료를 구분하라.

실제 Web 조작·전체 suite·root/manifest·build·신규 MP3 decode/playback·Android API28/API35 instrumentation·독립 whole-change review를 완료하라. 스펙의 raw evidence, source/asset 지문, 요구별 결과, 정확한 README·completion 문서를 보존하라. 검증 commit 뒤 문서·증거만 추가했다면 tested commit과 final HEAD 및 입력 지문의 동일성을 명시하라. 제품·검사·설정·asset이 바뀌면 관련 검증을 다시 열어라.

모든 32개 요구·실행 gate·독립 review가 충족되고 중요한 미해결 correctness/data-loss finding이 없으며 원격 required checks·approval·mergeability가 만족될 때만, 최신 base와 정확한 PR HEAD를 확인하고 expected-head 보호로 squash merge하라. squash가 정책상 금지되면 허용된 일반 merge만 사용하고 이유를 기록하라. 보호가 없거나 check가 0개라는 이유로 로컬 gate를 생략하지 마라. auto-merge 예약만으로 완료라고 하지 말고 GitHub의 실제 merged 상태와 merge commit SHA를 확인하라.

필수 권한·도구·asset·사람 approval 부족, 충돌 또는 gate 실패가 있으면 도달 가능한 수정·증거 보존을 마친 뒤 정확한 blocker를 보고하고 merge하지 마라. 그 외 repo와 도구로 결정할 수 있는 선택은 보수적으로 판단해 추가 승인 대기 없이 진행하라.

최종 답변에는 PR URL·실제 merge 여부·merge SHA, 다섯 범위별 결과, 실행한 검사와 결과 수, evidence·completion 문서·preview URL, 남은 전역 목표와 실제 blocker를 제시하라. 실행하지 않은 검사·청취·실차 검증을 했다고 주장하지 마라.
```
