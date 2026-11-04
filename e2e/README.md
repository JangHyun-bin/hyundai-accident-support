# 사고 후 대응 지원 service — E2E 제안 설계 v1.0

목적: 원본의 사고 대응 아이디어를 보존하면서 동료 검토와 현대차 제안에 사용할 편집 가능한 FigJam 산출물로 재구성한다.

## 구성

1. Service overview: 문제·제공 가치·전체 여정·공통 원칙.
2. 상세 flow: A 초기 안전·구호, B 기록·접수·후속 처리. 운전자·탑승자, 차량 system, 지원 service, 외부 기관의 책임을 구분한다.
3. 부록: 예외 처리와 검증 항목. 미확인 연계는 제안 상태로 표시한다.

## 범위와 확인

- 원본과 기존 보완본은 보존하고 새 section으로 제작한다.
- 도형·문구·연결선은 FigJam native 객체로 생성한다.
- 실제 Figma 화면에서 overview와 확대 화면의 글자·도형·간격·분기를 확인한다.
- 사고 유형보다 공통 초기 대응을 우선한다. 과실·의식·주행 가능 여부를 임의 확정하지 않는다.
- 구체적인 긴급 대응 문구, 차량 기능, 외부 접수·배차, 개인정보 처리 조건은 검증 전이다.
- 참고: 금융감독원 「안전하고 즐거운 설 연휴 귀성길을 위하여 소비자에게 유용한 자동차보험 정보를 안내합니다」(2026-02-09), p.8. https://kiri.or.kr/PDF/weeklytrend/20260223/trend20260223_6.pdf

Mermaid source는 재생성을 위한 보조 자료다. 최종 검토 대상은 실제 FigJam에 배치한 native diagram이다.

## 최종 산출물

- 전체 묶음: https://www.figma.com/board/mv4ogTxm8nDd6K1usQqDxk/?node-id=35-1672
- 01 Service overview: node `35:647`
- 02A 초기 안전·구호: node `35:980`
- 02B 기록·접수·후속 처리: node `35:1129`
- 03A 예외 처리 7개: node `35:1312`
- 03B 검증 항목 7개와 참고자료: node `35:1606`

Figma를 다시 연 뒤 전체 section의 native text를 복사하여 source의 도형 문구 105개와 대조했다. 누락 0개다(`verification.json`). 각 장의 확대 화면에서 문구 잘림과 분기 label을 확인했고, layout에만 사용하는 `~~~` 연결선은 Figma에서 제거했다. 재생성할 때도 이 연결선은 배치 후 제거해야 한다.

참고자료 도형에는 원문 PDF link를 추가했다. 차량 기능, 외부 기관 연계, 실제 긴급 대응 안내, 정보 처리 조건의 실증 검증은 수행하지 않았다. 본 산출물은 제안 설계다.

## Layout 보완

전체 여정을 왼쪽 위로 옮기고 상세 flow·부록의 왼쪽 기준선을 맞췄다. 부록 앞 간격과 바깥 아래 여백을 줄였다. 중첩 section의 자동 크기 제목은 일반 text로 바꾸었다. 큰 제목은 40, 소제목은 24를 사용하며 본문은 유지했다. 전체 묶음의 탐색용 section 이름은 유지한다.

저장 후 다시 연 native text에서도 본문 도형 105개 모두 확인했다. 누락 0개, 임시 이동용 제목 0개다(`verification-layout-fixed.json`).

## 통합 UX·service flow v1.1

새 page `통합 E2E · 사용자 경험과 기능`에 사용자 경험과 기능 처리를 연결한 통합본을 추가하였다. 기존 page와 원본은 보존하였다.

- 통합본: https://www.figma.com/board/mv4ogTxm8nDd6K1usQqDxk/?node-id=53-1963
- page: `53:927`, 전체 section: `53:1963`
- 가로 7단계: 지원 시작·상황 확인, 안전·구호, 차량 이동, 사고 기록, 동의·접수, 후속 처리, 종료·재개.
- 세로 4개 역할: 운전자·탑승자, app·IVI, 차량·지원 system, 외부 기관. 공통 interruption은 별도 행에 배치하였다.
- native 도형 48개와 connector 70개를 연결하였다. 42개 연결 문구와 12개 점선으로 조건·병행 기록·상태 회신·공통 event를 구분하였다.
- 동의 거절·보류, 미확인, 실제 접수 확인, 새로운 위험의 우선 처리, 차량 이동 조건 확인, 중단·재개를 실제 연결선에 포함하였다.

`00-integrated.mmd`와 `integrated-graph.json`은 내용과 연결 관계의 정본이다. 최종 FigJam의 lane 배치·선 접점·우회 경로는 native UI에서 별도로 구성하였다. Mermaid를 다시 붙이면 최종 배치가 재현되지는 않는다. `native-wire-log.json`에는 작성 시 확인한 연결 관계와 native link를 기록하였다. 화면 좌표는 당시 viewport에 한정한다.

저장 후 다시 연 문구와 연결 문구의 대조 결과는 `verification-integrated.json`에 기록한다. 실제 차량·긴급 기관·보험사 연계와 현장 안내 기준은 제안 상태다. 기존 상세도의 V1–V7 검증 항목으로 연결하였다.


## Local 정본으로 이관 · 2026-11-05

전체 board 정본은 이제 `../project.json`이다. 원본과 이전 시안을 포함한 두 page·826개 object를 보존했다. 앞으로 편집과 변경 이력 관리는 상위 directory의 local editor와 Git에서 진행한다. 위의 FigJam·Mermaid 기록은 이관 전 산출물과 근거로 남긴다. 실행과 범위는 `../README.md`, 전체 대조 결과는 `../archive/coverage.json`에 기록했다.
