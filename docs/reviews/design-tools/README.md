# 네 design 도구의 독립 적용안

기존 A를 같은 사고 상황·문구·동작으로 유지하며 Impeccable, UI UX Pro Max, Hallmark, anti-slop을 각각 적용하였다. [비교 화면](http://127.0.0.1:5173/?study=tools)은 네 후보와 기존 A, 이름 숨김·공개, 두 화면 비교를 제공한다. 번호는 고정이며 통계적 A/B 실험이나 엄격한 blind 평가가 아니다.

| 번호 | 적용 근거 | Source |
| --- | --- | --- |
| 안 1 | [Impeccable](impeccable.md) | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) |
| 안 2 | [UI UX Pro Max](uiux.md) | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| 안 3 | [Hallmark](hallmark.md) | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) |
| 안 4 | [anti-slop](antislop.md) | [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) |

각 skill의 실제 원문·search·rule을 적용하였으며 runtime UI library 네 개를 설치한 것은 아니다. 기존 Cult UI·Motion Primitives source와 동작을 공유한다. 사용한 source와 version 또는 hash는 개별 기록을 따른다.

사용자는 이 안들이 긴급 상황에서 긴 문장을 읽어야 한다는 공통 한계를 지적하였다. 이에 따라 후속 방향은 [상황 spec + 시각 중심 storyboard](../../../specs/emergency-experience/principles.md)로 바뀌었다. 이 네 안은 선행 비교 자료이며 최종안이 아니다.
