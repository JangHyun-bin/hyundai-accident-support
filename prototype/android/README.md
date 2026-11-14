# 차분 Android 앱

차분 Android 앱은 Pleos 앱 창 안에 웹과 같은 3열 Voronoi 여정을 띄우는 WebView 호스트다. 화면은 `prototype/web`에서 만든 번들을 APK에 넣어 쓰고 인터넷에서 불러오지 않는다. Kotlin 코드는 차량 쪽 일만 맡는다. Pleos SDK 에어백 신호, 암호화한 사고 기록 자격 증명, 서버와 휴대폰 이어받기, 119 전화 앱 열기가 여기에 속한다.

이전 SC05 Compose 화면은 이 WebView 호스트로 바뀌었다. `evidence/sc05/`의 screenshot은 그 이전 화면의 기록이며 현재 앱의 실행 증거가 아니다.

## Build 도구 준비

JDK21, Android SDK35 platform, Build Tools36.0.0, platform-tools, Node.js가 필요하다. 프로젝트의 compile/target SDK는35, min SDK는28이다. Gradle은 저장소의 wrapper를 사용한다. Android Studio JBR21 또는 별도로 준비한 JDK21을 `JAVA_HOME`으로 지정한다.

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
```

## Debug APK 만들기

1. 웹 번들을 만든다. 결과는 `prototype/web/dist-native/`에 생긴다.

   ```sh
   cd prototype/web && npm run build:native
   ```

2. `prototype/android`에서 APK를 만든다.

   ```sh
   CHABUN_API_BASE_URL=https://backend.example.com CHABUN_VEHICLE_ENVIRONMENT=emulator ./gradlew assembleDebug
   ```

`syncWebAssets` task가 `dist-native`를 `app/build/generated/assets/syncWebAssets/web/`로 복사하고, 이 디렉터리를 모든 variant의 생성 assets로 등록한다. 그래서 `merge*Assets`와 lint가 복사를 기다리고, APK 안에서는 `assets/web/`이 된다. `dist-native/index.html`이 없으면 build는 `Web bundle missing: …` 메시지로 멈춘다. 웹 화면을 고친 뒤에는 1단계부터 다시 실행한다.

Build 설정은 Gradle property(`-P`)나 같은 이름의 환경변수로 넘긴다.

| 설정 | 기본값 | 뜻 |
|---|---|---|
| `CHABUN_API_BASE_URL` | 없음 | 백엔드 HTTPS origin이다. 경로·query·사용자 정보가 있으면 build가 멈춘다. 값이 없으면 `host().handoff`가 `false`이고, 여정은 그대로 동작하며 휴대폰 이어받기 화면은 나타나지 않는다. |
| `CHABUN_VEHICLE_ENVIRONMENT` | `auto` | `emulator`이면 SDK 값을 `simulation` 출처로 보낸다. `auto`는 emulator 기기를 감지한다. |
| `CHABUN_DEMO_CONTROLS` | `true` | `host().demo` 값이다. 웹이 접힌 시연 control을 보여 준다. 실제 119 연결 결과와 보험사 연동이 없는 대회용 APK는 이 control이 있어야 끝까지 진행된다. 운영 빌드에서는 `false`로 둔다. |

## Pleos emulator에서 실행

applicationId는 `com.chabun.vehicle`이고 Kotlin package는 `com.example.accidentpoc`이다.

```sh
adb -s emulator-5580 install -r app/build/outputs/apk/debug/app-debug.apk
adb -s emulator-5580 shell am start -n com.chabun.vehicle/com.example.accidentpoc.MainActivity
```

`screenOrientation="landscape"`라서 Pleos는 앱 창 두 칸(1682×1210 px)을 준다. 창 크기와 night mode 변경은 activity를 다시 만들지 않고 WebView가 그대로 받는다. 다시 만들어지더라도 마지막 앱 URL(`?case=` 포함)로 돌아간다.

## 화면과 브리지

WebView는 `https://appassets.androidplatform.net/assets/web/index.html?host=pleos-app`을 `WebViewAssetLoader`로 연다. Pleos WebView는 devicePixelRatio 1.375로 그리므로 CSS viewport는 1224×880이다. 웹은 `host().windowPx`를 기준으로 배치하고 viewport에 맞춰 축소한다.

