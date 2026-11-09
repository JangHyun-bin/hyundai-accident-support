# Task 6 음성 우선 사고 기록

실제 microphone 녹음은 MediaRecorder로 audio를 만들고 AnalyserNode의 amplitude로 가로 spectrum을 표시. 직접 입력은 보조 행동. 녹음 종료 후 playback·정정·추가 녹음·저장을 제공.

외부 STT 미연동. 실제 녹음에는 가상 transcript를 붙이지 않음. Sample mode는 `voice-statement-ko-v1.wav`와 같은 문장을 사용. Audio 출처와 재생성 방법은 `public/journey-samples/SOURCES-VOICE.md`에 기록.

`voice-ready-mobile.png`와 `voice-review-mobile.png`는 393px에서 직접 검토한 화면. 주 행동을 하나로 두고 회색 보조 행동과 구분. Native audio control은 keyboard playback을 제공. `voice-review-360-large.png`는 360px·200% text 검토. 공유 summary의 column 간격 문제를 root가 fix한 뒤 다시 촬영해 내용 겹침이 없음을 확인. `scrollWidth`와 viewport 모두 360px.

검증은 `tests/journey-voice.spec.ts`의 실제 Chrome에서 수행. Test에만 생성한 oscillator stream을 사용하므로 실제 microphone permission·hardware 검증 결과가 아님. 실제 MediaRecorder encode와 Blob 저장·재생은 검사.

초기 5개 test는 음성 기록 진입이 없어 실패. 이후 예상하지 못한 microphone 종료와 긴급 화면 뒤의 audio 재생을 별도 RED test로 재현하고 fix. 입력 취소 경로도 빈 draft 때문에 화면 이동이 막히는 상황을 재현한 뒤 추가.

전체 여정 영상은 Task 11 검증 후 Task 12에서 생성. 이번 단계는 녹음·검토·저장 component와 관련 검증만 포함.

최종 검증: `npm run test:ui -- tests/journey-voice.spec.ts tests/journey-storage.spec.ts --workers=1` 27개 통과. 음성 16개와 저장 11개. `npm run check` 통과, 기존 bundle 크기 warning 유지. Sample audio를 browser가 8.827625초로 decode했으며 source의 문장과 동일한 transcript 사용.

검증 log: `/tmp/hyundai-task6-complete.log`, `/tmp/hyundai-task6-build-final.log`. 실제 microphone hardware, Safari·Firefox, 외부 STT, ElevenLabs 생성은 Not verified.
