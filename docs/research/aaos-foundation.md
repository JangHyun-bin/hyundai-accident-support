# AAOS 기반과 사고 대응 UX 적용

확인일: 2026-11-05. 공개 Android·AOSP·Google Design for Driving 문서를 확인하였다. 아래 적용안은 기존 통합 flow에 대한 설계 해석이며 실제 Pleos app의 권한·배포 적합성을 확인한 결과가 아니다.

## Platform과 UI 계층

| 구분 | 확인한 역할 | 이번 제안의 해석 |
| --- | --- | --- |
| Android Automotive OS | 차량 hardware에서 실행되는 Android 기반 platform | 실제 구현 대상의 OS와 OEM 연계 범위를 확인한다. |
| Android Auto | 휴대전화에서 실행하며 호환되는 차량 화면에 경험을 투사하는 platform | AAOS app과 같은 배포·권한 조건으로 취급하지 않는다. |
| Google Automotive Services | OEM이 별도 license로 통합할 수 있는 apps·services | AAOS 사용만으로 Google Play·Google services 제공을 가정하지 않는다. |
| Android for Cars App Library | Host가 표시하는 template을 조합하는 app library | Template 방식에서는 app 개발자가 모든 화면을 임의로 그리는 구조가 아니다. |
| Pleos | 별도로 확인하는 현대차의 platform·SDK·design system | Pleos의 실제 SDK와 배포 정책을 우선 확인한다. |