웹은 `window.ChabunNative`를 쓴다. 모든 인자는 문자열이다.

| 함수 | 결과 |
|---|---|
| `host()` | JSON `{ version: 1, demo, sdk: "2.3.2", environment: "emulator" \| "vehicle", windowPx: { width, height }, theme: "light" \| "dark" }` |
| `handoff(command, argJson)` | `journey`(`{ journeyId }`), `start`, `approve`(`{ claimId }`), `renew`, `retry`. 결과는 `chabun:handoff` event로 온다. |
| `dial(number)` | `"119"`만 받는다. 전화 앱을 119가 입력된 상태로 열면 `"opened"`, 전화 앱이 없으면 `"unavailable"`, 다른 번호는 `"rejected"`를 돌려준다. 통화 버튼은 운전자가 누른다. |

Native는 `window`에 다음 event를 보낸다.

| Event | `detail` |
|---|---|
| `chabun:host-ready` | 없음. 앱 page load가 끝날 때마다 보낸다. |
| `chabun:handoff` | `prototype/web/src/product/vehicle-handoff.ts`의 `VehicleHandoffState`. `progress`는 서버 JSON을 그대로 넘긴다. |
| `chabun:vehicle-fact` | `prototype/web/src/product/api-contract.ts`의 `SdkFact`. 좌석 값이나 미제공 사유가 바뀔 때 보낸다. |
| `chabun:host-resize` | `{ width, height }`. `host().windowPx`를 먼저 바꾼 뒤 보낸다. |
| `chabun:host-theme` | `{ theme }`. `uiMode` night 값이 바뀔 때 보낸다. |

`handoff("journey", …)`를 받을 때마다 native는 그 여정의 현재 `chabun:handoff`와 좌석별 최신 `chabun:vehicle-fact`를 다시 보낸다. 그래서 웹은 listener를 먼저 등록한 뒤 `journey`를 보내야 한다. 같은 사실이 다시 올 수 있으므로 fact listener는 중복을 무시해야 한다.

## 휴대폰 이어받기와 SDK 신호

- 사고 기록(case)은 여정마다 하나다. 생성 ID·secret·차량 credential·pair·보내지 못한 fact는 backend origin과 `journeyId`로 이름 붙인 파일에 Android Keystore AES-GCM으로 암호화해 `noBackupFilesDir`에 둔다. localStorage나 URL에는 넣지 않는다.
- 상태 전이는 웹의 `createVehicleHandoff`와 같다. 앱이 화면에 보일 때만 3초마다 확인한다. 연결 코드가 만료되면 "새 코드 받기"를 기다리고, 서버 오류는 다음 확인 때 다시 시도한다. 승인은 차량 화면의 **승인** 버튼으로만 한다.
- 에어백 신호는 좌석마다 읽는다. case가 있으면 `/vehicle-facts`로도 보낸다. 보내지 못한 fact는 암호화 저장소에 남고 다음 확인 때 최신 revision으로 다시 보낸다. SDK 2.3.2의 예외 class는 난독화되어 있어 `SecurityException`만 권한 없음으로 구분하고 나머지 실패는 읽기 실패로 보낸다.
- 차량 화면은 서버 progress에 있는 것만 보여 준다. 휴대폰에서 저장한 진술은 내용이 아니라 "진술 작성 중"처럼 상태로 보인다.

## 보안 설정

