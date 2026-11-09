# 음성 기록 sample

`voice-statement-ko-v1.wav`는 이 prototype 검토용으로 작성한 문장을 macOS의 설치된 Korean Reed 음성으로 offline 생성한 파일.

- 문장: 정차 중 오른쪽에서 충격을 느꼈어요. 정확한 사고 경위는 확인 중이에요.
- 생성: `/usr/bin/say -v 'Reed (한국어(한국))' -r 145`, AIFF 출력 후 ffmpeg로 mono 24 kHz PCM WAV 변환.
- 원본 사용자 녹음·실제 사고 기록·ElevenLabs 음성 아님. JaeGyu voice를 대신하는 제품 TTS가 아님.
- 외부 API와 credit 사용 없음. Sample mode에서 이 파일과 위 문장을 같은 ID로 사용.
- 실제 microphone mode는 이 문장을 사용하지 않음. STT 미연동으로 playback과 직접 입력만 제공.

공개 음성 배포의 권리 검토는 별도. 이번 local prototype의 sample로만 사용.
