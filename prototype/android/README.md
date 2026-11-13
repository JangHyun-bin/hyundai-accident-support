# 사고 대응 Compose PoC

SC05 접수 미확인을 Kotlin + Compose로 검토하는 local prototype이다. 실제 전화·기관 전송·차량 신호·AAOS 연계는 없다. Web 최신 외형 전체를 이식한 앱도 아니다.

현재 repair의 지원 계약은 공유 manifest의 **SC05 11개 state**와 누적 요청·사실·승인·중단 상태다. 구현·실제 API별 통과 여부는 [32개 요구 상태](../../evidence/contract-reliability-repair/requirements.json)와 [전역 완료 추적](../../specs/after-care-system/completion.md)을 따른다. 과거 세 장면·21개 검사·Satin screenshot은 현재 실행 증거가 아니다.

## 도구와 build

프로젝트는 AGP9.4.1·Gradle9.6.0 wrapper·Compose compiler2.3.21, compile/target SDK35·min SDK28을 선언한다. 호환 JDK와 Android SDK가 필요하다. Android Studio에 포함된 JBR을 사용할 수 있으나 해당 앱 경로가 항상 존재한다고 가정하지 않는다.

현재 repair 환경에는 OpenJDK25.0.2·Gradle9.6.0·SDK35·Build Tools36.0.0·platform-tools·ARM64 emulator37.2.13을 준비했다. 도구 설치/버전 확인과 앱 build·instrumentation 통과는 별개다.

```sh
cd prototype/android
export JAVA_HOME="$(/usr/libexec/java_home)"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
./gradlew assembleDebug assembleDebugAndroidTest
```

SDK는 official command-line tools로 설치할 수 있다. ARM64 Mac에서는 emulator archive도 aarch64여야 한다. x86_64 도구의 Rosetta 동작을 native emulator 검증으로 대신하지 않는다. 최신 Android CLI의 package 경로는 slash 형식, legacy sdkmanager/avdmanager는 semicolon 형식이다. 설치된 CLI의 help를 확인하며 사용자 기존 도구를 강제 교체하지 않는다.

## 실제 검토 기기

이번 repair에서 준비한 AVD:

| AVD | system image | serial | 목적 |
|---|---|---|---|
| `accident-repair-api35` | API35 `google_apis_ps16k/arm64-v8a` | emulator-5554 | 지원 shader·전체 계약·font scale |
| `accident-repair-api28` | API28 `google_apis/arm64-v8a` | emulator-5556 | minSdk 실제 실행·Satin 정상 fallback |

각1920×1200px·213dpi·가로 방향이며 약1440×900dp의 검토 환경이다. 실제 Pleos dp·물리 display 규격이라고 주장하지 않는다. Boot 확인은 앱 검증이 아니다. 환경과 실제 결과는 `evidence/contract-reliability-repair/android/`에 별도로 보존한다.

두 emulator가 실행 중이면 serial을 명시한다.

```sh
ANDROID_SERIAL=emulator-5554 ./gradlew connectedDebugAndroidTest
ANDROID_SERIAL=emulator-5556 ./gradlew connectedDebugAndroidTest
```

새 AVD를 준비할 때 사용 가능한 device profile·system image와 이름 충돌을 먼저 확인한다. 기존 사용자 AVD를 삭제하거나 덮어쓰지 않는다.

## SC05 공유 계약

정본은 [`scenarios.json`](../../specs/emergency-experience/scenarios.json)과 [`glyphs.json`](../../specs/emergency-experience/glyphs.json)이다. 현재 build는 해당 specs 디렉터리를 assets source로 연결한다.

복구 대상 state는 `initial`, `checking`, `received`, `suspended`, `lookup_failed`, `not_received`, `review`, `sending`, `send_failed`, `arrived`, `handoff`다. `scene` extra는 명시적인 fixture 진입이며 잘못된 값은 initial로 돌아간다.

```sh
adb -s emulator-5554 shell am start -S -n com.example.accidentpoc/.MainActivity --es scene checking
```

실행 중 activity의 extra만 바꾸는 명령으로 현재 세션이 갱신된다고 가정하지 않는다.

핵심 계약:

- fact/request override·effect·agency·secondary action을 읽고 지원 version·참조·status를 검증한다. override 일괄 거부 guard만 삭제하는 방식은 사용하지 않는다.
- 장면 기본값이 아니라 누적 세션이 requests·facts·scope·기록·승인 snapshot·requestId·전송 횟수·중단 위치의 정본이다.
- 조회·중단·재개·중단 중 접수/인계 수신은 재전송이 아니다. 확인된 접수·인계는 늦은 미확인 결과로 되돌리지 않는다.
- 미접수/전송 실패 확인 후 scope를 검토하고 명시적으로 새 승인한 경우만 새 요청을 만든다. 빈 scope·필요 기록 부재·중복 click을 구분한다.
- primary·secondary 행동을 겹치지 않게 배치하고11개 장면·외부 결과 control에 접근 가능하게 한다. 시연 control은 제품 영역 밖이다.
- activity recreation에서 sceneId뿐 아니라 전체 세션·scope·승인·재질을 보존한다. title/live region·keyboard focus·큰 한국어 text 접근성을 유지한다.

C Satin은 AGSL RuntimeShader의 과거 비교 표현이다. API33 미만 또는 shader compile 실패는 정상 background fallback이며, 이를 지원 API의 검사 실패로 취급하지 않는다. glyph는 공유 geometry를 Canvas로 그리며 shader 지원과 독립적이다.

## Browser preview bridge

고정 emulator·foreground 앱의 screenshot과 tap을 browser에서 볼 수 있는 개발용 bridge다.

```sh
python3 prototype/android/preview-server.py
```

이 명령은 repo root 기준이다. <http://127.0.0.1:8766/>을 열며 기본 bridge serial은 emulator-5554다. 약900ms 정지 화면 갱신이므로 motion·latency 검증 도구가 아니다. 임의 device·원격 공개 제어 API로 사용하지 않는다.

## 역사 증거와 남은 한계

`evidence/sc05/`의9개 screenshot과2026-11-08의21개 통과 기록은 당시 세 장면·Satin·font scale 결과다. 이후 공유 manifest 확장으로 시작 guard가 충돌했던 사실을 현재 repaired source·실제 API28/API35 결과와 구분한다.

SC01–SC04 제품 UI, 영구 DB·Back 종료 뒤의 세션 복구, 실제 요청 재접속, native 음성·audio focus·motion 전면 이식, 실차·AAOS UX restriction·밝기·시야각·물리 target 적합성은 이 repair 범위 밖이다. Web/local prototype의 동작이 기관 정책 D01–D05나 안전 문구 승인을 뜻하지 않는다.
