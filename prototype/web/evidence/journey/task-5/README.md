# Task 5 사진 자료

실제 journey route에서 대상 선택, 촬영 또는 file 선택, preview 확인, 저장, 교체, 삭제, 생략을 검증. 사진은 browser의 IndexedDB에만 보관하며 외부 전송 없음.

`EvidencePanel`은 저장된 case를 읽어 확보 개수를 표시. 새 사진의 optimistic state만으로 확보 완료를 표시하지 않음. 저장 실패 시 이전 thumbnail과 새 preview를 유지. 일반적인 화면 전환은 미저장 preview의 저장 또는 명시적 버리기를 요구. 긴급 전환은 즉시 허용하고 decode 중인 사진도 복귀 후 유지.

촬영 시작은 명시적인 button 동작에서만 `getUserMedia` 호출. 촬영 후, 취소, pagehide, unmount, 오류에서 track 정리. 취소 이후 늦게 도착한 stream도 해제. Browser fake camera는 test에서만 사용.

검증 기록:

- `journey-evidence.spec.ts` 13개와 기존 `journey-storage.spec.ts` 11개, 총 24개 통과. `/tmp/hyundai-task5-final.log`.
- 삭제 성공 문구의 별도 회귀 test는 RED 후 GREEN 확인. `/tmp/hyundai-task5-delete-red.log`, `/tmp/hyundai-task5-delete-green.log`.
- `npm run check` 통과. `/tmp/hyundai-task5-build.log`. 기존 500 kB chunk warning 유지.
- JPEG·PNG·WebP의 decode 및 reload, 15 MiB 초과·미지원 형식·손상된 image 거절 확인.
- 12개 photo file 제한과 대상별 `1 / 6`의 구별 확인. 대상 1개에 사진 12장이 있어도 확보 대상은 1개.
- 360px와 200% text에서 주 행동 접근 및 가로 overflow 없음 확인.

직접 확인한 screenshot:

- `photo-targets-mobile.png`: 393px에서 대상 목록, 확보 개수, 생략 경로 확인.
- `photo-review-mobile.png`: 기존 Pleos token의 사진 preview, 주 저장 행동, 보조 버리기 행동 확인.
- `photo-stored-vehicle.png`: 저장된 대상만 작은 확인 표시로 구분. 차량의 두 box와 별도 지도 영역 유지.

Screenshot의 사진은 `public/journey-samples/own-car.png`의 합성 자료. 출처는 `public/journey-samples/SOURCES.md`에 기록. 개인 사진 사용 없음.

실기 camera, Safari, 실제 기관 전송은 Not verified. 저장 전 preview는 메모리에 보존되며 tab을 완전히 닫으면 복원되지 않음.
