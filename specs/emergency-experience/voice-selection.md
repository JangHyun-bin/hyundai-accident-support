# 사고 안내 음성 선택

2026-11-09 사용자가 Voice Library preview를 비교하고 JaeGyu 선택.

- Provider는 ElevenLabs.
- Voice는 `JaeGyu - Calm & Trustworthy`.
- Voice ID는 `gKJdDVRmX8dROO8aA5I8`.
- 한국어 남성, 낮고 일정하며 단정한 말투 지향.
- 생성 대상 model은 `eleven_v4`. 사용자의 최신 고품질 model 요청과 provider의 flagship 안내에 따른 선택이며, 한국어 품질 비교 평가 결과는 아님.
- 원고는 `scenarios.json`의 각 장면 `voice` 사용. 전송 대상은 `보험사에`로 표기.
- 실제 사고 안내 원고의 발음·속도·감정 표현을 청취 확인한 뒤 frontend와 영상에 적용.

## 현재 상태

Voice 선택만 완료. JaeGyu로 우리 원고를 생성하거나 frontend에 연결하지 않은 상태.

2026-11-09 계정 조회 결과 Free tier, 사용량 0 / 10,000. 앞선 한국어 Voice Library 음성 생성 요청은 `402 paid_plan_required`로 거절됨. Free tier는 Voice Library 음성의 API 생성을 지원하지 않으므로 유료 plan 전환 후 재확인 필요.

Credential은 repository 밖 local 설정에서만 사용. 이 문서와 frontend에 API key를 저장하지 않음.

## 근거

- ElevenLabs Voice Library API의 해당 voice 등록 정보와 기존 preview.
- [ElevenLabs model 안내](https://elevenlabs.io/docs/overview/models).
- 사용자 선택은 "재규로 가자".

## 2026-11-10 paid access 재확인

- GET /v1/user: Creator / active, character_limit 131000, character_count 118 확인.
- 선택 voice: JaeGyu - Calm & Trustworthy (`gKJdDVRmX8dROO8aA5I8`), model `eleven_v4`.
- Library voice ID 직접 TTS 생성 성공. Key의 voices_write 확대 없이 사용 가능.
- UTF-8 JSON을 temporary file에서 --data-binary로 전달. Curl config 안의 이중 JSON escaping은 한국어를 손상시킴을 local HTTP server에서 재현. 해당 첫 생성물은 public에서 격리; 재생성물 6.8s MP3만 public에 보관.
- Pilot: `public/guidance-audio/f2672771e5fe1ba5.mp3`, SC01/connected. 청취 검증·frontend 연결은 아직 진행 전.
