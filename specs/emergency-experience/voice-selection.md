# 사고 안내 음성 선택

2026-11-09 사용자가 Voice Library preview를 비교하고 JaeGyu 선택.

- Provider는 ElevenLabs.
- Voice는 `JaeGyu - Calm & Trustworthy`.
- Voice ID는 `gKJdDVRmX8dROO8aA5I8`.
- 한국어 남성, 낮고 일정하며 단정한 말투 지향.
- 생성 대상 model은 `eleven_v4`. 사용자의 최신 고품질 model 요청과 provider의 flagship 안내에 따른 선택이며, 한국어 품질 비교 평가 결과는 아님.
- 기본 원고는 `scenarios.json`의 각 장면 `voice`다. 현행 runtime 상태별 선택은 `prototype/web/src/emergency/guidance.ts`와 `src/audio/emergency-guidance.json`에서 저장·기관 상태를 반영한다. 전송 대상은 `보험사에`로 표기한다.
- 실제 발음·속도·감정 표현의 사람 청취 평가는 미실시다. 자동 전사·decode·browser playback과 구분하고 전역 goal의 남은 검증으로 기록한다.

## 2026-11-09 상태 · 역사 기록

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

## 현재 구현·권한 경계 · 2026-11-13

- 기존 frontend는 선택만 한 상태가 아니라 `src/audio/assets.json`의 사전 생성 JaeGyu MP3를 사용한다. `useGuidanceAudio`가 정확한 원고를 조회하고 scene·안내 context·pagehide·hidden에서 취소한다. 현재 전체 연결·새 variant의 실증 상태는 [완료 추적](../after-care-system/completion.md)을 따른다.
- 과거 2026-11-10 Creator/active 조회는 현재 계정·잔여 할당량의 증거가 아니다. 이번 환경에는 문서화된 local credential과 두 환경변수가 없어 계정 재조회·새 필수 원고 생성은 차단됐다. 비밀을 repo나 채팅에 붙이지 않는다.
- 이번 사용자 query가 허용한 상한은 기존 구독 안의 신규 원고4개·합계1,200 codepoint·TTS HTTP4회(실패 포함)다. 추가 결제·plan 변경·key 권한 확대·다른 유료 API는 금지다. 현재 실제 생성 요청은0회다.
- 필수 새 asset이 없으면 정확한 오류 원고를 제공하더라도 해당 복구를 완료로 표시하지 않는다. 다른 원고 MP3·묵음·가짜 metadata로 대신하지 않으며 merge를 차단한다.
- 2026-11-10의 “청취·frontend 연결 전”은 당시 pilot 기록이다. 현재 frontend 연결과 사람 청취 미실시를 별도로 표현한다.
