# 시각 표현과 interaction 규칙

## 공통 기반

Asta, 기존 dark semantic palette, 1440 × 810 CSS px canvas를 사용한다. 이 크기는 차량 dp와 실제 시인성을 검증한 값이 아니다. Browser의 검토 UI는 좁은 폭에서도 조작할 수 있어야 한다. 차량 canvas는 비율을 유지해 축소하며 원래 크기 보기를 제공한다.

## Indicator 의미

| Symbol / 상태 | 표현 | 뜻하지 않는 것 |
| --- | --- | --- |
| 사람 / attention | 사람 윤곽 + 삼각형 느낌표 + `부상 있음` | 부상 위치·중증도·특정 좌석의 확인 |
| 사람 / unknown | 사람 윤곽 + 물음표 + `응답 미확인` 또는 `응답 없음` | 의식 없음·사망·안전함 |
| 사람 / confirmed | 사람 윤곽 + 확인 표식 + `응답 확인` | 부상 없음·위험 해소 |
| 전화 / unknown | 전화 + 물음표 + `연결 미확인` | 연결 성공·접수 |
| 전화 / confirmed | 전화 + 확인 표식 + `통화 연결됨` | 접수 완료·출동 |
| 차량 지원 / unknown | 차량 + 물음표 + `접수 미확인` | 미접수 확정·재요청 허용 |
| 차량 지원 / confirmed | 차량 + 확인 표식 + `접수 확인` | 현장 도착·안전 확보·보험 처리 완료 |

- 확인 표식은 해당 대상에만 붙인다. 화면 전체에 완료 색이나 완료 문구를 사용하지 않는다.
- Confirmed 장면에서도 사람·차량·전화 본체와 큰 label은 neutral로 유지하고 작은 확인 표식에만 mint를 적용한다. 대상 전체가 안전하다는 의미를 주지 않기 위한 제안이다.
- 색만으로 의미를 표현하지 않는다. 흑백으로 보아도 상태 symbol과 label이 남는다.
- Scene symbol은 정보 종류를 나타내는 도식이다. 실제 도로·좌석·신체 위치를 재현하지 않는다.
- 확인되지 않은 값을 빈칸이나 정상 표시로 대체하지 않는다.

## 화면 역할

2026-11-08 사용자 결정으로 세 칸 구조를 쓴다. 근거는 [설계 문서](../../docs/superpowers/specs/2026-11-08-urgent-three-slot-design.md)에 있다.

1. ① 감지: 차가 파악한 것과 아직 모르는 것. 금속 cue glyph, `감지 · cue label`, 미확인 사실 chip.
2. ② 차량: 차가 다음에 할 일 한 문장과 필요한 승인 button. 그 아래에 세 기관의 상태를 한 줄로 둔다.
3. ③ 나: 운전자가 지금 할 행동 하나(3 어절 이하). 조건은 앞에 작게, 다음 행동은 `→` 뒤에 작게 둔다. 자동 연결 장면에서는 `응답할 수 있어요` button이다.
4. 검토 UI: scenario·장면·외부 event·전체 spec·3초 보기. 차량 화면 밖에 배치하며 실제 제품 기능과 구별한다.

### 긴박도 색

| 단계 | 쓰는 곳 | 색 |
| --- | --- | --- |
| 결정 필요 (`phase: decide`) | 구호 countdown ring·숫자·`지금 연결` button. `[data-urgent]` 하나로 묶는다 | 빨강 `#FF453A` |
| 진행 중 (`phase: progress`) | 연결 중·확인 중인 ②의 표시 | 호박 `#FFB340` |
| 대기·확인됨 (`phase: settled`) | 그 외. 확인 표식만 mint | neutral |

- 빨강은 생명과 관련된 결정에만 쓴다. 차량 지원·보험의 승인 button은 neutral 주 button이다.
- 화면 전체를 경보색으로 칠하지 않는다. 초록 "완료" 화면을 두지 않는다.

## Motion·음성·입력

