# Subtle gradient study

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
