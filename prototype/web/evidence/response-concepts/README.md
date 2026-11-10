# 사고 대응 화면 · 세 가지 visual prototype

질문: 밝은 automotive reference와 사용자가 제공한 Finance Bento 표현을 어느 정도 결합할 것인가?

실행: `prototype/web`에서 `npm run dev`, `http://127.0.0.1:5173/?study=response-alts&variant=compare` 열기. `variant=A`, `B`, `C`로 각 안 직접 열기 가능. 하단 switcher와 화면의 빈 곳에서 좌우 방향키로 전환. 선택은 URL에만 반영.

| 안 | 구성 | Finance Bento에서 가져온 표현 |
|---|---|---|
| A · Porcelain | 분리된 상황 card, 통화 tab, 넓은 map과 겹친 대피 안내 | 정돈된 card 묶음과 상태별 열 |
| B · Signal | 큰 통화 card, 기관별 작은 tile, map·대피 안내·기록 button 분리 | 어두운 중심을 가진 gradient, 분리된 KPI tile의 위계 |
| C · Instrument | 작은 통화 영역, 기관별 세로 목록, 우측 상단의 큰 대피 안내 | SVG dot 숫자와 하나의 강조색 surface |

모든 안은 같은 고정 시연 상태 사용: 충돌 감지, 부상 있음, 운전자 조작·이동 경로 미확인, 119 통화 연결, 접수 미확인, 차량 지원·보험사 요청 전, 위치 미확인. 실제 통화·녹음·위치 조회·저장 없음. Map은 지리 정보가 없는 추상 배경. Spectrum은 시각 시연용. A의 차량 상태 전환과 기록 button의 시안 안내만 동작.

## Codebase 연결

- React 19, TypeScript strict, Tailwind 4, shadcn `components.json`, `@/` alias 기존 설정 사용. 설치·provider 추가 없음.
- 기본 UI 경로: `src/components/ui` (`@/components/ui`). 이미 존재하므로 repository root에 별도 `/components/ui`를 만들 필요 없음.
- 공통 style: `src/styles.css`. 이 시안의 style은 `src/components/ui/response-concepts.css`에 한정.
- React component: `src/components/ui/response-concepts.tsx`.
- Preview host: `src/journey/ResponseConceptStudy.tsx`, `main.tsx`의 development 전용 `study=response-alts` 분기.
- Finance dashboard 전체 code를 복사하지 않고 시각적 표현을 사고 대응 정보로 재구성. 금융 chart·외부 avatar·Google Font·DOM `innerHTML`·`ts-nocheck` 불필요. 기존 Asta font와 lucide-react 사용.
- 기존 사고 대응 flow와 앞선 static light 시안은 유지. 이 비교 결과로 제품 적용 방향은 아직 결정되지 않음.

## 확인

`npm run check`: TypeScript와 Vite build 확인. 기존 대형 bundle 경고 존재.

`node evidence/response-concepts/verify.mjs`: desktop·mobile capture, 네 화면 × 네 viewport의 가로 overflow, button, URL reload, 방향키 순환·focus 보호, reduced motion, browser error 확인. Screenshot은 이 directory에 저장.

실차 display 가독성·주행 중 사용성·실제 음성 입력·제품 flow 전체 회귀는 이 visual prototype에서 검증하지 않음. 선택한 안을 제품화할 때 별도 검증 필요.

## B′ / B″ 발전안

사용자가 B를 선택하고 두 번째 reference에 더 가까운 안을 요청. 두 번째 reference는 최근 제공된 Finance Bento로 해석한 작업 가정이며, 사용자의 명시적 확인은 아직 없음.

비교 URL: `http://127.0.0.1:5173/?study=response-alts&family=B&variant=compare`. 직접 열기는 `variant=B1` 또는 `variant=B2`. 기존 A/B/C 비교도 유지.

- **B′ · Signal / Halo**: 기존 B의 밝은 shell 유지. 원본의 밝은 rim, blue surface, blur 처리한 어두운 중심을 통화 card에 적용. 기관별 tile은 graphite로 내려 통화와 작은 상태 묶음의 명암 차이 강화.
- **B″ · Signal / Studio**: 검은 shell, dot 숫자, 더 촘촘한 spectrum, blue 통화 card, copper 행동 안내, 얇은 border를 가진 상태 tile. 원본의 여러 재질을 가장 적극적으로 적용한 안.
- 공통 원칙: 통화 연결과 접수 확인은 별개로 표시. 미확인 상태에 percentage나 완료 gauge를 붙이지 않음. B″의 lime 기록 button은 대피 안내보다 강하게 보였으므로 어두운 보조 button과 작은 lime icon으로 조정.

