# 차분: 심사자용 실행 안내

차분은 사고 직후 운전자가 Pleos 차량 화면에서 먼저 안전을 확인하고, 필요하면 직접 119에 연결하고, 기록은 휴대폰으로 이어 남겨 보험 처리까지 정리하도록 돕는 차량용 앱이다.

이 문서는 저장소 루트 README에 옮길 원고다. 기울임꼴 괄호 *( )* 부분은 최종 제출 직전에 실제 값으로 바꾼다.

## 앱 구성

차분은 세 부분으로 동작한다.

| 구성 | 설명 |
| --- | --- |
| Pleos 차량 앱 (APK) | Kotlin Native 앱이 Pleos Vehicle SDK, 암호화 저장, 휴대폰 연결, 119 다이얼을 맡는다. 화면은 APK에 함께 넣은 웹 UI를 WebView로 띄운다. 화면 파일은 인터넷에서 받지 않는다 |
| 휴대폰 화면 | 차량 화면의 QR로 여는 모바일 웹(`/phone`). 사진, 음성, 진술, 경위서를 남기고 공유 범위를 승인한다 |
| 사고 기록 서버 | 차량과 휴대폰이 같은 사고 기록을 공유하도록 저장하고 연결을 승인한다. Bun과 SQLite로 동작하며 HTTPS로만 접근한다 |

차량 화면의 흐름(상황 확인, 대피, 기록, 검토)은 서버 없이도 진행된다. *(최종 APK에서 확인 후 확정)* 휴대폰 이어받기는 서버가 켜져 있어야 동작한다.

## 테스트 환경

| 항목 | 값 |
| --- | --- |
| 에뮬레이터 | Pleos Connect Emulator v2.1.0, Android API 34, arm64-v8a 시스템 이미지 |
| 화면 규격 | Connect Standard 2560×1440 가로 |
| 앱 창 | 1682×1210 (x 853–2535, y 90–1300). 화면 분할 시 약 841×1210 |
| Pleos SDK | `ai.pleos.playground:Vehicle:2.3.2` |
| 앱 빌드 | minSdk 28, targetSdk 35, compileSdk 35, JDK 21, Gradle wrapper |
| 개발 호스트 | macOS, Apple Silicon (arm64), Android Studio 내장 JBR 21 |
| 휴대폰 | Android 실기기, Chrome 브라우저 |
| 서버 | Bun 1.4.4, SQLite, 공개 HTTPS 주소 |

공식 Pleos 시스템 이미지가 아닌 일반 Google APIs 에뮬레이터에서는 Pleos SDK 서비스가 없으므로 에어백 신호가 "미지원"으로 표시된다.

## 실행 방법

### 1. Pleos Connect 에뮬레이터 준비

Pleos 개발 문서의 [Connect SDK 에뮬레이터 설치 안내](https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator)에 따라 Pleos Connect Emulator v2.1.0 (API 34, arm64) 이미지를 설치하고 실행한다.

실행 중인 에뮬레이터를 확인한다.

```sh
adb devices
adb -s <에뮬레이터 serial> shell getprop ro.build.version.sdk
```

두 번째 명령의 출력은 `34`여야 한다.

### 2. APK 설치와 실행

```sh
adb -s <에뮬레이터 serial> install -r apk/팀명_앱이름_release.apk
adb -s <에뮬레이터 serial> shell am start -n com.chabun.vehicle/com.example.accidentpoc.MainActivity
```

*(APK 파일명은 최종 빌드 기준으로 바꾼다.)* 앱 ID는 `com.chabun.vehicle`이다. 런처에서는 **차분** 아이콘으로 실행할 수 있다.

같은 패키지의 debug 빌드가 이미 설치돼 있으면 서명이 달라 설치가 거절된다. 이때는 debug 앱을 먼저 지운다.

```sh
adb -s <에뮬레이터 serial> uninstall com.chabun.vehicle
```

앱은 Pleos 앱 창 안에서만 그린다. 왼쪽 Driving view, 상태 표시줄, GNB는 시스템 영역이다.

### 3. 서버 주소 확인

APK는 빌드할 때 넣은 서버 주소(`CHABUN_API_BASE_URL`)로만 접속한다.

