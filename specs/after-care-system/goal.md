
1. 전역 design 원칙과 상세 spec 확정
- 색, semantic 상태 표현, typography, spacing, radius, border, surface,
  grain, CA, icon, motion, 정보 우선순위를 일관된 규칙으로 정의하라.
- 현재 B의 비례·문구·중앙 접점·사선·여백을 다듬고,
  rounded split의 적용 조건과 text 안전 영역을 정의하라.
- 화면의 역할과 정보량에 따라 사용할 layout 유형을 정하라.
  Three cells는 이 체계 안의 대표 layout으로 구성하라.
- 기존 C·C_02 preset을 보존하고 전역 기본값과 개별 preset의 관계를 명확히 하라.

2. 살아 있는 design system catalog와 조절 환경 구축
- 실제 제품과 같은 token·component를 사용하는 catalog를 만들어라.
- Surface editor에서 선택한 layout과 실제 내용을 보며
  색·shade·grain·CA를 조절하고 preset을 비교할 수 있게 하라.
- 현재 grain 12%·CA 1px를 출발점으로 화면 전체에서 질감과 가독성을 검토하라.
- Catalog에서 확인한 변경이 제품 화면에도 동일하게 반영되도록 구성하라.

3. 전역 component·layout 구현
- 현재 고정 artboard 시안을 실제 viewport와 내용 변화에 대응하는
  공용 component·layout으로 구현하라.
- 차량 상태 영역, 통화, map, 대피 안내, 요청 현황, voice input,
  기록 확인·저장, 보험사 전달 등 기존 기능을 공통 체계로 연결하라.
- 각 화면이 독자적인 색·간격·shape·effect를 갖지 않도록
  token과 component를 통해 일관성을 유지하라.

4. 전체 frontend와 정의된 scenario에 적용
- Repo에 정의된 전체 화면·상태·분기를 목록화하고 구현과 대조하라.
- 대표 flow에서 먼저 design과 interaction을 검증한 뒤 전체로 확장하라.
- 정상 진행뿐 아니라 미확인·대기·실패·재시도·취소·복귀 등
  정의된 상태와 voice input의 시작·입력·확인·저장 과정을 완성하라.
- 긴 한국어 문구, 화면 크기 변화, keyboard 접근,
  reduced motion, rendering 성능을 검증하라.
- 통화 연결·접수 확인·현장 도착처럼 의미가 다른 상태는 명확히 구별하라.

5. Motion·음성·E2E 영상 완성
- 공통 motion 규칙을 화면 전환, spectrum, 상태 변화에 적용하라.
- 재규 음성 asset과 안내 문구, 화면 전환의 timing을 연결하라.
- Code와 전체 flow 검증을 마친 뒤 E2E 영상을 제작하라.
- 하나의 대표 전체 흐름과 주요 분기를 검토할 수 있는 영상·capture를 제공하라.

진행 방식
- 시작 시 전체 작업 순서와 완료 기준을 문서화하고 진행 상태를 갱신하라.
- 기존 사용자 변경과 preset을 보존하며 현재 repo 구조와 공용 구현을 우선 활용하라.
- 중간 선택은 승인된 B 방향과 제품 목적에 따라 판단하며,
  필수 정보가 부족한 부분 외에는 매 단계 확인을 기다리지 말고 진행하라.
- 단계별 결과를 실제 browser에서 확인하고 필요한 검증을 수행하라.
- 변경은 작업 branch에 checkpoint로 보관하고 최종 PR을 준비하라.
  Merge는 별도 지시 범위에 따르라.

완료 기준
- 전역 design system catalog와 제품 화면이 동일한 구현을 사용함.
- 정의된 전체 scenario의 구현·검증 여부가 추적 가능함.
- 전체 frontend가 localhost에서 실제로 조작 가능함.
- 전체 flow에 공통 design·motion·음성 규칙이 적용됨.
- 최종 E2E 영상, preview URL, 검증 결과, 남은 한계를 제공함.