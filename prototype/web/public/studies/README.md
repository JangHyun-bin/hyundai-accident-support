# Material studies

## Optical materials — A / B / C

사용자가 승인한 세 가지 방향을 같은 구성에서 비교하는 별도 visual PoC다.

2026-11-06 사용자는 세 PoC를 본 뒤 **C · Satin metal**을 선택했다. 아래 shader·slider 설명은 당시 독립 study의 비교 기준이다. App의 현행 surface·preset 기준은 [Web README](../../README.md)와 [현행 시각 기준](../../../../docs/superpowers/specs/2026-11-12-figma-visual-contract.md)을 따른다.

과거 `?study=emergency&material=satin` preview는 현재 `material=satin` 전환을 지원하지 않는다. 긴급 화면은 [현재 storyboard](http://127.0.0.1:5173/?study=emergency), 독립 C 재질은 아래 study 링크에서 확인한다. 당시 flat/Satin 비교를 현행 app의 선택 기능으로 해석하지 않는다. Web study는 최종 native app 적용을 뜻하지 않는다.

- [세 후보 비교](http://127.0.0.1:5173/studies/optical-materials.html?view=compare)
- [A · Photographic diffusion](http://127.0.0.1:5173/studies/optical-materials.html?variant=A&view=focus)
- [B · Etched glass](http://127.0.0.1:5173/studies/optical-materials.html?variant=B&view=focus)
- [C · Satin metal](http://127.0.0.1:5173/studies/optical-materials.html?variant=C&view=focus)

`optical-materials.html` 하나에 HTML·CSS·JavaScript·GLSL을 포함했다. 외부 library나 image texture 없이 WebGL 2로 그린다. 기존 `npm run dev` 또는 HTML 직접 열기로 실행한다. 상단의 reference link는 이전 study로 이동하는 선택적 navigation이다.

### 비교 방법

- `나란히 비교`는 A/B/C를 동시에 보여준다. `크게 보기`와 상단 A/B/C는 선택한 후보를 크게 보여준다.
- `질감 강도`, `광학 효과`, `조명 방향`은 세 후보의 공통 조절값이다. 값의 범위는 시각 비교용이며 물리 단위나 동일한 효과 크기를 뜻하지 않는다.
- `효과 전 비교`는 texture와 optics를 모두 0으로 만들어 세 후보를 동일한 gradient·border·mark로 되돌린다. 다시 누르면 원래 설정으로 돌아간다.
- `배경만 보기`는 문구·border·mark를 숨긴다. `초기화`는 질감 70%, 광학 효과 65%, 조명 35°, 내용 표시로 되돌린다.
- 크게 보기에서 pointer 이동 또는 touch로 inspection 위치를 고른다. Detail은 canvas의 실제 render를 표시 크기 기준 3배 확대한다.
- 좌우 방향키로 후보를 바꾼다. Input에 focus가 있으면 방향키는 input을 조절한다.
- URL에는 후보와 보기 방식만 남는다. Slider 값은 저장하지 않는다. 자동 animation은 없고 seed도 고정이다.

### 실제 구현한 차이

| 후보 | 표면 계산 | 광학 효과 |
|---|---|---|
| A · Photographic diffusion | Jittered cell의 sparse kernel에 서로 다른 radius·weight를 부여한다. 두 공간 scale의 입자와 저주파 밀도 변화를 합성하고 밝기에 따라 강도를 조절한다. | 넓은 diffusion field와 밝은 영역을 추출하는 threshold, 분리된 가로·세로 blur pass, bloom 합성. |
| B · Etched glass | Domain-warped Worley distance를 두 scale로 합성해 height field를 만든다. 화면 공간 derivative로 local normal을 근사한다. | Normal로 gradient 좌표를 이동시키는 refraction 근사, 넓은 조명의 reflection, 약한 Fresnel 항과 border 반사. |
| C · Satin metal | 길쭉한 domain에서 Gaussian window와 cosine carrier를 합성하는 sparse Gabor kernel. Kernel별 방향·주파수·phase를 달리하고 두 scale를 합성한다. | Roughness에 따라 폭이 달라지는 길쭉한 highlight와 넓은 shoulder. 조명 방향에 따라 회전·이동하는 anisotropic sheen 근사. |

세 후보는 동일한 gradient·문구·mark·배치를 사용한다. Text는 shader 밖의 동일한 HTML layer로 유지한다. 작은 noise bitmap을 반복하지 않는다. 3배 확대 확인 중 C의 과도한 고주파·규칙적인 stripe를 줄였고, gradient 구간마다 생기던 밝기 정체도 제거했다.

기술 원리 참고: [Realistic Film Grain Rendering](https://www.ipol.im/pub/art/2017/192/), [Sparse Gabor Convolution](https://graphics.cs.kuleuven.be/publications/LLDD09PNSGC/), [Microfacet Theory](https://www.pbr-book.org/4ed/Reflection_Models/Roughness_Using_Microfacet_Theory). 논문의 code나 물리 simulation 전체를 이식한 구현은 아니다. 이 study의 shader는 직접 작성한 LDR visual approximation이다.

### 검증과 범위

`npm run test:ui -- tests/optical-materials.spec.ts`로 확인한다. 서로 다른 실제 canvas 출력, 효과 제거 시 공통 baseline, 정지 render의 재현성, 조명 변경, detail inspection, 초기화, keyboard·URL 전환, 375px overflow, offline 실행, WebGL 불가 안내를 검사한다. Capture는 `prototype/web/evidence/optical-materials/`에 있다.

WebGL 2가 필요하다. 사용할 수 없으면 오류를 표시하며 CSS fallback을 완성된 material로 제시하지 않는다. On-demand render이고 자동 frame loop는 없다. 차량 GPU·AAOS·Compose 이식, 실제 재료의 광학 정확도, display calibration과 사용자 가독성은 검증하지 않았다. 이 절의 구현·검증 범위는 당시 독립 study이며 이후 app 변경을 설명하지 않는다.

## Subtle gradient study — original

질문: 사용자가 제공한 image의 넓은 색 변화와 미세한 질감을, 독립 HTML에서 비슷하게 재현할 수 있는가?

- Localhost: `http://127.0.0.1:5173/studies/subtle-gradient.html` — 기존 `prototype/web`에서 `npm run dev`.
- Offline: `subtle-gradient.html`을 browser로 직접 연다. Reference PNG, CSS, SVG noise, JavaScript를 한 파일에 포함했다. 외부 font·library·network dependency가 없다.
- Throwaway study다. 기존 React 화면, scenario spec, native app은 변경하지 않았다. 사용자 평가 전이며 최종 design으로 채택하지 않았다.

## 관찰과 재현

제공된 image는 576 × 586 px다. 중앙 x=288 주변 16 × 16 px의 RGB 평균은 y=150에서 약 `(15, 23, 87)`, y=350에서 `(87, 114, 150)`, y=550에서 `(209, 209, 210)`이다. 이 값은 제공된 raster의 관찰값이며 원본 design token이나 source CSS가 아니다.

1. 거의 검은 상단에서 midnight blue, blue-gray로 이어지는 넓은 `linear-gradient`.
2. 아래쪽으로 갈수록 opacity가 커지는 밝은 haze. 약간 기울어진 축으로 오른쪽을 조금 더 밝게 한다.
3. 정지된 SVG `feTurbulence`를 `soft-light`로 합성한 grain.
4. 배경을 가리지 않는 얇은 border. Card 내부에 별도 fill이나 `backdrop-filter`를 넣지 않는다.

`하단 빛`, `Grain`, `Border` slider로 각 layer의 강도를 조절한다. `배경만 보기`는 문구·mark·border를 숨긴다. `초기화`는 첫 설정으로 되돌린다. 현재 값은 controls 아래에 표시하며 저장하지 않는다. Animation은 없다.

Reference의 grain과 blur가 원래 효과인지 촬영·압축 영향인지는 확인할 수 없다. 문구는 시각 비교를 위해 유지했으며 app 기능을 의미하지 않는다. Font와 mark는 근사값이다. CSS 재현에 reference bitmap을 배경으로 사용하지 않았다.

## 확인

실제 Chrome에서 desktop·375 px 화면을 확인했다. Slider, 배경 보기, 초기화, browser error, 가로 overflow, `file://` 실행과 외부 HTTP dependency를 점검했다. Capture와 결과는 `prototype/web/evidence/gradient-study/`에 있다.

이 study는 reference와의 시각 비교용이다. 차량 화면의 가독성·contrast·성능, 실제 app 적용은 아직 검증하지 않았다.