- 제출 APK의 서버 주소: *(심사 기간 동안 유지되는 HTTPS 주소. 임시 터널 주소는 재시작하면 바뀌므로 쓰지 않는다)*
- 서버가 꺼져 있으면 기록 칸의 휴대폰 연결이 "연결 실패"로 표시되고 `다시 시도`가 나온다. 차량 화면의 나머지 흐름은 계속 쓸 수 있다. *(최종 APK에서 확인 후 확정)*

직접 서버를 띄우려면 다음 순서를 따른다. 서버 주소를 바꾸면 APK도 다시 빌드해야 한다.

1. 휴대폰 화면을 빌드한다.

   ```sh
   cd prototype/web
   npm ci
   npx vite build
   ```

2. 공개 HTTPS 주소를 준비한다. 휴대폰과 에뮬레이터 모두 이 주소에 접속할 수 있어야 하며 인증서를 신뢰할 수 있어야 한다. 서버는 `__Host-` 쿠키를 쓰므로 HTTP 주소로는 동작하지 않는다.
3. 서버를 실행한다. `CHABUN_ORIGIN`은 끝에 `/`가 없는 HTTPS 주소다.

   ```sh
   CHABUN_ORIGIN=https://<서버 주소> CHABUN_DB_PATH="$HOME/.local/share/chabun/cases.sqlite" bun prototype/web/server/index.ts
   ```

   리버스 프록시나 터널 뒤에서 실행하면 `CHABUN_TRUST_PROXY=true`를 함께 지정한다. 기본 포트는 8787이다. `https://<서버 주소>/api/health`가 `{"ok":true}`를 돌려주면 준비된 것이다.
4. 차량 화면 번들을 만든 뒤 같은 서버 주소로 APK를 다시 빌드한다. Gradle 빌드는 `prototype/web/dist-native/`를 APK에 복사하며, 이 폴더가 없으면 빌드가 실패한다. 서명 키 준비와 빌드 절차는 [`prototype/android/README.md`](../../prototype/android/README.md)를 따른다.

   ```sh
   (cd prototype/web && npm run build:native)
   ./prototype/android/release.sh <서명 env 파일> https://<서버 주소> <출력 APK 경로>
   ```

### 4. 휴대폰 이어받기

1. 차량 앱에서 상황 질문에 `급한 위험은 없어요`를 누른다.
2. 대피 체크리스트를 확인하고 `안전한 곳에 있어요`를 누른다.
3. `기록 시작`을 누른다. 오른쪽 기록 칸에 `휴대폰 연결하기`가 나온다.
4. `휴대폰 연결하기`를 누르면 QR과 만료 시각이 나온다. 코드는 5분 동안 유효하다.
5. 휴대폰 카메라로 QR을 읽는다. 휴대폰 브라우저에 사고 기록 화면(`/phone`)이 열리고 6자리 확인 숫자가 나온다.
6. 차량 화면에 같은 6자리 숫자가 보이는지 확인하고 차량에서 승인한다.
7. 휴대폰에서 사진, 음성, 진술, 경위서를 남긴다. 차량 기록 칸의 개수와 작성 상태가 갱신된다.

코드가 만료되면 차량 화면의 `새 코드 받기`를 누른다. 연결이 끊기면 `새로 연결하기`를 누른다. 저장된 기록은 서버에 남아 있다.

## 확인할 수 있는 주요 흐름

| 흐름 | 조작 |
| --- | --- |
| 대표 흐름 | 상황 질문 → 대피 체크 → 기록 시작 → 휴대폰 이어받기 → 남긴 내용 확인 → 받는 곳과 보낼 자료 승인 |
| 긴급 분기 | 상황 질문에서 `다친 사람이 있거나 위험해요` → 가운데 열 위쪽에 119 칸이 나타남 → `119에 연결`을 누르면 전화 앱에 `119`가 채워진 채 열림. 자동 발신하지 않음 |
| 기록 보류 | 휴대폰에서 `잠시 쉬기` 또는 `기록 없이 이후 할 일 보기`. 다시 들어오면 주변 상태를 한 번 더 확인 |
| 새 위험 후 복귀 | 기록 중 휴대폰에서 `새 위험이 있어요` → 차량 안내가 "주변을 다시 살펴보세요"로 바뀜 → `주변을 확인했어요` → `기록 시작`으로 작성하던 기록에 복귀 |
| 전송 보류·거절 | 검토 단계에서 `나중에 결정` 또는 `전송하지 않기`. 기록은 유지됨 |
| 내 기록 사본 | 휴대폰의 검토 화면에서 범위를 고르고 `이 내용으로 내 사본 준비` → `기록 사본 내려받기` |

