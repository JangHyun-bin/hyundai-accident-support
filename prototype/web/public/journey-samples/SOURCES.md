# Journey 시연 media 출처

아래 네 파일은 이 repository의 `scripts/generate-journey-samples.mjs`가 Canvas 도형으로 작성한 합성 자료. 외부 사진·실제 사고 영상·차량 번호·사용자 자료를 사용하지 않음. 생성일 2026-11-10.

| 파일 | 내용 | 형식 |
|---|---|---|
| `front-20s.mp4` | 두 차량이 가까워진 뒤 멈추는 전방 시점 합성 장면 | H.264, 960 × 540, 24 fps, 20초, 무음 |
| `rear-20s.mp4` | 뒤 차량이 가까워진 뒤 멈추는 후방 시점 합성 장면 | H.264, 960 × 540, 24 fps, 20초, 무음 |
| `scene.png` | 합성 전방 장면의 11초 시점 | PNG, 960 × 540 |
| `own-car.png` | 합성 후방 장면의 11초 시점 | PNG, 960 × 540 |

11초는 작성한 장면의 정지 event. 검토용 fixture에서는 충돌 event로 지정 가능하며 실제 영상 분석·sensor 감지를 의미하지 않음. `metadata.eventTime`이 없는 영상에는 충돌 시점 marker를 표시하지 않음. 사진 파일 이름은 시연 촬영 대상 연결을 위한 이름이며 실제 차량 외관 촬영을 주장하지 않음.

재생성은 `prototype/web`에서 `node scripts/generate-journey-samples.mjs` 실행. 설치된 Chrome과 ffmpeg 사용. Network 호출·유료 API 없음. 이 script와 산출물은 repository 내 prototype·검증·시연 영상에 재사용 가능.

음성 sample은 별도 `SOURCES-VOICE.md`가 출처를 소유.
