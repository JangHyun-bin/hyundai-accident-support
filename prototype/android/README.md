# 사고 대응 Compose PoC

시각과 상호작용을 검토하는 임시 prototype이다. 실제 전화·전송·차량 신호·기관 연계는 없다. Google Android 35 emulator에서만 실행하며 Pleos 차량·UX restriction 적합성을 검증하지 않았다. Color는 Pleos 공개 basic palette를 참고한 project 시안이며, typography·간격·모서리는 임시 값이다. Cult UI와 TransitionPanel은 시각과 motion의 참고 자료이며 source를 포함하지 않는다.

Android Studio에서 이 directory를 열고 `app`을 실행한다. 별도 AVD를 사용할 수 있다. 상태는 app을 닫으면 초기화된다.

Command line build:

```sh
cd prototype/android
./gradlew assembleDebug
```

`preview.png`와 `preview-status.png`는 Android emulator에서 캡처한 화면이다. Pleos 공개 typography에서 안내하는 Asta Sans를 사용한다. Font의 출처와 license는 [42dot/Asta-Sans](https://github.com/42dot/Asta-Sans) 및 `third-party/asta-sans/OFL.txt`를 참조한다.

Local browser에서 현재 emulator를 보려면 `accident-support-poc` AVD를 `emulator-5554`로 실행하고 PoC app을 연 뒤 아래 명령을 실행한다. Browser에서 <http://127.0.0.1:8766/>을 열면 화면을 클릭할 수 있다. Emulator와 app을 종료하면 화면 연결도 중단된다.

```sh
python3 prototype/android/preview-server.py
```