- 핵심 상태와 안내는 즉시 교체한다. 사실 chip도 즉시 교체한다. 장식 entrance, 반복 점멸, 단계별 텍스트 지연을 사용하지 않는다.
- Countdown은 구호 자동 연결에만 쓴다. 10초(`auto_contact.seconds`)이며 ring과 숫자만 움직인다. `prefers-reduced-motion`에서는 ring이 1초 단위로 끊어 갱신된다. `취소` button 외의 click은 취소가 아니다(2026-11-08 사용자 결정).
- 음성 원고는 각 장면의 `voice`에 저장한다. Browser TTS는 사용자가 `음성 안내 듣기`를 선택할 때와 countdown이 시작될 때 실행한다. Countdown 시작에는 짧은 경고음도 낸다. 상태 변경·중단·page 종료 시 기존 음성을 취소한다. 지원하지 않거나 재생에 실패하면 원고를 화면에 보여준다.
- 음성만으로 진행하거나 확인 응답을 추정하지 않는다. 실제 차량 audio focus·소음·음성 인식은 이번 범위 밖이다.
- 주 행동 이후 해당 장면 제목으로 focus를 옮긴다. 검토자가 장면을 선택하면 focus는 검토 control에 유지한다.
- 외부 시연 event로 기존 button이 사라지면 현재 장면 선택 button으로 focus를 옮긴다.
- 요청 결과는 검토자의 명시적 외부 event로만 확인 상태가 된다. 실제 통화·network·기관 전송은 없다.

## 시연 경계

화면 바깥에 `가상 scenario · 실제 전화·전송 없음`을 항상 표시한다. 전체 spec에는 `simulation_only: true`와 각 값의 fixture 출처를 기록한다. 새로고침은 URL의 장면 fixture를 다시 불러오며 실제 요청 상태 저장을 의미하지 않는다.

## C · Satin surface preview

2026-11-06에 사용자가 C · Satin metal을 선택했고, 실제 긴급 상황 storyboard 위에서 보는 preview 진행을 요청했다.

- `?study=emergency&material=satin`에서 연다. 기존 `?study=emergency`는 flat으로 시작한다.
- Material은 장식 배경이다. 상황 spec, indicator, 상태 색, 문구, action, transition을 바꾸지 않는다. 상태가 바뀌어도 배경의 색이나 highlight로 성공·안전을 나타내지 않는다.
- C의 sparse Gabor 결과 anisotropic sheen을 유지하되 긴급 화면에 맞게 어둡게 조정한다. 왼쪽 indicator 주변에 빛을 두고, 오른쪽 행동 영역과 하단 지원 현황에서는 밝기를 낮춘다.
- Surface는 pointer와 accessibility tree에 참여하지 않는다. Text·indicator·button은 원래 HTML/SVG layer에 남는다.
- 재질 전환과 표면 강도 변경은 장면·기관 상태·시연 일시 중단 여부를 변경하지 않는다. 기본 강도는 70%이며 확정된 차량 design token이 아닌 비교 시작값이다.
- 자동 animation과 반복 render는 없다. 장면이 바뀌어도 같은 배경을 유지한다. WebGL 2 실패·context loss 시 기본 배경을 사용하며 안내·행동을 막지 않는다.
- 최대 강도의 실제 shader pixel을 대상으로 한 보수적 배경 contrast 계산에서 보조 글자색 `#a9b0b2`와의 최소 비율은 약 4.73:1이었다. 이는 전체 UI의 accessibility 인증이나 실제 차량 시인성 검증이 아니다. 측정은 `prototype/web/evidence/emergency-satin/contrast-check.json`에 기록했다.
- 금속 각인 pictogram은 면과 주변 plate의 대비를 그림자 띠까지 포함한 rendered pixel로 측정했다. 최소 비율은 cue 차량 glyph의 약 3.26:1이고, 상태 표식은 6.99:1 이상이었다. 시안보다 깊이를 줄이고 가독성을 우선했다(2026-11-08 사용자 결정). 측정은 `prototype/web/evidence/emergency-glyphs/contrast-check.json`에 기록했다.
