# B″ surface 조절 시안

질문: 현재 B″의 colored card를 직접 조절해 개인 preset으로 만들 수 있는가?

Preview: `http://127.0.0.1:5173/?study=response-alts&focus=surface`.
`prototype/web`에서 `npm run dev` 실행. 숫자 비교 화면 하단에서도 이동 가능.

## 사용

- 119 통화 / 대피 안내 중 조절할 card 선택.
- 첫 색·중간 색·끝 색·shade 색, gradient 방향·번짐, shade 농도·blur·위치·크기·둥글기, rim 밝기 조절.
- 큰 card preview와 아래 전체 B″ 화면에 동시에 반영. 숫자는 원래 비율의 Asta Solid 사용.
- 원본 비교는 편집값을 유지하며 B″ 원래 surface를 보여줌. 비교 중에는 조절 input 비활성화.
- 이 card 초기화는 선택한 card만 복원. 원본 preset 불러오기는 두 card 모두 복원.
- 이름을 붙여 두 card의 조합 저장. 같은 이름이면 button이 `이 preset 업데이트`로 표시.
- 편집값과 named preset은 browser localStorage의 `response-surface-study-v1`에 보관. 사고 기록 storage와 분리.
- 현재 조합은 JSON 내려받기로 별도 보관 가능. JSON에는 version, name, 두 card의 parameter 포함. JSON import·device 간 동기화는 구현 범위에서 제외.

## 구현과 검증

기존 `Call`·`Safety` component를 그대로 사용하고 card별 CSS custom property로 surface만 변경. Property가 없으면 기존 B″ 표현 유지. 기존 시안 branch에서 development 전용 `focus=surface`로 진입하며 실제 사고 대응 flow에는 미적용.

`npm run check` 통과. `node evidence/response-surfaces/verify.mjs`에서 live 반영, 두 card의 독립 편집, 원본 비교, 초기화, preset 저장·업데이트·불러오기·reload, JSON export, 1600/1024/768/393px의 overflow, keyboard 조작, 손상된 storage와 저장 실패 안내 확인. Browser error 없음.

기존 `response-numerals/verify.mjs`도 통과. CSS fallback과 component 연결 후에도 숫자 외 기존 B″의 배치·색·문구 유지 확인. Desktop/mobile screenshot 시각 검토 완료.

Preset은 같은 browser·origin에 한정. `localhost`와 `127.0.0.1`은 저장 공간이 다름. Browser 저장소를 지우면 사라지므로 필요한 조합은 JSON으로 보관. 실차 display의 대비·가독성과 제품 적용은 미검증.

## Chromatic aberration · grain