## 에어백 신호

앱은 Vehicle SDK `Safety`의 좌석별 에어백 전개 capability를 확인하고, 지원 좌석의 값을 조회·구독한다. `pleos.car.permission.CAR_SAFETY` 권한이 필요하다.

- 에뮬레이터에서 받은 값은 출처를 `시뮬레이션`으로 표시한다. 실차 신호로 표시하지 않는다.
- 권한 없음, 미지원, 차량 서비스 연결 실패, 읽기 실패는 각각 "신호 확인 불가" 상태로 표시한다. "사고 없음"으로 바꾸지 않는다.
- 전개 신호가 들어오면 첫 질문이 "에어백이 펼쳐졌어요"로 바뀌고 119 칸이 나타난다. 이때도 전화는 운전자가 눌러야 연결된다.

## 제한 사항

- **충돌 자동 감지.** 현재 자동 입력은 Vehicle SDK 에어백 전개 신호뿐이다. 에어백이 펼쳐지지 않는 경미 사고는 감지하지 못하며, 운전자가 앱을 열어 시작한다. 실차에서의 에어백 신호 수신은 검증하지 않았다.
- **앱 자동 실행 없음.** 에어백 신호가 와도 앱이 꺼져 있으면 자동으로 열리지 않는다.
- **119.** 앱은 전화 앱을 열 뿐 발신·신고·접수를 하지 않는다. Pleos 하드웨어 정책상 차량에 따라 전화 기능이 제한될 수 있고, 에뮬레이터에 전화 앱이 없으면 다이얼 화면이 열리지 않을 수 있다. 구호 접수 상태는 항상 "미확인"으로 남는다.
- **보험사.** 실제 보험사 API와 연결돼 있지 않다. 차량 화면의 보험사 전송·접수 상태는 `시연`으로 표시한 예시다. 실제 전달은 휴대폰에서 내려받은 내 기록 사본으로 운전자가 직접 한다.
- **블랙박스·카메라·Fleet.** 블랙박스 영상, 차량 카메라, Fleet API 충돌 상태는 연동하지 않았다. 차량 앱에서는 카메라 촬영을 숨기고 사진은 휴대폰에서 받는다.
- **시연 자료.** 주변 상황 그림의 차량 위치·충격 위치 같은 예시 값은 `시연`·`예시 자료`로 표시한다. 실제 센서 값이 아니다.
- **음성.** 안내 음성은 미리 생성한 파일을 재생한다. 음성 기록은 오디오 파일로만 저장하며 텍스트 변환은 하지 않는다. 외부 음성 인식 서비스로 보내지 않는다.
- **서버.** 서버 주소는 APK에 고정된다. 서버가 꺼져 있으면 휴대폰 이어받기가 동작하지 않는다. 다수 사용자 운영을 위한 부하 시험은 하지 않았다.
- **실차.** 실차와 실제 Pleos 차량 서비스에서 검증하지 않았다. 검증 환경은 공식 Pleos Connect 에뮬레이터와 Android 실기기다.

## 소스 위치

| 경로 | 내용 |
| --- | --- |
| `prototype/android/` | Pleos 차량 앱 (Kotlin, WebView 호스트, Vehicle SDK 연동) |
| `prototype/web/src/` | 차량 화면 UI와 휴대폰 화면 (React, TypeScript) |
| `prototype/web/server/` | 사고 기록 서버 (Bun, SQLite) |
| `specs/emergency-experience/` | 장면·문구·음성 원고 정본 |
| `apk/` | 제출 release APK *(최종 파일명 기재)* |

## 검사 명령

```sh
cd prototype/web
npm run check
npm run test:ui
```

```sh
cd prototype/web
npm run build:native
cd ../android
./gradlew assembleRelease
```

release 빌드에는 저장소 밖의 서명 키가 필요하다. 자세한 절차는 [`prototype/android/README.md`](../../prototype/android/README.md)에 있다.
