# 충돌 감지 지원 확인과 개발 계획

2026-11-14 기준 공식 Pleos·Android 문서와 현재 앱의 감지 입력을 대조했다. 사용자는 **충돌 자동 감지를 필수로 유지하고, 직접 신호가 제한되면 비전·다른 센서 활용 계획을 마련할 것**을 요구했다. 이 문서는 조사와 제안이며 실제 센서 수집·충돌 검출·Fleet 연동·에뮬레이터 실행을 완료했다는 기록이 아니다.

## 1. 결론

- **Vehicle SDK에도 실제 에어백 전개 조회·변경 알림 API가 있다.** 공개된 `Vehicle:2.3.2` AAR의 `Safety`와 `SeatAirbagDeployedListener`를 `javap`로 확인했다. 경고등 전용 API가 아니다. 따라서 공개 SDK로 사고 관련 자동 신호를 받을 경로가 없다는 전제는 잘못이다. 단, 전개하지 않은 경미 사고까지 검출한다는 뜻은 아니다. [전개 조회][airbag-query], [전개 콜백][airbag-callback], [SDK AAR][vehicle-aar]
- **공식 충돌 상태 신호는 존재한다.** Fleet API Webhook의 차량 이벤트에 `items[].data.Emergency.Crash`가 `ValueObject<String>`이고 값은 `CRASH` / `UNCRASH`로 공개돼 있다. 같은 표의 `WarningLamp.Airbag` 경고등과 별개다. [차량 이벤트][fleet-event]
- **Fleet API와 차량 내부의 Vehicle SDK는 다른 접근 경로다.** Fleet은 계약 후 endpoint 제공, 사용 신청·승인, Client ID·Secret·Project ID, Webhook 등록이 필요하다. 문서 공개만으로 현재 참가 앱·모든 차량에서 즉시 사용할 수 있다는 뜻은 아니다. [시작하기][fleet-start], [Webhook][fleet-webhook]
- 충돌 신호를 찾지 못했다는 이유로 수동 시작 전용 앱으로 바꾸지 않는다. 공식 차량 신호를 우선 검토하고, 미지원 환경의 휴대폰 센서 기반 **충돌 의심** 감지와 비전 보조를 별도 개발 경로로 둔다.
- **현재 앱에는 실제 감지가 연결되지 않았다.** `JourneyStudy.tsx:177-180`의 `우측 전방`, `0.4 G`, `오후 9:12`는 `source: 'fixture'`로 주입된다. 현재 Android 앱의 dependency에는 Compose만 있고 Pleos SDK가 없다. 화면의 충돌 감지 표기나 과거 회귀 검사 통과는 실제 감지 증거가 아니다.

## 2. 입력별 근거와 제약

