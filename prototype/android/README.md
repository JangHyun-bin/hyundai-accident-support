# 차분 Android 앱

Android release APK를 외부 키로 서명하고 공식 Pleos API34 환경에서 확인하는 절차다. `release.sh`의 성공은 APK 서명과 checksum 확인이며, 앱 동작·차량 신호·기관 전송의 통과 증거가 아니다. 최종 source와 APK는 실제 backend 연결 및 차량·휴대전화 흐름 확인 뒤 확정한다.

아래 SC05 계약과 API28/API35 기록은 이전 local repair의 범위다. [32개 요구 상태](../../evidence/contract-reliability-repair/requirements.json)와 [전역 완료 추적](../../specs/after-care-system/completion.md)의 과거 결과를 현재 release 실행 증거로 사용하지 않는다.

## Build 도구 준비

JDK21, Android SDK35 platform, Build Tools36.0.0, platform-tools가 필요하다. 프로젝트의 compile/target SDK는35, min SDK는28이다. Gradle은 저장소의 wrapper를 사용한다. Android Studio JBR21 또는 별도로 준비한 JDK21을 `JAVA_HOME`으로 지정한다.

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
```

다른 build-tools 버전을 이미 설치했다면 `ANDROID_BUILD_TOOLS_VERSION`으로 선택할 수 있다. `release.sh`는 해당 디렉터리의 실제 `apksigner`를 사용한다. SDK 설치가 앱 build나 실행 통과를 뜻하지 않는다. 기존 SDK·AVD·키를 덮어쓰거나 추가 license를 자동 승인하지 않는다.

## 외부 키로 release APK 만들기

저장소 밖의 private env 파일을 명시적으로 전달한다. 이 파일은 shell로 실행하므로 신뢰하는 로컬 파일만 사용한다. 키 디렉터리는0700, keystore와 env 파일은0600으로 유지한다. 키와 비밀번호를 저장소·명령 인자·로그·스크린샷에 넣지 않는다. `set -x`로 env 파일을 읽거나 내용을 출력하지 않는다.

env 파일에는 다음 값을 설정한다.

- `CHABUN_RELEASE_STORE_FILE`은 외부 keystore의 절대 경로다.
- `CHABUN_RELEASE_STORE_PASSWORD`와 `CHABUN_RELEASE_KEY_PASSWORD`는 private 비밀번호다.
- `CHABUN_RELEASE_KEY_ALIAS`는 release 키 alias다. `androiddebugkey`는 허용하지 않는다.
- `CHABUN_RELEASE_CERT_SHA256`은 해당 release 인증서의 공개 SHA256 fingerprint다.

키와 env 파일을 별도로 안전하게 백업한다. 앱 업데이트에는 같은 signing identity가 필요하다. 배포용 키를 잃었다고 debug 키나 새 키로 조용히 대체하지 않는다.

backend를 먼저 기기와 휴대전화에서 접근 가능한 HTTPS origin으로 제공한다. 인증서도 기기에서 신뢰할 수 있어야 한다. 경로·query·fragment·사용자 인증정보가 없는 origin을 전달한다. 예시 origin과 private env 경로를 실제 값으로 바꾼 뒤 저장소 root에서 실행한다.

```sh
SIGNING_ENV="/absolute/path/to/private/release.env"
CHABUN_API_BASE_URL="https://backend.example.com"
OUTPUT_APK="$PWD/prototype/android/app/build/outputs/distribution/chabun-release.apk"
./prototype/android/release.sh "$SIGNING_ENV" "$CHABUN_API_BASE_URL" "$OUTPUT_APK"
```

`release.sh`는 `:app:assembleRelease`에 `-PCHABUN_API_BASE_URL`을 전달한다. Gradle은 `CHABUN_API_BASE_URL` 환경변수도 지원한다. 외부 signing env 네 개가 모두 있어야 release build를 수행한다. script는 생성된 `app/build/outputs/apk/release/app-release.apk`를 `apksigner verify --verbose --print-certs`로 확인하고, 예상 release fingerprint와 일치하는 단일 signer만 허용한다. debug 서명으로 대체하지 않는다.

성공하면 지정한 `OUTPUT_APK`와 `OUTPUT_APK.sha256`을 만든다. 기존 출력 파일은 덮어쓰지 않으므로 재실행할 때 새 경로를 선택한다. checksum은 출력 디렉터리에서 `shasum -a 256 -c chabun-release.apk.sha256`으로 확인한다. 서명 확인은 source 검토나 runtime 검증을 대신하지 않는다.

## 공식 Pleos API34에서 실행

공식 Pleos Playground system image의 API34 emulator에서 release APK를 설치하고 실행한다. 일반 Google API image나 기존 debug APK 실행을 Pleos release 증거로 사용하지 않는다. ARM64 Mac에서는 지원하는 ARM64 image와 emulator를 사용한다. 기존 AVD는 보존하고 별도 이름을 사용한다.

```sh
adb devices
ANDROID_SERIAL="emulator-5554"
adb -s "$ANDROID_SERIAL" shell getprop ro.build.version.sdk
adb -s "$ANDROID_SERIAL" install -r "$OUTPUT_APK"
adb -s "$ANDROID_SERIAL" shell am start -n com.example.accidentpoc/.MainActivity
```

실제 Pleos serial로 바꾸고 API 출력이34인지 확인한다. 같은 application ID의 debug 설치가 있으면 서명 충돌로 업데이트가 거절된다. 이때 자동 삭제하지 않는다. 새 AVD를 사용하거나 필요한 데이터를 먼저 보존한다.

공식 image에서 backend 연결, 차량 신호의 출처와 미제공 상태, 요청·접수·복구, 휴대전화 인계 흐름을 확인한다. `CHABUN_VEHICLE_ENVIRONMENT=emulator`로 명시한 실행은 emulator 신호이며 실차 신호 증거가 아니다. 실패·미확인·미지원 상태를 실제 성공으로 기록하지 않는다.

## 과거 local repair 검토 기기

아래 AVD와 serial은 이전 repair 기록이며 현재 실행 상태를 뜻하지 않는다.

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

## SC05 화면

앱 화면은 SC05 Compose 포팅이다. 정본은 [`scenarios.json`](../../specs/emergency-experience/scenarios.json)과 [`glyphs.json`](../../specs/emergency-experience/glyphs.json)이며 build가 해당 specs 디렉터리를 assets source로 연결한다.

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

## 서버 연결·휴대폰 이어 기록·Pleos SDK

SC05 화면 위에 세 가지를 붙였다. 화면의 palette·Satin·glyph·배치는 바꾸지 않는다.

- 앱을 열면 `CHABUN_API_BASE_URL`의 backend에 사고 기록(case)을 만들거나 이어서 연다. 생성 ID·secret·차량 credential은 Android Keystore AES-GCM으로 암호화해 `noBackupFilesDir`에 backend origin별로 보관한다.
- `review` 장면의 보낼 항목 아래, 보관한 사고 기록 줄 바로 다음에 "휴대폰으로 이어서 기록" 영역이 있다. 휴대폰 연결하기를 누르면 joinUrl QR과 만료 시각이 나오고, 휴대폰이 QR을 읽으면 6자리 확인 숫자와 승인 버튼이 나온다. 승인은 차량에서 직접 눌러야 하며, 만료되면 새 코드를 받는다. 연결 뒤에는 휴대폰 응답 상태와 사진·음성·진술·경위서 진행이 2.5초마다 갱신된다.
- 머리줄에 Pleos SDK 에어백 신호 상태를 한 줄로 보여 준다. 에뮬레이터 빌드는 `시뮬레이션`을 붙인다. 각 좌석 값과 미제공 사유는 `/vehicle-facts`로 보낸다. SDK 2.3.2의 예외 class는 난독화되어 있어 `SecurityException`만 권한 없음으로 구분하고 나머지 실패는 읽기 실패로 보낸다.
- 장면이 바뀌면 `voice` 문장과 `script`가 같은 `assets/guidance/*.json` sidecar의 mp3를 재생한다. 맞는 파일이 없으면 재생하지 않는다. 음성 버튼과 음소거 버튼은 없다.

SC05 전이 중 backend 차량 행동과 뜻이 같은 것만 보낸다. 시연 control의 장면 선택과 외부 결과 event는 보내지 않는다.

| SC05 전이 | 차량 행동 | 이유 |
|---|---|---|
| `suspend` "나중에 이어하기" | `defer-recording` | 둘 다 지금 멈추고 남긴 내용은 유지하며 다시 확인한 뒤 잇는다는 뜻이다. backend가 그 시점에 제공할 때만 보낸다. |
| `resume` "이어서 확인하기" | 보내지 않음 | `resume-recording`은 사용자가 기록할 수 있는 상태를 확인했다는 기록을 남긴다. SC05의 재개는 접수 결과 확인으로 돌아갈 뿐이다. 기록 재개는 휴대폰의 상태 확인이 맡는다. |
| `check_status`·`retry`·`review`·`cancel`·재요청 승인 | 보내지 않음 | 차량 지원 요청의 조회·재요청이다. backend에는 이 요청 모델이 없다. |
| 해당 전이 없음 | `need-help`·`confirm-record-ready`·`report-risk` | SC05에 도움 요청·기록 준비 확인·새 위험 신고 전이가 없다. 실제 Pleos 에어백 전개 값은 차량 fact로 보내고 backend가 위험으로 기록한다. |

보내지 못한 행동과 fact는 암호화 저장소에 남고, 다음 갱신 때 최신 revision으로 다시 보낸다. backend가 더 이상 제공하지 않는 행동이나 적용할 수 없는 변경은 버린다.

```sh
CHABUN_API_BASE_URL=https://backend.example.com CHABUN_VEHICLE_ENVIRONMENT=emulator ./gradlew assembleDebug
```

## Browser preview bridge

고정 emulator·foreground 앱의 screenshot과 tap을 browser에서 볼 수 있는 개발용 bridge다.

```sh
python3 prototype/android/preview-server.py
```

이 명령은 repo root 기준이다. <http://127.0.0.1:8766/>을 열며 기본 bridge serial은 emulator-5554다. 약900ms 정지 화면 갱신이므로 motion·latency 검증 도구가 아니다. 임의 device·원격 공개 제어 API로 사용하지 않는다.

## 역사 증거와 남은 한계

`evidence/sc05/`의9개 screenshot과2026-11-08의21개 통과 기록은 당시 세 장면·Satin·font scale 결과다. 이후 공유 manifest 확장으로 시작 guard가 충돌했던 사실을 현재 repaired source·실제 API28/API35 결과와 구분한다.

이전 repair는 SC01–SC04 제품 UI, 영구 DB·Back 종료 뒤의 세션 복구, 실제 요청 재접속, native 음성·audio focus·motion 전면 이식을 검증하지 않았다. 현재 source의 해당 기능도 새 실행 증거가 필요하다. 실차·AAOS UX restriction·밝기·시야각·물리 target 적합성 및 기관 정책 D01–D05·안전 문구 승인은 별도 확인 대상이다.