`verify.mjs`는 이제 여섯 view × 네 viewport, B 계열 내 전환·reload, 기존 A/B/C 전환, 기록 안내, reduced motion을 확인하며 screenshot 13개 저장. TypeScript·Vite build 통과. 실차 검증과 제품 flow 적용은 여전히 제외.

## B″ 선택 이후: 독자적인 표현 비교

사용자는 B″를 선택하되, 색이 들어간 card와 dot typography를 reference 그대로 사용하지 않는 발전안을 요청.

비교 URL: `http://127.0.0.1:5173/?study=response-alts&family=studio&variant=compare`. 각 안은 `variant=S1`, `S2`, `S3`. 상단 link로 기존 B″ 확인 가능.

| 안 | Card 표현 | 문자 표현 | 판단할 차이 |
|---|---|---|---|
| 01 · Obsidian | Blue-black과 따뜻한 charcoal의 경계에 절제된 빛 | 큰 실선 119, regular weight | B″의 깊이를 낮은 채도로 유지 |
| 02 · Mineral | 무광 blue와 limestone, gradient 없음 | 큰 실선 119, semibold weight | 색으로 정보를 나누되 원본의 발광 재질에서 분리 |
| 03 · Typographic | Graphite 면, 얇은 경계, 작은 cyan accent | 119는 상단 label, 통화 연결됨을 큰 문장으로 표시 | 번호보다 현재 상태를 먼저 읽는 위계 |

세 안 모두 dot 숫자와 blur 처리한 검은 중심을 제거. 119 통화·요청 상태·map·대피 안내·기록 동작의 기본 배치는 유지. 여기서 제시한 가독성 판단은 시각 검토이며 실차 usability 결과가 아님.

`npm run check` 통과. `verify.mjs`는 아홉 view × 네 viewport, 세 family의 URL 유지와 전환, dot 숫자·원본 blur core 제거, 기록 안내, reduced motion, browser error를 확인. Screenshot 20개 저장.

## 방향 교정: B″의 풍부한 표현 유지

사용자는 앞선 Obsidian / Mineral / Typographic 안을 거절. B″의 design scheme을 좋게 평가한 상태에서 더 색다르고 fine-art에 가까운 변형을 원했으며, 색과 깊이를 줄이는 해석은 잘못된 방향이었음. 위 studio 안들은 결정 이력으로만 유지.

새 비교 URL: `http://127.0.0.1:5173/?study=response-alts&family=art&variant=compare`. 직접 열기는 `F1`, `F2`, `F3`.

- **I · Dichroic**: blue와 amber 표면 위에 비대칭 색유리 굴절과 겹침. 매끄러운 실선 숫자.
- **II · Chromatic stain**: 불규칙하게 번진 염료의 경계, blue·violet·rose 층, italic serif 숫자.
- **III · Spectral relief**: 휘어진 금속 같은 곡면, 미세한 반사선, 빛을 머금은 실선 숫자.

B″의 검은 shell·blue/copper 대비·card 배치 유지. `response-art-surface.tsx`의 정적 SVG로 표면 표현. 외부 asset·새 dependency·실제 통화 data 사용 없음. 정보와 독립된 장식이며 접근성 tree에서 제외. 여러 preview를 함께 render할 때 `useId`로 gradient/filter 참조 분리.

TypeScript·Vite build 통과. `verify.mjs`에서 열두 view × 네 viewport, 모든 family의 전환·reload, SVG ID 중복 없음, reduced motion·browser error 확인. Screenshot 27개 저장. 실차 가독성과 성능은 미검증.

## 최종 선택: plain B″로 rollback

사용자 요청으로 studio·fine-art 변형의 React·CSS·SVG 구현 제거. 기존 B″의 blue/copper gradient, dot 숫자, 검은 shell 복원. `?study=response-alts` 기본 화면은 B″이며 폐기한 S/F URL도 B″로 fallback. A/B/C와 B′는 앞선 비교용으로 유지.

현재 preview: `http://127.0.0.1:5173/?study=response-alts&family=B&variant=B2`.

TypeScript·Vite build와 남은 여섯 view × 네 viewport 확인. 기본·폐기 URL의 B″ 복원, dot 숫자 존재, art surface 제거 확인. 과거 screenshot과 위 기록은 결정 이력으로만 보존.
