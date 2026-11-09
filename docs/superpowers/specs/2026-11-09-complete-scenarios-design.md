# SC01–SC05 실행형 Web prototype

사용자가 goal로 승인한 범위: 기존 Pleos flat 화면에서 전체 scenario를 code로 완성·검증한 뒤 실제 UI를 녹화. Android·실제 전화·기관 API는 제외.

## 구현 선택
기존 React renderer + JSON manifest를 유지하고 작은 session state module 추가. 화면마다 별도 app을 만들면 승인 상태와 요청 보존이 갈라지고, backend를 새로 만들면 이번 시연 범위를 벗어남. Local browser storage에 scenario별 현재 장면·요청·승인 범위·기록 보존. 외부 결과는 기존 검토 control에서 명시적으로 공급.

## 화면
상단 상황 box와 하단 대응 box, gap 24, radius 32 유지. 하단의 큰 제목·한 개의 밝은 주 행동·낮은 강조의 보조 행동·기관별 상태·지금 할 일 유지. 정보 입력 화면은 중앙에 간결한 form과 definition rows. 진행 확인은 일관된 상태 glyph. 통화는 큰 phone와 수평 spectrum. 반복 animation은 spectrum 외에 추가하지 않음. Shared CSS token·component catalog에서 새 form과 secondary action을 먼저 정의.

## Scenario 범위
- SC01: countdown/취소/재연결/실패/통화 끊김, 접수·도착·인계의 개별 확인, 가능한 사고 기록. 운전자·경로 미확인을 차량 이동 가능으로 덮지 않음.
- SC02: 차량 이동 불가 유지, 차량 지원의 수신처·목적·전송 항목 확인 후 승인 요청. 실패와 접수 미확인 구별. 기존 요청 조회, 사고 기록 작성·저장, 지원 접수·도착 확인.
- SC03: countdown/무응답/늦은 응답/취소/재연결/실패, 응답 없이 통화 연결·접수되어도 부상·의식은 미확인 유지. 구호 인계는 별도 event.
- SC04: 사고 기록 확인/정정, 보험 전송 범위 확인, 보류·거절을 각각 보존, 재개 후 범위 재확인, 명시적 승인으로만 전송. 실패 후 재시도도 범위 재확인. 접수 미확인과 접수 확인 구별.
- SC05: 기존 요청 조회, 명시적 업무 중단·재개, reload 복원. 중단 중 외부 결과 반영. 미접수 확인 후에만 재요청 승인, 동일 요청 중복 방지. 범위 변경 시 재승인. 도착과 인계 독립 유지.

## 상태·가정
검토 scene 선택은 독립 fixture 진입, 제품 button은 실제 session 전이. 재진입 URL과 저장 scene이 같으면 복원. 다른 scene URL은 fixture를 새로 시작. 저장 실패는 검토 UI에 표시. 임의 storage 내용은 검증하며 invalid snapshot은 사용하지 않음.
D01: 차량 이동 안내 추가 금지. D02: 구호 countdown 외 자동 전송 없음. D03: 동일 요청은 결과 조회, 명시적 미접수 결과만 재요청 허용. D04: 같은 browser에서만 복원, 외부 취소와 중단 분리. D05: 도착·인계 확인 event 후에도 다른 기관을 완료로 바꾸지 않음. 모두 prototype 가정이며 운영 정책 확정 아님.

## 검증·영상
Manifest 전이/source 검증, 실제 button 경로, 저장 복원·재승인·중복 방지·외부 결과·실패 test. 모든 scene desktop/mobile screenshot·overflow·flat paint·console 검사, 사람이 screenshot 검수. Code 검증 완료 후 5 scenario 전체와 주요 예외 경로 녹화. 전체/확대 MP4, timeline·coverage JSON, 실행·검증 문서 제공. 이전 삭제 문구는 영상에 넣지 않음.

## Review 반영
- SC01도 무응답인 동안 통화 실패·재시도·연결·접수·인계 결과를 받을 수 있음. 구호 담당자가 인계를 확인했다는 검토 event를 사용하며 사용자 응답으로 해석하지 않음.
- 기존 요청의 승인 범위·기록 snapshot과 새 draft의 승인 여부를 분리. 기록을 편집해도 전송한 요청의 승인 snapshot은 보존.
- SC05 구호 인계는 차량 지원 도착 전·중단 중에도 독립 event로 반영. 다른 fact를 확인으로 바꾸지 않음.
- SC04 보류·거절 상태에서 남은 지원 확인·보관 후 중단 가능. 전체 완료로 표시하지 않음.
- 위험 정보 event는 진행 중 countdown을 다시 시작하지 않음.
