# 사고 대응 화면의 다음 설계 단계

작성일: 2026-11-05. 이 문서는 기존 [통합 flow 검수본](../reviews/flow-review-v1.2.md)과 공개 자료를 바탕으로 한 제안이다. 운영 정책이나 차량 내 제공 가능 기능을 확정하지 않는다.

## 목표

Pleos의 시각 언어를 참고한 **편집 가능한 HTML prototype**으로 사고 직후의 다음 행동과 기관별 진행 상태를 검토한다. 동료와 현대차 담당자가 실제 사용 절차를 읽고 미결정 사항에 의견을 줄 수 있어야 한다.

Prototype은 확인된 상태를 가상의 예시로 보여 준다. 차량 신호 수신, 전화, 전송, 음성 인식과 외부 기관 연계를 수행하지 않는다. 기존 `project.json`의 flow는 그대로 보존한다.

## 검토할 화면과 상태

| 장면 | 사용자에게 보일 내용 | 확인할 설계 질문 |
| --- | --- | --- |
| 사고 직후 | 현재 상황, 확인이 필요한 내용, 가장 중요한 다음 행동과 보조 경로 | 여러 상황이 겹쳐도 다음 행동을 분명히 알 수 있는가? |
| 기관별 진행 | 구호·차량 지원·보험의 요청 상태와 확인된 시각, 다음 행동 | 한 기관의 접수를 전체 완료로 오해하지 않는가? |
| 전송 전 확인 | 수신처·목적·전송 항목, 확인 및 보류 | 무엇을 누구에게 보내는지 이해할 수 있는가? |

두 번째와 세 번째 장면은 화면 전환이나 같은 화면의 상세 상태로 표현할 수 있다. 요청 상태는 `전송 전`, `전송됨`, `접수 확인`, 해당 업무에 실제로 적용되는 후속 상태, `실패`, `미확인`을 구분한다. 가상의 정보와 실제 확인된 사실을 구분하고, 근거 없는 진행률이나 도착 시간을 만들지 않는다.

제한된 상호작용과 상세 작업이 가능한 상태를 비교한다. 현장 위험, 사용자의 조작 가능 여부, OS가 허용하는 상호작용은 각각 다른 판단이다. 정지한 차량의 화면 제한이 자동으로 해제되었다고 가정하지 않는다. [AAOS의 UX restriction](https://source.android.com/docs/automotive/driver_distraction/car_uxr), [Parked app 지침](https://developer.android.com/training/cars/parked/automotive-os)

검수본의 D01 안전과 상호작용, D02 전송과 동의, D03 재시도와 중복, D04 재개, D05 종료 판단은 prototype을 통해 비교할 미결정 항목이다. Prototype에 보이는 예시를 정책 결정으로 간주하지 않는다.

## 시각 방향

- **확인된 기준:** Pleos의 Asta Sans, light·dark color 체계, typography 역할, button과 popup의 구조를 참고한다. [Pleos typography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/typography), [colors](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/colors), [button](https://document.pleos.ai/en/docs/connect/guide/docs-design/components/actions/basic-button)
- **표현 제안:** 큰 제목과 명확한 주 행동, 정돈된 surface, 기관별로 고정된 상태 목록, 실제 상태 변경을 알려 주는 짧은 전환을 사용한다. 상태는 색과 text로 함께 표현한다.
- **project 자체 결정:** 여백·모서리·HTML 단위와 상태별 표현은 prototype용 값으로 표시한다. 공개 typography 표의 단위와 일부 color 역할은 확인되지 않았으므로 Pleos의 확정 token으로 표기하지 않는다.
- **크기 검토:** Pleos의 icon `48 × 48 dp`는 icon grid다. Google AAOS design guide의 최소 touch target `76 × 76 dp`와 구분한다. HTML의 CSS px를 차량의 dp와 같다고 취급하지 않는다. [Pleos iconography](https://document.pleos.ai/en/docs/connect/guide/docs-design/foundations/contents-creation/iconography), [AAOS sizing](https://developers.google.com/cars/design/automotive-os/design-system/sizing)

## Component 참고

| 후보 | 참고할 부분 | 적용 범위 |
| --- | --- | --- |
| [Material 3](https://developer.android.com/develop/ui/compose/components/button) | 주 행동 button과 상태 목록 | Android native 후보. Pleos sample과 선택 version의 호환성을 확인한다. |
| [Compose Unstyled Drawer](https://composeunstyled.com/docs/components/drawer/) | 명시적으로 열고 닫는 상세 영역 | Android native interaction 후보. 외형은 별도 설계한다. |
| [shadcn/ui Item](https://ui.shadcn.com/docs/components/base/item) | 기관별 상태와 부가 정보의 배열 | Web prototype의 시각 참고. React 설치를 전제로 하지 않는다. |
| [Motion Primitives TransitionPanel](https://motion-primitives.com/docs/transition-panel) | 상태 전환의 움직임 | Web 표현 참고. 상태가 확인된 경우에만 전환한다. |
| [ElevenLabs BarVisualizer](https://ui.elevenlabs.io/docs/components/bar-visualizer) | 음성 상태의 작은 표시 영역 | 선택적 web 참고. 합성 표현은 실제 음성 입력이나 인식 성공이 아니다. |

최신 Material 3 release와 Pleos sample의 dependency baseline은 다르다. 새 package를 설치하기 전에 target SDK·Compose version·license·접근성을 확인한다. 공개 Pleos component 문서는 확인하였으나 Pleos 전용 공개 Compose package는 확인하지 못하였다. 근거와 후보별 license는 [component 조사](component-shortlist.md)에 기록하였다.

## 완료 판단

1. 사고 직후의 다음 행동과 기관별 독립 상태를 두 가지 이상 가상 상황으로 검토할 수 있다.
2. 제한된 상호작용과 상세 확인 상태의 차이, 요청 미확인·실패를 볼 수 있다.
3. 각 화면의 문구와 분기에서 기존 flow node와 미결정 항목을 찾아갈 수 있다.
4. 시각 표현의 출처와 project가 임의로 정한 값을 구분한다.

실제 Pleos device·emulator, 차량 신호 permission, 기관 연계와 실제 사용 환경은 아직 검증하지 않았다. 상세 근거는 [Pleos 조사](pleos-foundation.md)와 [AAOS 조사](aaos-foundation.md)를 따른다.
