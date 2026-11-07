# 사고 대응 Compose PoC

긴급 storyboard의 SC05 · 접수 미확인을 Kotlin + Compose로 재현한 임시 prototype이다. 접수 미확인·결과 조회·접수 확인의 세 장면과 C · Satin 재질을 [web preview](../web/README.md)와 같은 구성으로 보여준다. 실제 전화·전송·차량 신호·기관 연계는 없다.

## 실행

Android Studio에 포함된 JDK를 사용한다. 별도 Java 설치는 필요하지 않다.

```sh
cd prototype/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
```

검토용 emulator는 `accident-support-poc`다. Android 35 `google_apis_ps16k` arm64 image, 1920 × 1200 px, 213 dpi이며 약 1440 × 900 dp가 된다. 없으면 아래와 같이 만든다.

```sh
SDK=~/Library/Android/sdk
echo no | $SDK/cmdline-tools/latest/bin/avdmanager create avd -n accident-support-poc \
  -k "system-images;android-35;google_apis_ps16k;arm64-v8a" -d medium_tablet
# ~/.android/avd/accident-support-poc.avd/config.ini
#   hw.lcd.width=1920  hw.lcd.height=1200  hw.lcd.density=213
#   hw.initialOrientation=landscape  hw.gpu.enabled=yes
$SDK/emulator/emulator -avd accident-support-poc -port 5554
ANDROID_SERIAL=emulator-5554 ./gradlew installDebug
```

시작 장면은 web의 `?scene=`과 같이 지정할 수 있다. 값은 `initial`·`checking`·`received`이며 잘못된 값은 `initial`로 돌아간다.

```sh
adb -s emulator-5554 shell am start -n com.example.accidentpoc/.MainActivity --es scene checking
```

## 구성

- 장면·문구·상태는 [`scenarios.json`](../../specs/emergency-experience/scenarios.json)을 build가 assets로 포함하여 실행 시 읽는다. Kotlin에 문구를 복사하지 않았다.
- 화면 아래 90 dp의 시연 control은 차량 화면 밖의 검토 영역이다. 장면 선택, 외부 결과 시연, `기존 flat / C · Satin` 전환을 제공한다. 전환해도 장면과 요청 상태는 유지된다.
- C · Satin은 web의 GLSL shader를 AGSL `RuntimeShader`로 옮겼다. 강도는 web 기본값인 70%로 고정했다. Android 13 미만에서는 기본 background로 표시하고 control에 그 사실을 표시한다.
- 크기 수치는 web 검토 canvas(1440 × 810 CSS px)와 같은 dp 값이다. Emulator 폭을 1440 dp로 정했기 때문에 같은 값이 되었으며, Pleos 화면 크기나 dp 기준을 주장하지 않는다.
- 한국어 문구는 어절 단위로 줄을 바꾼다(Android 13 이상의 phrase line break).
- Icon은 web과 같은 [Lucide](https://lucide.dev) 1.69.0의 path이며 license는 `third-party/lucide/LICENSE`에 있다. Font는 Pleos 공개 typography에서 안내하는 Asta Sans이며 출처와 license는 [42dot/Asta-Sans](https://github.com/42dot/Asta-Sans)와 `third-party/asta-sans/OFL.txt`를 참조한다.

## 확인

```sh
ANDROID_SERIAL=emulator-5554 ./gradlew connectedDebugAndroidTest
```

`ANDROID_SERIAL`이 없으면 연결된 모든 기기에서 실행된다. 9개 검사는 다음을 확인한다.

- 구호·차량 지원·보험의 상태가 서로 독립적으로 표시된다.
- 결과 조회는 재전송이 아니며 다른 기관의 상태를 바꾸지 않는다.
- 결과 미확인 event는 접수 미확인 장면으로 돌아간다.
- 차량 지원 접수 확인 후에도 현장 도착·구호 인계는 미확인이다.
- 회전·font scale 변경 등으로 activity가 다시 만들어져도 장면을 유지한다.
- 재질을 전환해도 장면과 요청 상태가 유지된다.
- 한국어 문구가 낱말 중간에서 줄바꿈되지 않는다.
- 시작 장면 지정과 잘못된 값의 fallback.

`evidence/sc05/`에는 font scale 1.0과 1.3에서 세 장면의 emulator 화면을 기록했다. Font scale 1.3과 animation 꺼짐 상태에서도 9개 검사가 통과했다.

Local browser에서 emulator를 조작하려면 위 emulator와 app을 실행한 뒤 아래 명령을 실행하고 <http://127.0.0.1:8766/>을 연다. 화면 갱신 주기가 900 ms이므로 motion 확인에는 사용하지 않는다.

```sh
python3 prototype/android/preview-server.py
```

## 한계

- Android Back은 app을 떠나며, 다시 열면 fixture의 초기 장면으로 시작한다. 진행 상태 보존은 미결정 사항 D04이므로 구현하지 않았다.
- 음성 안내는 구현하지 않았다. 차량 audio focus와 함께 후속 native 검증 대상이다.
- Native 화면에는 motion이 없다. Web도 SC05에서는 값이 변하지 않는 사실 영역만 전환한다.
- Pleos 차량, AAOS UX restriction, 실제 display의 시야각·밝기·가독성은 검증하지 않았다.
- 이전 3단계 화면과 `preview.png`·`preview-status.png`는 commit `27d5f50`의 이력에 있다.
