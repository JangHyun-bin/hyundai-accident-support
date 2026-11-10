# Functional UI token audit

- Journey의 vehicle·voice·photo·review·diagram·report·submission·follow-up CSS에서 legacy `--j-*` 참조 없음.
- Functional CSS의 직접 색상 literal은 dialog backdrop 한 건이었으며 `--ac-scrim`으로 이동.
- 공용 token은 `src/design-system/tokens.css`, material은 `surfaces.ts`와 `SurfaceTheme.tsx`에서 관리.
- `ResponseConceptStudy` 등 보존한 비교 시안은 별도 historical reference이므로 token migration 대상에서 제외.
- SVG 내부 좌표·선 굵기, sensor meter 계산, 자료 표시의 aspect ratio는 의미 있는 geometry로 유지.
- Body 17px, 48px target, reduced motion, 200% text와 C/C_02 보존은 browser suite에서 확인.