Pleos [앱 보안 가이드](https://document.pleos.ai/docs/pleos-only/vehicle-app-developer-guide/app-security-guide)를 따른다.

- WebView는 `appassets.androidplatform.net/assets/web/` 아래 번들만 연다. 다른 주소로 가는 이동은 막고, 번들 밖 요청은 403으로 끝낸다. 번들 응답에는 `script-src 'self'` CSP를 붙인다.
- `allowFileAccess`와 `allowContentAccess`는 끈다. mixed content는 허용하지 않는다. 알고리즘 기반 어둡게 하기도 끈다.
- WebView 원격 디버깅은 debug build에서만 켠다. Release는 `android:debuggable`이 꺼진 상태로 R8을 거친다.
- JS 브리지는 위 세 함수만 열고, `proguard-rules.pro`가 release에서도 이 함수들을 남긴다.
- 마이크는 앱 origin이 요청한 오디오 캡처만 허용한다. 처음 녹음할 때 `RECORD_AUDIO`를 묻는다.
- 서버 통신은 BuildConfig의 HTTPS origin으로만 하고 cleartext는 막는다.

권한은 `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `pleos.car.permission.CAR_SAFETY`다. WebView 마이크 녹음에는 `RECORD_AUDIO`와 `MODIFY_AUDIO_SETTINGS`가 모두 필요하다. `<queries>`는 `tel:` `ACTION_DIAL`을 받을 전화 앱을 찾는 데 쓴다.

## 테스트

```sh
ANDROID_SERIAL=emulator-5580 ./gradlew connectedDebugAndroidTest
```

- `VehicleBoundaryTest`는 암호화 저장소, progress 검증, SDK fact 직렬화를 확인한다.
- `HostBridgeTest`는 `chabun:handoff` 모양, 명령 해석, 허용 URL, `host()` JSON을 확인한다.
- `WebHostTest`는 실제 activity에서 번들이 브리지를 받고 다른 origin·파일로 나가지 못하는지 확인한다.

AGP는 test가 끝나면 앱을 지운다. 계속 쓸 기기에서는 test 뒤에 debug APK를 다시 설치한다.

## 외부 키로 release APK 만들기

먼저 웹 번들을 만든다(`cd prototype/web && npm run build:native`). Release build도 `dist-native`가 없으면 멈춘다.

저장소 밖의 private env 파일을 명시적으로 전달한다. 이 파일은 shell로 실행하므로 신뢰하는 로컬 파일만 사용한다. 키 디렉터리는0700, keystore와 env 파일은0600으로 유지한다. 키와 비밀번호를 저장소·명령 인자·로그·스크린샷에 넣지 않는다. `set -x`로 env 파일을 읽거나 내용을 출력하지 않는다.

env 파일에는 다음 값을 설정한다.

- `CHABUN_RELEASE_STORE_FILE`은 외부 keystore의 절대 경로다.
- `CHABUN_RELEASE_STORE_PASSWORD`와 `CHABUN_RELEASE_KEY_PASSWORD`는 private 비밀번호다.
- `CHABUN_RELEASE_KEY_ALIAS`는 release 키 alias다. `androiddebugkey`는 허용하지 않는다.
- `CHABUN_RELEASE_CERT_SHA256`은 해당 release 인증서의 공개 SHA256 fingerprint다.

키와 env 파일을 별도로 안전하게 백업한다. 앱 업데이트에는 같은 signing identity가 필요하다. 배포용 키를 잃었다고 debug 키나 새 키로 조용히 대체하지 않는다.

`release.sh`의 두 번째 인자는 서버 주소 또는 `standalone`이다. 예시 경로를 실제 값으로 바꾼 뒤 저장소 root에서 실행한다.

1차 제출 APK는 서버 없이 동작하는 차량 단독 build다. `standalone`을 넘기면 `CHABUN_API_BASE_URL`을 비운 채 build한다. 이때 `host().handoff`가 `false`가 되고, 웹은 `휴대폰으로 남기기` 탭과 모든 휴대폰 연결 화면을 숨긴다. 차량 여정 전체는 서버 없이 진행되고 기록은 앱 안에 저장된다.

```sh
SIGNING_ENV="/absolute/path/to/private/release.env"
OUTPUT_APK="$PWD/prototype/android/app/build/outputs/distribution/chabun-release.apk"
./prototype/android/release.sh "$SIGNING_ENV" standalone "$OUTPUT_APK"
```

휴대폰 이어받기를 보여 주는 build(시연 영상, 2차 PT)는 서버 주소를 넘긴다. 서버는 기기와 휴대전화에서 접근할 수 있고 인증서를 신뢰할 수 있는 HTTPS origin이어야 한다. 경로·query·fragment·사용자 인증정보가 없는 origin을 전달한다. 서버는 `prototype/web/server`에 있으며 같은 origin을 `CHABUN_ORIGIN`으로 받는다(`CHABUN_ORIGIN=https://backend.example.com bun prototype/web/server/index.ts`, 터널·proxy 뒤에서는 `CHABUN_TRUST_PROXY=true` 추가). 휴대폰 화면은 서버가 `prototype/web/dist`에서 내려주므로 먼저 `prototype/web`에서 `npx vite build`를 실행한다. 서버 주소는 APK에 고정되므로 주소가 바뀌면 APK를 다시 build한다.

```sh
./prototype/android/release.sh "$SIGNING_ENV" "https://backend.example.com" "$OUTPUT_APK"
```

`release.sh`는 `:app:assembleRelease`에 `-PCHABUN_API_BASE_URL`을 전달한다(`standalone`이면 빈 값). 외부 signing env 네 개가 모두 있어야 release build를 수행한다. script는 생성된 `app/build/outputs/apk/release/app-release.apk`를 `apksigner verify --verbose --print-certs`로 확인하고, 예상 release fingerprint와 일치하는 단일 signer만 허용한다. debug 서명으로 대체하지 않는다. `CHABUN_DEMO_CONTROLS`는 환경변수로 넘기면 Gradle이 읽는다.

성공하면 지정한 `OUTPUT_APK`와 `OUTPUT_APK.sha256`을 만든다. 기존 출력 파일은 덮어쓰지 않으므로 재실행할 때 새 경로를 선택한다. checksum은 출력 디렉터리에서 `shasum -a 256 -c chabun-release.apk.sha256`으로 확인한다. 서명 확인은 source 검토나 runtime 검증을 대신하지 않는다.

## 공식 Pleos API34에서 release 확인

공식 Pleos Playground system image의 API34 emulator에서 release APK를 설치하고 실행한다. 일반 Google API image나 debug APK 실행을 Pleos release 증거로 사용하지 않는다.

```sh
ANDROID_SERIAL="emulator-5580"
adb -s "$ANDROID_SERIAL" shell getprop ro.build.version.sdk
adb -s "$ANDROID_SERIAL" install -r "$OUTPUT_APK"
adb -s "$ANDROID_SERIAL" shell am start -n com.chabun.vehicle/com.example.accidentpoc.MainActivity
```

API 출력이34인지 확인한다. 같은 applicationId의 debug 설치가 있으면 서명 충돌로 업데이트가 거절된다. 이때 자동 삭제하지 않는다. 새 AVD를 사용하거나 필요한 데이터를 먼저 보존한다.

공식 image에서 backend 연결, 차량 신호의 출처와 미제공 상태, 휴대전화 인계 흐름을 확인한다. `CHABUN_VEHICLE_ENVIRONMENT=emulator`로 명시한 실행은 emulator 신호이며 실차 신호 증거가 아니다. 실패·미확인·미지원 상태를 실제 성공으로 기록하지 않는다. 실차·AAOS UX restriction·밝기·시야각·물리 target 적합성 및 기관 정책·안전 문구 승인은 별도 확인 대상이다.