AAOS·Android Auto·GAS의 구분은 [AOSP overview](https://source.android.com/docs/automotive/start/what_automotive)에 따른다. 해당 문서의 갱신일은 2026-09-30이다. Car App Library의 화면 크기·입력·전환·주행 상태 제약을 host가 처리하고 app은 task flow·content를 제공하는 역할은 [Android for Cars design overview](https://developer.android.com/design/ui/cars/guides/foundations/overview)에 명시되어 있다.

## App 유형과 적용 범위

Google Play의 자동차 app 배포에는 지원 category와 품질 요구사항이 적용된다. Car App Library는 navigation·POI·IoT·weather 등의 지원 범위를 명시하며, media·communication의 지원 platform과 배포 범위는 개별 문서에서 확인해야 한다. 현재 제안이 사고 대응 service라는 이유만으로 category에 자동 포함되지는 않는다. 이는 Google Play 경로의 검토 사항이며 Pleos App Market 정책을 대신하지 않는다. [Android for Cars overview](https://developer.android.com/training/cars), [Car App Library](https://developer.android.com/training/cars/apps/library)

| 구현 경로 | 가능한 설계 범위 | 먼저 확인할 사항 |
| --- | --- | --- |
| Pleos 일반 app·공개 SDK | 공개된 SDK와 app content 범위의 기능 | 사고 신호·음성·위치·연락의 실제 제공 범위, 실행 가능한 상태 |
| Car App Library app | 지원 category의 template과 host 동작 | Category 적합성·사용 가능한 template·배포 channel |
| Parked app의 자체 UI | 제약이 해제된 상태에서의 상세 입력·기록·확인 | UX restriction에 따른 activity 차단·복원 |
| OEM 통합 service·system UI | OEM과 합의한 차량 신호·진입·인계 경험 | Privileged permission, system 통합, 안전·연계 검증 |

위 표의 마지막 열은 이번 제안에 대한 확인 항목이다. 임의의 app이 system UI를 대체하거나 사고 직후 자동으로 최상위 화면을 표시할 수 있다고 가정하지 않는다.

## 차량 정지와 UI 사용 가능 상태

AOSP의 기본 구분은 Parked·Idling·Moving이다. 예시 규칙에서 Parked는 gear가 Park인 상태이고, Idling은 Park가 아닌 상태에서 속도가 0인 경우다. 상태별 제한 규칙과 display별 설정은 달라질 수 있다. 따라서 사고 후 정지하였다는 사실만으로 상세 입력 화면의 제한이 해제되었다고 판단할 수 없다. [Car UX Restrictions rules](https://source.android.com/docs/automotive/driver_distraction/car_uxr)

App UI는 gear·speed의 자체 조합으로 제한을 추정하기보다 `CarUxRestrictionsManager`를 통해 제한 상태를 확인해야 한다. Parked app 문서는 display별 제한이 다를 수 있다는 이유로 이를 명시한다. OEM이 system bars를 유지하거나 immersive mode 변경을 허용하지 않을 수 있으므로 app content에는 window insets도 적용해야 한다. [Parked app의 AAOS 지원](https://developer.android.com/training/cars/parked/automotive-os)

다음 세 판단은 구분한다.

| 판단 | 의미 | 기존 flow와의 관계 |
| --- | --- | --- |
| 현장·사람 상태 | 부상·현장 위험·구호 필요·미확인 | S1·G1·S2에서 유지하는 service 상태 |
| 사용자 조작 가능 | 응답·화면 조작·현재 channel 이용 가능 | U1·E1·E2에서 확인하는 입력 조건 |
| OS의 UX 제한 | 현재 display에서 허용하는 UI·입력 범위 | G2·I4·I5·I6의 실제 화면 제공 조건 |

이 구분은 [검수본의 D01](../reviews/flow-review-v1.2.md#D01)에 대한 보완 해석이다. 현장 안전과 OS 제한 해제는 서로 다른 확인 근거를 사용한다. 여기서 임의로 G2의 운영 의미를 확정하지 않는다.

## 주행 제한과 화면 동작

Distraction Optimized로 표시된 activity가 제한 상태에서 실행될 수 있는 구조와 실제 guideline 준수는 구분해야 한다. AOSP는 platform이 manifest 선언을 확인할 뿐 실제 준수를 자동으로 검증하지 않는다고 명시한다. Parked app 가이드는 제한을 피하려고 `distractionOptimized=true`를 선언하는 방식을 허용하지 않는다. [Driver distraction guidelines](https://source.android.com/docs/automotive/driver_distraction/guidelines), [Parked app 지원](https://developer.android.com/training/cars/parked/automotive-os)

이번 제안의 화면 구분안은 다음과 같다. 실제 제공 가능성은 Pleos와 app 유형 확인 후 결정한다.

| 화면 상태 | 제안 content | 우선 검토할 상호작용 |
| --- | --- | --- |
| 즉시 대응·제한된 상호작용 | 현재 안내, 다음 행동, 가능한 연락 경로, 현재 요청 상태 | 한눈에 확인할 문구, 큰 touch target, 명시적인 실행·취소 |
| 상세 작업이 가능한 상태 | 경위 입력·사실 정정·수신처와 전송 항목 확인 | 상세 입력, 확인 내역, 이전·보류·재개 |
| 입력 channel 이용 불가 | 가능한 channel과 보존된 진행 상태 | 현재 이용 가능한 경로 제시, 확인 전 전송 보류 |
| 중단 후 재개 | 기존 요청 결과와 남은 일 | 안전 관련 재확인과 입력 위치 복원의 구분 |

## 시각 foundation의 참고 기준

다음 수치는 Google의 공개 Design for Driving 참고 기준이다. Pleos token의 실제 값이나 단위로 변환한 수치가 아니다. 해당 design system 페이지들의 갱신일은 2024-07-23이며, 최근 platform 문서와 구분한다.

| 항목 | 공개 기준 | 적용 해석 |
| --- | --- | --- |
| Touch target | 최소 76 × 76 dp | 화면에 보이는 icon 크기와 실제 touch 영역을 구분한다. [Sizing](https://developers.google.com/cars/design/automotive-os/design-system/sizing) |
| Typography | 주요 body의 최소 기준 24 dp, 4 dp 정렬 grid | Pleos의 type role·표기 단위와 실제 AVD에서 대조한다. Source의 type scale image는 pt 표기도 포함하므로 단위를 혼합하지 않는다. [Typography](https://developers.google.com/cars/design/automotive-os/design-system/typography) |
| Contrast | Background와 text·icon 사이 최소 4.5:1 | 상태색만으로 접수·실패·미확인을 구분하지 않는다. [Color](https://developers.google.com/cars/design/automotive-os/design-system/color) |
| Motion | 안전·정보 전달·다양한 hardware에 대한 유연성 | 상태 변화와 계층을 설명하는 전환을 우선한다. [Motion](https://developers.google.com/cars/design/automotive-os/design-system/motion) |

Google의 기존 AAOS color guide는 어두운 기반과 제한된 accent 사용을 설명한다. 이것을 Pleos의 day/night theme 값이나 app brand color의 확정 근거로 사용하지 않는다. 실제 palette와 typography는 [Pleos 조사](pleos-foundation.md)의 확인된 role에서 시작한다.

Browser prototype의 CSS px, Android dp, typography의 실제 표기 단위를 동일한 단위로 취급하지 않는다. 일반 web component의 기본 touch 크기를 그대로 차량 화면의 설계 기준으로 채택하지 않는다.

## 차량 신호의 권한 경계

최신 Android API reference에는 `VehiclePropertyIds.IMPACT_DETECTED`가 존재하며, 해당 property를 읽는 권한은 `Car.PERMISSION_READ_IMPACT_SENSORS`의 Signature\|Privileged 수준이다. 이 API의 존재만으로 일반 Pleos app에서 같은 신호를 받을 수 있다고 판단할 수 없다. 해당 차량의 지원 property, OS·SDK baseline, OEM permission을 확인해야 한다. [VehiclePropertyIds.IMPACT_DETECTED](https://developer.android.com/reference/android/car/VehiclePropertyIds#IMPACT_DETECTED)

`CarDrivingStateManager`의 driving state 접근도 System API·permission 경계가 있으므로 일반 app의 UI 제어에는 공식 UX restriction 경로를 구분해 사용한다. [Driving state와 UX restrictions 소비](https://source.android.com/docs/automotive/driver_distraction/consume)

| 기존 기능 | 확인할 기술 근거 | Prototype에서의 표현 |
| --- | --- | --- |
| S0 · 사고·차량 정보 | Pleos 공개 SDK의 제공 property와 permission | 실제 수신한 값과 가정한 값을 구분한다. |
| I2·X1 · 긴급 도움 | 제공 가능한 연락·통화·정보 전송의 범위 | 실제 접수·인계로 자동 확정하지 않는다. |
| I4Y · 차량 이동 안내 | 차량·경로·조작 가능의 판단 근거 | 이동 안내와 차량 제어를 구분한다. |
| I5·U5 · 기록 입력 | UX restriction과 입력 channel | 이용 가능한 상태에서 상세 입력을 제공한다. |
| S6·E6 · 전송·재시도 | 수신처별 실제 접수 결과·기존 요청 식별 | 미확인을 완료 상태로 표현하지 않는다. |

표의 마지막 열은 제품 설계 제안이다. 외부 긴급 기관·보험사와 연계되는 API의 존재를 확인한 결과가 아니다.

## 다음 설계 단계의 기준

1. Pleos app·OEM 통합 제안·web prototype 중 이번 산출물의 표현 범위를 명시한다.
2. Pleos의 확인된 foundation role과 실제 표시·입력 영역을 대조한다.
3. UI 사용 가능 상태와 service 상태를 분리해 화면 전환 조건을 정의한다.
4. GitHub 후보의 구현 stack·license·유지보수 상태를 확인하고 필요한 상호작용만 적용한다.
5. 실제 화면과 emulator에서 가독성·touch 영역·상태 전환을 확인한다.

현재 단계에서는 SDK 설치·AVD 실행·hardware permission·차량 신호·실제 사고 대응을 시험하지 않았다. Component 선택은 [후보 비교](component-shortlist.md)와 함께 판단한다.