- `05 / Chromatic aberration`: 가장자리의 색 분리 거리와 Lens 축 조절. 중심에서 RGB가 정렬되고 가장자리로 갈수록 분리가 커지는 radial displacement 사용. Lens 축은 약한 anisotropic magnification의 주축이며 기존 `chromaticAngle` 값으로 보관. Surface·rim에 적용하고 text·icon은 filter 밖에 유지.
- `06 / Film grain`: 강도·입자 크기·뭉침·명암 반응·seed 조절. 두 크기의 correlated Gaussian field를 혼합하고 subpixel 4회 sampling으로 작은 입자의 aliasing 감소. Luminance에 따라 중간 밝기에서 강하고 양 끝에서 약해지는 mask와 soft-light 합성 사용.
- Texture는 card 크기에 맞춰 생성하므로 반복 tile 없음. 같은 크기·parameter·seed에서는 같은 texture 유지. Animation loop 없이 입자 parameter 또는 card 크기 변경 때 생성. DPR 최대 2, 긴 변 최대 2048px.
- Grain은 가벼운 Gaussian 근사이며 physical film emulsion simulation은 아님. 실제 emulsion model의 참고 자료는 [Realistic Film Grain Rendering](https://www.ipol.im/pub/art/2017/192/). 해당 논문의 code는 사용하지 않음.
- 기존 preset에는 effect 강도 0을 보완. 읽기만으로 localStorage를 다시 쓰지 않으며 기존 색·shade·이름 보존. Effect 조절 후 preset 업데이트로 함께 저장 가능.

`npm run check`, `verify.mjs`, `verify-effects.mjs` 통과. Effects 검증은 별도 browser context의 synthetic legacy `C`·`C_02`로 수행. 읽을 때 storage 불변, 기존 값 보존, 독립 편집, deterministic seed, unique filter ID, text 분리, 저장·reload, 원본 비교, DPR 2 및 mobile overflow 확인. 사용자 browser의 preset은 test에서 변경하지 않음.

`effects-desktop.png`·`effects-mobile.png`는 chromatic 2px·grain 18%의 예시. Mobile screenshot에서 text 가독성과 모서리 합성 확인. 실차 GPU 및 Safari는 미검증.

### CA의 optical 방향 보완

이전 구현은 RGB를 모든 위치에서 같은 방향으로 이동시키고 rim은 filter 밖에 두었음. 사용자 feedback에 따라 일정한 translation을 radial dispersion으로 교체. Red는 중심 기준으로 확장하고 blue는 수축하며, 중앙에서는 정렬 유지. 작은 channel별 blur를 추가하고 rim을 filter 안에 포함. Grain은 dispersion 이후 합성하므로 film grain 자체는 RGB로 분리하지 않음.

[SVG feDisplacementMap](https://www.w3.org/TR/filter-effects-1/#feDisplacementMapElement)으로 공간별 sampling 위치를 변경. 실제 lens의 wavelength별 ray tracing은 아니며 lateral CA의 시각적 근사. 어두운 gradient의 banding을 피하려고 filter는 sRGB에서 처리. 넓고 부드러운 gradient에서는 색 변화가 약하고 밝은 rim에서 fringe가 더 잘 드러남.

`verify-optical.mjs`에서 white landmark의 실제 screenshot pixel을 측정. 12px 설정에서 왼쪽은 red·green·blue 순서, 오른쪽은 반대 순서이며 중앙은 같은 위치인 것을 검증. Lens 축 변경·복원, mobile overflow, browser error도 확인. `ca-translation-before.png`·`ca-radial-after.png`는 같은 12px·grain 0 조건. `ca-optical-landmarks.png`는 분리 방향 검증용 임시 landmark이며 실제 UI에는 포함하지 않음. `verify-effects.mjs`·`verify.mjs`와 build도 다시 통과.

### 실제 card에서 CA가 보이지 않는 문제 조사

사용자 browser에서 `chromatic:23.25`, `chromaticAngle:201`, `grain:22` 및 최신 UI 확인. 별도 browser context에서 같은 call parameter로 재현. Control 24, state 24, SVG scale -21.6/26.4까지 전달됨을 확인했으므로 control 연결 문제는 아님.

기존 landmark 검증은 filter 안에 강한 흰색 경계를 추가했기 때문에 실제 card의 문제를 놓침. 실제 card에서는 49px blur를 가진 background만 이동하고 119·icon·spectrum은 범위 밖에 있음. 더구나 outward fringe는 마지막 `SourceAlpha` mask와 부모의 `overflow:hidden`으로 제거됨. Filter 범위를 넓혀도 최종 output을 다시 원래 윤곽으로 자르면 분리가 사라짐.

Fix는 material의 합성 순서에 한정. Source를 rounded card 모양으로 먼저 clip하고, CA는 바깥 material layer에 적용해 optical output을 자르지 않음. Displacement map도 filter의 -10%–110% 영역까지 채워 card 밖에서 transparent map이 사선 translation을 만드는 문제 방지. Text·icon은 기존대로 filter 밖에 유지. 저장 schema와 preset 값은 변경하지 않음. [W3C filter region·SourceAlpha 정의](https://www.w3.org/TR/filter-effects-1/) 참고.

새 `verify-ca-visibility.mjs`는 사용자 call parameter를 넣은 실제 card screenshot으로 검증. Fix 전 CA 24에서도 좌우 outward fringe pixel이 0/0으로 실패. Fix 후 474/395로 통과. 119의 흰색 pixel 3,789개는 변화 0개, CA를 0으로 되돌린 screenshot은 원본과 byte 단위로 동일. 이 수치는 DPR 1·1600px viewport의 fixture 결과이며 지각적 품질 점수는 아님. `ca-real-0.png`·`ca-real-24.png`로 비교 가능. CA 24는 분리를 확인하는 극단값이며 최종 design 강도는 별도 선택.

Fix 후 `verify-ca-visibility.mjs`, `verify-optical.mjs`, `verify-effects.mjs`, `verify.mjs` 및 `npm run check` 통과. 전체 `npm run test:ui -- --workers=2`도 260개 통과(4.5분). Build의 기존 500kB chunk 경고 유지. 개인 Chrome의 fix 이후 재관찰은 native pipe·browser access host 연결 실패로 완료하지 못했으며, screenshot 검증은 별도 Chrome context에서 수행.

## Rounded split card 검토

사용자 reference는 shared diagonal boundary를 가진 rounded split card로 해석. 인접 card가 같은 경계에서 일정 거리만큼 떨어지도록 geometry를 계산하고, 각 모서리를 tangent Bézier curve로 연결하는 안. [SVG path](https://www.w3.org/TR/SVG/paths.html)로 surface 윤곽을 정의하고 text layout은 수평 유지. B″의 grid·색을 보존하며 인접 card 한 쌍부터 적용하는 방향. 현재는 제안만 기록했으며 shape 변경은 미구현.

## 공통 finish와 다음 shape 논의

사용자 요청: 두 colored card의 grain을 일관되게 정리하고 CA를 아주 약하게 낮춘 뒤 Voronoi-like split 논의로 이동.

공통값은 grain 12%, size 0.8px, clumping 12%, tone 75%, seed 303, CA 1px, Lens axis 0°. `추천 질감 · 두 card에 적용` 또는 `?study=response-alts&focus=surface&finish=studio` 진입으로 현재 draft의 effect 값만 함께 변경. 색·shade·saved preset은 보존. URL command는 1회 처리 후 제거해 나중에 사용자가 편집한 값이 reload 때 초기화되지 않음. Storage 읽기에 실패하면 자동 적용하지 않음.

개인 browser automation 연결이 불가해 실제 사용자 draft 변경은 위 link 진입 시 수행. 별도 Chrome에서 두 card 동시 적용, 기존 C/C_02 보존, URL 소비, 후속 편집·reload, mobile 및 손상된 storage 보호 확인. `verify-finish.mjs`, `verify-ca-visibility.mjs`, 기존 `verify.mjs`, build 통과. 공통 finish 검토 중 발견한 grain의 투명 corner 누출도 regression으로 재현 후 fix: grain mask에는 SourceAlpha를 적용하되 CA의 outward fringe는 유지. Screenshot은 `studio-finish-context.png`·`studio-finish-mobile.png`.

Shape 후보는 아직 미선택이며 다음 내용은 제안:

- A / shared diagonal: 오른쪽 map·대피 안내 사이만 약 4° 기울인 공통 경계. 현재 16px gap과 28px corner를 출발값으로 유지. 좌우 1:1 및 통화 영역 보존. Reference에 가장 가까워 첫 시안으로 추천.
- B / three-cell junction: 통화·map·대피 안내가 중앙의 어긋난 T자 접점에서 만나는 구성. Voronoi-like 인상은 강하지만 세 card의 면적과 text safe area를 함께 재조정해야 함.
- 공통 기준: card별로 따로 skew하지 않고 하나의 경계에서 양쪽 shape 계산. Gap은 경계의 수직 방향으로 일정하게 유지. Text는 수평 유지하고 shape의 가장 좁은 부분을 기준으로 여백 확보. Shape를 source에 적용한 뒤 grain·CA 합성. 작은 화면에서는 기존 수직 stack으로 복원.