| 입력 | 확인한 사실 | 제품 적용 조건 |
| --- | --- | --- |
| Vehicle SDK 에어백 전개 | 좌석별 지원 조회 `checkAirbagDeployedCapabilities`, 전개 조회 `hasSeatAirbagBeenDeployed`, 구독 `registerSeatAirbagDeployed`와 Boolean 변경 콜백을 AAR에서 확인 | `CAR_SAFETY` 권한·capability·지원 좌석·실제 Service 수신 검수 필요. 미전개를 사고 없음으로, 전개를 부상·심각도 확정으로 해석하지 않음 |
| Fleet 충돌 상태 | `Emergency.Crash`와 발생 시각을 가진 `ValueObject`가 공개됨. 데이터는 차량에서 수신된 경우에만 포함되는 선택값 | 계약·승인, 대상 차량·단말 등록과 실제 제공 여부, 인증된 수신 경로, 지연·단절 검증 필요. 값 누락을 `UNCRASH`로 바꾸지 않음 |
| AAOS 직접 충격 property | Android 공식 명세의 `IMPACT_DETECTED`는 충격을 감지한 차량 측면을 전달하는 상태값이며 원시 가속도 센서가 아님 | `READ_IMPACT_SENSORS` signature·privileged 권한 필요. 확인한 AOSP `android14-release` 소스에는 property·권한이 없고 `android15-release`에는 시스템 API·권한이 존재. Pleos의 별도 구현·이식과 실행 지원은 미확인. [명세][aaos-impact], [버전별 확인](#5-aaos-적용-난도와-센서-융합-연구) |
| Vehicle SDK 차량 상태 | Brake, Light, Safety 등 도메인과 capability 조회·현재값·변경 알림 구조 제공 | 차량·기능별 지원 및 읽기 권한을 확인. 브레이크·비상등·경고등을 충돌 확정 신호로 취급하지 않음 |
| 차량 원시 IMU·카메라·블랙박스 | 이번에 확인한 공개 안내만으로 일반 앱의 입력 가용성을 확정할 수 없음 | 물리 센서 직접 접근 금지. SDK 미제공 특수 property는 사전 기술 검토 필요. 일반 Android API 존재를 Pleos 접근 허가로 간주하지 않음 |
| Android 휴대폰 IMU | `SensorManager`, `TYPE_ACCELEROMETER`, `TYPE_LINEAR_ACCELERATION`, `TYPE_GYROSCOPE`로 기기가 제공하는 센서값 수집 가능 | 별도 폰 실행부, 사고 전 연결·수집, 센서 존재·범위·권한·거치 상태 확인. 사고 검출 성능은 별도 검증 |
| 휴대폰 위치·속도 | Android 위치 입력을 보조 신호로 사용할 수 있음 | 위치 권한과 데이터 시각·정확도·누락을 처리. GPS 속도 변화만으로 충돌 확정 금지 |
| Vehicle Data API 운행 이력 | 종방향 가속도·yaw 이력 공개. 문서상 현재 유럽 제공, 사업자 기초 데이터는 동의 후 24시간이 지난 뒤부터 조회 | 기간 조회형 운행 데이터를 즉시 로컬 충돌 트리거와 혼동하지 않음. 동의 후 이용 가능 시점을 각 샘플의 전송 지연으로 해석하지 않음 |
| 블랙박스 G-sensor·이벤트 영상 | BlackVue는 주행·주차 충격을 G-sensor로 감지하고 이벤트 영상을 저장·업로드하는 기능을 안내하며, 제3자 Fleet SDK·Cloud API 연계 사례도 공개함 | 대응 기기·현행 SDK/API·승인·연결 방식 확보가 필요. 모든 이벤트 파일이 충돌은 아니며 급제동·수동 녹화 등과 구분. 과거 API 발표를 현재 즉시 이용 권한의 증거로 삼지 않음. [이벤트 안내][dashcam-events], [제3자 연계 발표][dashcam-integration] |
| 비전 | AAOS Camera2는 플랫폼 기능으로 존재하지만 OEM의 camera service 활성화·하드웨어 제공이 전제 | Pleos 차량 영상의 실제 접근·권한·정책 또는 제휴 블랙박스 입력을 먼저 확보. 영상 재생 가능과 실시간 카메라 접근 가능은 별개 |

차량 상태·가용성은 [Vehicle SDK 소개][vehicle-intro], [호환성][availability], [하드웨어 정책][hardware]를 따른다. 폰 센서는 [Android 동작 센서][motion], [센서 개요][sensors]를 따른다. 운행 이력은 [Vehicle Data API][data-intro], [운행 데이터][operation-data], 카메라는 [AAOS 카메라][camera], [Camera Service][acs]를 근거로 한다.

### SDK 실물 확인

- 공식 Maven 좌표: `ai.pleos.playground:Vehicle:2.3.2`. AAR SHA-256: `e11fdfe498cad3ecc0d5a2a6992b0c4a4d135195f1455018127bc069fd5ef937`.
- `classes.jar`의 `Safety.checkAirbagDeployedCapabilities`는 `CapabilityConfig`와 `List<SeatArea>`를 성공 콜백으로 전달한다. `hasSeatAirbagBeenDeployed`는 `SeatArea`를 받아 Boolean 결과를 전달하며, `registerSeatAirbagDeployed`는 같은 좌석과 `SeatAirbagDeployedListener`를 받는다. 구독 해제 API도 존재한다.
- 리스너에는 `onSeatAirbagDeployUpdated(java.lang.Boolean)`가 있다. `getTelltalesInfo`·`registerTelltales`는 별도 경고등 API다. 확인한 capability·전개 조회·전개 구독 메서드에는 `@RequiresPermission("pleos.car.permission.CAR_SAFETY")`가 붙어 있다. [권한 안내][vehicle-permission]
- `Vehicle.getGear()`와 `Gear.getCurrentGearSelectionState`·`registerGearSelection`도 AAR에 존재한다. 문서 도메인 요약이나 검색 라우트에 항목이 안 보인다는 이유로 SDK 전체에 없다고 단정하지 않는다. 실제 사용은 공개 명세·권한·실행 지원을 함께 확인한다.
- 공식 소개는 Service `2.3.21`, Sample App 안내는 `2.3.22`를 기준으로 한다. 실제 설치된 버전과 각 기능의 지원 결과를 별도로 기록해야 한다. **이번 확인은 배포 바이너리의 API·권한 확인이며, 전용 에뮬레이터에서의 동작 검증은 아니다.** [소개][vehicle-intro], [Sample App][sample]

## 3. 권장 제품 구조

다음은 조사에 근거한 제안이며, 폰 상시 감지의 포함 여부와 구체적인 진입 UX는 사용자 결정으로 확정한다.

```mermaid
flowchart TD
  A["차량 SDK 에어백 전개 또는 Fleet 충돌 상태\n기능 지원·접근 조건 확인 후"] --> D["출처·시각·지원 상태를 구분한 감지 입력"]
  B["휴대폰 IMU·위치 보조 감지\n사고 전 연결·수집 필요"] --> D
  C["제휴 영상 기반 보조 분석\n입력 확보·검증 이후"] -.-> D
  T["격리된 시연 입력\n실제 센서로 표시하지 않음"] -.-> D
  D --> E["사고 여부·사용자 응답 확인"]
  M["보조 수동 도움 시작\n감지 실패·미지원 대응"] --> E
  E --> F["필요한 긴급 도움 또는 안전 확인"]
  F --> G["차량 현황과 휴대폰 기록 이어받기"]
```

### A. 공식 차량 신호 우선

1. 차량 SDK에서는 `CAR_SAFETY` 권한과 좌석별 전개 capability를 확인하고 지원 좌석의 조회·변경 콜백을 연결한다. 미지원·오류·수신 없음은 정상 안전 상태와 구분한다.
2. Fleet은 별도로 계약·접근 조건, 공모전 이용 가능 여부, 대상 차량·단말의 실제 제공 여부를 확인한다. 확인 전에는 연결을 약속하거나 성공을 표시하지 않는다.
3. 수신 데이터에는 제공 출처, 대상 차량, 사건 발생 시각과 수신 시각을 구분한다. SDK 전개 콜백의 Boolean만으로 사고 발생 시각을 알 수 없으므로 앱 수신 시각을 사고 시각으로 꾸미지 않는다. 초기 조회에서 이미 전개된 상태를 읽었다고 매번 새 사고를 만들지 않는다.
4. 같은 이벤트의 재전달과 서로 다른 추가 사고를 구분한다. 오래된 데이터로 새로운 사고를 자동 확정하지 않는다.
5. 에어백 전개나 `CRASH`만으로 부상·심각도·충격 방향·G값을 만들어내지 않는다. `UNCRASH` 수신이나 에어백 미전개도 기존 사고 기록 종료나 사용자 안전 확인을 대신하지 않는다.
6. 신호 미지원·권한 거절·오프라인은 **감지 이용 불가**이며 **사고 없음**이 아니다. 사용자가 직접 도움을 시작할 경로는 감지의 대체가 아니라 실패 대응으로 유지한다.

### B. 휴대폰 센서 보조 감지

1. 지원 센서 목록·측정 범위를 확인하고, 중력 성분·기기 좌표·거치 방향을 고려해 가속도·회전 시계열을 수집한다. 지원하지 않는 센서값을 고정값으로 채우지 않는다.
2. 충격 파형, 회전 변화, 유효한 위치·속도 정보를 시간대별로 대조하는 후보 검출기를 검증한다. 근거 없는 G값 하나를 충돌 기준으로 확정하지 않는다. 출력은 **충돌 의심과 확인 요청**이다.
3. Android 9 이상에서는 백그라운드 앱이 연속 센서 이벤트를 받지 못하므로, 화면 밖에서도 감지하려면 적절한 foreground service·알림·권한과 최신 Android 정책을 반영해야 한다. 화면이 켜진 수집 시연과 상시 동작 완료를 구분한다. [센서 개요][sensors]
4. **사고 후 QR을 열면 과거 충격은 측정할 수 없다.** 이 방식을 핵심 감지로 쓰려면 운행 전에 폰 실행·거치·동의·연결하는 사용자 흐름이 추가된다. 현재 합의한 사고 후 기록 이어받기만으로 대체되지 않는다.
5. Pixel은 위치·동작 센서·주변 소리를 조합하는 제품 사례지만, 모든 충돌 감지와 무오탐을 보장하지 않는다. 그 기능을 우리 앱이 호출할 수 있는 공개 API나 국내 가용성의 증거로 사용하지 않는다. 마이크 수집을 이번 제안의 필수 입력으로 추가하지 않는다. [Pixel 공식 안내][pixel]

### C. 비전 보조 개발

1. 먼저 합법적으로 사용할 전방 영상 입력을 확보한다. OEM이 공개·승인한 카메라 또는 제휴 블랙박스 스트림, 사용자 제공 파일은 서로 다른 입력이다. 사고 후 파일 분석은 실시간 자동 감지가 아니다.
2. 입력 확보 후 충돌 전후 시간 구간·상대 차량 움직임 등을 분석하는 후보 모델을 비교하고 IMU·차량 신호와 시간대별로 대조한다. 입력이 없는 상태에서 모델명·정확도·성공을 먼저 확정하지 않는다.
3. 야간·역광·우천·가림·카메라 시야 밖의 측후방 충격을 포함해 오탐·미탐을 평가한다. 비전 단독 결과로 사고·과실·부상을 확정하지 않는다.
4. 영상·학습 데이터의 이용 권리, 번호판·얼굴·위치 처리와 보존 범위를 확인한다. 공개 연구 코드의 라이선스가 수집 영상 권리까지 보장하지는 않는다.
5. 카메라 프라이버시 토글을 우회하지 않는다. AAOS의 privileged camera allowlist나 EVS를 일반 앱의 기본 권한으로 전제하지 않는다. [카메라][camera], [Camera Service][acs]

## 4. 이번 구현·출품 검증 경계

[공모전 공지 008][contest]은 공개 SDK·API 범위에서 개발하고 미지원 기능은 향후 계획으로 표시하라고 안내한다. 공개된 Fleet 문서가 존재한다는 사실은 Fleet 계약·공모전 접근 권한이 제공됐다는 뜻이 아니다. 검증 단계는 다음처럼 분리한다.

| 검증 단계 | 직접 확인할 것 | 주장할 수 없는 것 |
| --- | --- | --- |
| 공식 Pleos SDK 통신 | 전용 에뮬레이터에서 capability, 조회·callback 결과, 지원 불가·오류 처리 | 일반 AVD나 dependency 추가만으로 Pleos 실제 연동 완료 |
| 충돌 입력 후 서비스 동작 | 명시적 시연 입력을 제품 입력과 분리하고 감지 확인·위험 분기·기록 보류·실제 폰 이어받기까지 완주 | 이벤트 재생만으로 충돌 센서·Fleet 실차 연동 완료 |
| 실제 폰 센서 수집을 포함하는 경우 | 실기기 센서값·시각, 권한·수집 중단·재개, 거치 변화, 화면 꺼짐 상태의 실제 결과 | 폰 흔들기나 가상 파형으로 실제 충돌 검출 정확도 입증 |
| 검출기 성능 | 적법한 라벨 데이터와 분리된 평가 자료로 오탐·미탐·지연을 측정 | 평가 자료 없이 임계치·정확도·안전성을 확정 |
| 실제 Fleet 연계 | 승인된 endpoint와 차량에서 충돌 상태·발생 시각을 수신한 증거 | 직접 만든 HTTP 요청을 실제 Fleet 수신이라고 표시 |

공식 Virtual Console 안내에는 기어·브레이크·비상등·Safety 경고등 등의 카드가 있지만 충돌·IMU 파형 전용 카드는 제시되지 않았다. 콘솔의 경고등 조작을 실사고 재현으로 바꾸어 말하지 않는다. 실제 실행 환경과 SDK 수신 결과는 아직 검수하지 않았다. [Virtual Console][console]

검출기 검증에는 정상 주행, 급제동, 방지턱, 휴대폰 집기·낙하, 센서 누락, 지연·재전달, 추가 충격과 중단 후 복귀를 포함한다. 실제 차량 충돌이나 위험한 주행을 만들어 시험하지 않는다. 센서·비전의 미탐 가능성을 사용자 도움 경로와 함께 설명한다.

**다음 실행 순서:** 전용 Pleos 환경에서 공개 SDK와 접근 가능한 AAOS property의 지원·권한·샘플 형식을 확인한다. 실제 가속도·회전율·속도 입력 경로를 확보한 뒤 감지 구조와 검증 자료를 맞춘다. 차량 데이터만으로 가능한 범위를 확인하기 전에 선택지를 Fleet·에어백 또는 폰 상시 연결만으로 한정하지 않는다.

## 5. AAOS 적용 난도와 센서 융합 연구

### AAOS: 구독 코드보다 권한·플랫폼 지원이 선행 조건

2026-11-14에 AOSP 공식 원문을 내려받아 Gitiles의 base64 본문을 디코딩하고 property 정의와 CarService Manifest를 확인했다.

| 확인한 소스 | 결과 |
| --- | --- |
| `android14-release`의 `VehiclePropertyIds.java` | `IMPACT_DETECTED`와 `READ_IMPACT_SENSORS` 참조 없음 |
| 같은 branch의 CarService `AndroidManifest.xml` | `READ_IMPACT_SENSORS` 선언 없음 |
| `android15-release`의 `VehiclePropertyIds.java` | `IMPACT_DETECTED = 289407792`, `@SystemApi`, `@FlaggedApi(FLAG_ANDROID_VIC_VEHICLE_PROPERTIES)`, `@RequiresPermission` 존재 |
| 같은 branch의 CarService Manifest | `android.car.permission.READ_IMPACT_SENSORS`를 `signature|privileged`로 선언 |

이는 조사한 AOSP branch의 사실이며 **모든 Android 14 기반 OEM 이미지의 미지원을 증명하지 않는다.** Pleos가 이식하거나 별도 서비스로 노출했는지는 실제 이미지·문서·승인으로 확인해야 한다. 현재 Pleos의 기준 이미지가 API34라는 점 때문에 최신 Android API 문서만 보고 즉시 사용 가능하다고 약속할 수 없다. [Android 14 정의][aosp14-ids], [14 권한][aosp14-manifest], [Android 15 정의][aosp15-ids], [15 권한][aosp15-manifest]

접근권을 받은 뒤 상태를 조회·구독해 앱으로 전달하는 부분보다, 지원 차량·시스템 권한·데이터 제공을 확보하는 부분이 어려운 의존성이다. signature 또는 시스템 privileged 앱·allowlist 설정의 문제이지 일반 사용자가 승인창을 누르면 해결되는 권한이 아니다. 개발 에뮬레이터의 권한 우회를 일반 배포 가능성으로 바꾸어 말하지 않는다. [권한 정책][privileged]

지원 조회의 결과도 정확히 해석해야 한다. `getCarPropertyConfig`의 `null`과 목록에서의 누락은 미지원뿐 아니라 읽기·쓰기 권한 부족 때문일 수 있다. `isPropertyAvailable`은 읽기 권한이 없으면 `SecurityException`을 낼 수 있다. 따라서 단일 실패나 빈 목록으로 차량에 충격 센서가 없다고 단정하지 않는다. [CarPropertyManager][car-properties]

### 직접 검토한 연구

| 연구 | 사용한 입력·방법 | 검증과 적용 한계 |
| --- | --- | --- |
| Thompson 등, *Using Smartphones to Detect Car Accidents and Provide Situational Awareness to Emergency Responders* (2010) | 폰 가속도·GPS 속도·충전 맥락과 임계값 필터 | §1.4는 폰 낙하·급정거 실험이며 실차 충돌 검증이 아님. §1.6에서 저속 접촉 미탐 가능성을 인정. 임계값을 제품 안전 기준으로 복사하지 않음. [저자 원문][wreckwatch] |
| Paciorek 등, *Effective Car Collision Detection with Mobile Phone Only* (ICCS 2021, DOI `10.1007/978-3-030-77980-1_24`) | 센서 좌표계 정렬, 가속도·회전 시계열의 시간창 적분·평균 절대미분, 결정트리 | 실제 충돌시험 22개 사건에서 여러 폰의 53개 예제를 수집. 정차 차량 피격과 경미 충돌을 포함. 일반 주행·폰 조작의 피크가 충돌보다 클 수 있음을 관찰. 충돌 예제 leave-one-out 평가와 제한된 정상 주행으로 모든 차량·주차 상태의 성능이 보장되지는 않음. [원문 §3–6][paciorek] |
| Kubin 등, *Deep Crash Detection From Vehicular Sensor Data With Multimodal Self-Supervision* (IEEE T-ITS, 2022, DOI `10.1109/TITS.2021.3114816`) | IMU 가속도·회전율과 GPS 속도, 시간창 CNN·GRU·다중모달 자기지도학습 | 실제 차량 센서 시간창 자료에 비충돌·경미·심각 사고 라벨을 부여. 실제 사고 수와 시간창 수를 혼동하지 않음. 논문의 성능은 우리 장치·차량에 대한 검증이 아니며 공개 원시 자료·재현 가중치는 이번에 확보하지 않음. 원문은 stratified split을 설명하지만 차량·사고 단위 완전 분리 여부는 별도 확인 필요. [원문 §III–V][kubin] |
| Hankey 등, *Description of the SHRP 2 Naturalistic Database and the Crash, Near-Crash, and Baseline Data Sets* (VTTI, 2016) | 차량 고정 센서의 가감속·yaw·jerk, 제동·안전 시스템 등 여러 트리거로 사건 후보를 추출하고 영상·사람 검토로 구분 | 실제 자연주행의 충돌·충돌 직전·일반 주행을 다룬다. 단, 연구용 사후 후보 추출과 수작업 검증은 제품의 실시간 충돌 확정 성능이 아니다. 알려지지 않은 경미 접촉과 후보 선택 편향이 있어 전체 미탐률을 보장하지 못한다. [보고서 §2–3][shrp2-report] |

이 연구들은 사용자 제안의 **시간에 따른 가속도·회전·속도·제동 맥락 조합**을 뒷받침한다. 다만 앞의 세 논문이 동일한 센서 조합을 사용하거나 차량의 브레이크 압력을 입력으로 검증한 것은 아니다. 특히 Paciorek의 방법은 단일 피크보다 지속성·변화 패턴을 살피지만 오탐을 없애지는 못한다. Kubin의 비교 실험은 방지턱·포트홀에서 수직축 가속도 피크가 커지는 문제를 명시한다. 이를 모든 수직 충격을 버리는 제품 규칙으로 일반화하지 않는다. SHRP2의 영상·사람 검토를 우리 앱에서 이미 가능한 실시간 비전 분석으로 해석하지 않는다.

### 현재 코드와 연결할 때 구분할 실제 신호

- 실제 SDK AAR의 `Brake.getCurrentBrakePedalStatus`는 **Boolean 눌림 상태**다. 연속적인 제동 압력·페달 깊이가 아니다.
- `SteeringWheel.getCurrentSteeringWheelAngle`은 **조향휠 각도**다. 차량 차체의 회전율인 yaw rate와 같지 않다.
- `DrivingMode.getCruiseControlTargetSpeed`는 **크루즈 목표 속도**다. 실제 차량 속도로 사용하지 않는다.
- 원시 IMU, 실제 속도, 필요한 주기·측정 범위·좌표계는 제공 출처와 권한을 따로 확인한다. 콘솔의 슬라이더가 있다는 것과 앱이 같은 수치·주기로 읽을 수 있다는 것도 다르다.

### 권장 검출·검증 구조

1. **입력 확보·정렬:** 센서별 측정 시각·단위·좌표계·범위·포화·누락을 확인하고 차량 기준으로 정렬한다. 폰 센서는 차량 고정 센서와 같은 값이라고 가정하지 않는다.
2. **충돌 후보 검출:** 가속도 크기뿐 아니라 변화율, 지속시간·방향, 짧은 시간창의 속도 변화와 회전 패턴을 특징으로 삼는 가벼운 검출기부터 비교한다. 사용 가능한 제동 상태는 보조 맥락으로만 추가한다. 데이터 없이 고정 G값이나 확인되지 않은 모델을 제품 기준으로 확정하지 않는다.
3. **교란 상황과 분리:** 급제동·방지턱·폰 집기·낙하·문 닫기·거치 변경을 충돌 라벨과 대조한다. 속도가 낮다고 감지를 꺼 정차 피격을 구조적으로 놓치지 않도록 평가한다. 연석 접촉을 사고로 볼지는 제품 정의로 별도 확정한다.
4. **제품 진입:** 공식 전개·충돌 신호와 모델의 충돌 의심을 구분해 사용자 상태 확인으로 연결한다. 검출기 결과만으로 부상·안전·기관 연결·보험 접수를 확정하지 않는다. 자동 감지 경로는 유지하고 오탐 취소·감지 이용 불가·보조 수동 도움 경로를 함께 검수한다.
5. **누수 없는 성능 검증:** 동일 사고의 여러 폰, 겹치는 시간창, 같은 차량·주행이 학습과 평가 양쪽에 섞이지 않도록 분리한다. 정확도 하나가 아니라 충돌별 미탐·재현, 주행 시간당 오탐, 감지 지연과 신호 이용 불가 시간을 기록한다. 정상 주행에서 이벤트가 희귀하므로 비충돌만 잘 맞히는 모델을 높게 평가하지 않는다.

조건부 검출기 성능과 전체 제품 성능을 나누어 보고한다. 센서가 꺼졌거나 권한이 없는 동안을 정상·무사고로 바꾸지 않고, 그동안 발생한 사고를 전체 제품의 사고 분모에서 빼서 성능을 부풀리지 않는다.

### 검증 데이터 확보 조건

| 자료 | 활용과 접근 경계 |
| --- | --- |
| NHTSA Crash Test Database | 공개 차량 충돌시험 자료·API가 있어 실제 센서 파형 검토의 출발점으로 쓸 수 있다. 통제 충돌시험을 일반 주행·우리 폰 거치·경미 접촉의 완전한 평가 자료로 취급하지 않는다. [공식 안내][nhtsa-crash-data] |
| SHRP2 자연주행 | 충돌·충돌 직전·일반 주행 자료가 있으나 Guest는 요약·사전 위주이며, 전체 가용 자료 접근에는 IRB 교육 증명과 Qualified Researcher 신청·승인이 필요하다. 보고서 공개와 원시 자료 이용권을 구분한다. [접근 조건][shrp2-access] |
| 대상 장치의 비충돌 기록 | 방지턱·폰 조작·거치 변경 등의 실제 조건에 맞춘 별도 자료가 필요하다. 일반 주행 baseline에 해당 상황의 검증 라벨이 있다고 가정하지 않는다. 실제 충돌이나 위험한 급제동을 만들어 자료를 수집하지 않는다. |


이 단계에서 완성된 것은 접근 조건·논문 대조와 개발 계획이다. 새로운 충돌 검출 코드, 학습 모델, 실기기 센서 수집, Pleos 런타임 검증은 아직 수행하지 않았다.

## 출처

[fleet-event]: https://document.pleos.ai/en/api-reference/fleet-api/fleet-api-webhook/webhook-event-type/vehicle-event
[fleet-start]: https://document.pleos.ai/api-reference/fleet-api/getting-started
[fleet-webhook]: https://document.pleos.ai/api-reference/fleet-api/fleet-api-webhook/webhook-overview
[vehicle-intro]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/intro
[availability]: https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/api-compatibility-availability
[hardware]: https://document.pleos.ai/en/docs/pleos-only/vehicle-app-planning-guide/platform-api-architecture
[motion]: https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion
[sensors]: https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview
[data-intro]: https://document.pleos.ai/api-reference/vehicle-data-api/intro
[operation-data]: https://document.pleos.ai/api-reference/vehicle-data-api/vehicle-data-api/common/get-vehicle-operation-data
[camera]: https://source.android.com/docs/automotive/camera
[acs]: https://source.android.com/docs/automotive/camera/acs
[pixel]: https://support.google.com/pixelphone/answer/7055029
[contest]: https://appdevchallenge.auto-hmg.io/notice/c0a1a000-2026-4923-8000-000000000008
[console]: https://document.pleos.ai/docs/pleos-only/app-test-guide/virtual-console-guide
[airbag-query]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/vehicle/ai.pleos.playground.vehicle.api/safety/has-seat-airbag-been-deployed
[airbag-callback]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/vehicle/ai.pleos.playground.vehicle.listener/seat-airbag-deployed-listener/on-seat-airbag-deploy-updated
[vehicle-aar]: https://nexus-playground.pleos.ai/repository/maven-releases/ai/pleos/playground/Vehicle/2.3.2/Vehicle-2.3.2.aar
[vehicle-permission]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/vehicle-permission
[sample]: https://document.pleos.ai/docs/pleos-only/tutorial/vehicle-sdk-sample-app
[aaos-impact]: https://developer.android.com/reference/android/car/VehiclePropertyIds#IMPACT_DETECTED
[dashcam-events]: https://forum.blackvue.com/hc/en-us/articles/49137875436569-Uploading-and-triggering-event-files-to-the-Cloud
[dashcam-integration]: https://media.blackvue.com/press-release-blackvue-introduces-cloud-api-facilitate-fleet-telematics-software-integration/
[aosp14-ids]: https://android.googlesource.com/platform/packages/services/Car/+/refs/heads/android14-release/car-lib/src/android/car/VehiclePropertyIds.java
[aosp14-manifest]: https://android.googlesource.com/platform/packages/services/Car/+/refs/heads/android14-release/service/AndroidManifest.xml
[aosp15-ids]: https://android.googlesource.com/platform/packages/services/Car/+/refs/heads/android15-release/car-lib/src/android/car/VehiclePropertyIds.java
[aosp15-manifest]: https://android.googlesource.com/platform/packages/services/Car/+/refs/heads/android15-release/service/AndroidManifest.xml
[privileged]: https://source.android.com/docs/core/permissions/perms-allowlist
[car-properties]: https://developer.android.com/reference/android/car/hardware/property/CarPropertyManager
[wreckwatch]: https://www.dre.vanderbilt.edu/~schmidt/PDF/wreckwatch.pdf
[paciorek]: https://www.iccs-meeting.org/archive/iccs2021/papers/127470294.pdf
[kubin]: https://leotac.github.io/pdfs/tits2021crash.pdf
[shrp2-report]: https://vtechworks.lib.vt.edu/server/api/core/bitstreams/2baad9a3-72a9-4974-8f71-9a3357ae903c/content
[shrp2-access]: https://insight.shrp2nds.us/userAccess
[nhtsa-crash-data]: https://nrd.api.nhtsa.dot.gov/
