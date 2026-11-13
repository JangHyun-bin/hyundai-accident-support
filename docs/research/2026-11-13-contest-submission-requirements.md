# 차량용 앱 공모전 제출 요건 조사

2026-11-13에 공식 공모전 사이트, 접수 DOCX, 연결된 Pleos 개발 문서와 현재 저장소를 대조했다. 공식 규정, 확인한 구현, 미확인 사항을 구분한다. 제품 구현, 빌드, 테스트, 산출물 업로드, 메일 발송은 이 조사에서 수행하지 않았다.

## 먼저 구분해야 할 제출 단계

| 단계 | 확인된 의무와 선택사항 |
| --- | --- |
| 1차 접수 | **2026-11-15 23:59 KST까지 작성·서명한 접수양식으로 지원할 수 있다.** 접수양식 자체가 기획서다. 실제 동작하는 완성 앱은 이 날짜의 필수 제출물이 아니다. 시연 영상, 소스 코드와 APK를 포함한 GitHub 저장소는 선택 제출이며 단계별 가산점 대상이다. [접수양식][form], [일정][schedule], [제출 안내][submission] |
| 2차 PT | 1차 합격팀 20팀은 PT 전까지 실제 동작 가능한 앱 개발과 최종 개발 결과물 제출을 마쳐야 한다. PT는 2026-12-03~12-04에 진행한다. 공지 008은 Pleos Connect 에뮬레이터 구동 앱의 시연을 명시하며 실차는 필요하지 않다고 안내한다. 1차 산출물은 PT 전까지 고도화할 수 있다. [공지 006][n6], [공지 008][n8], [심사 안내][judging], [일정][schedule] |
| 최종 선정 후 | 2026-12-18에 선정 결과를 발표한다. 선정된 10팀은 2027년 2월 공식 행사에 직접 참여해 전시·시연·시상식에 참석하고, 전시 구동용 최종 APK를 제출해야 한다. PT 결과물로 순위가 결정되므로 이후 추가 개발은 순위에 영향을 주지 않는다. 전시 준비는 영상 제작 협조와 구동 안정화 중심이다. [공지 006][n6], [FAQ][faq], [일정][schedule] |

1차 필수 평가항목은 차량특화성, 창의성, 기술 활용성, 사업성이다. 세부 배점과 개발 산출물별 가산점 수치는 공개하지 않는다. 2차 PT 세부 평가기준과 전시 준비의 추가 제출물·기한은 추후 안내 항목이다. [심사 안내][judging]

## 접수와 선택 산출물의 정확한 규칙

- 접수처는 `appdevchallenge@hyundai-partners.com`이다. 제목은 `[차량용 앱 개발 공모전] 팀명(개인은 성명)_대표자명`이다. [제출 안내][submission]
- 개인 또는 대표자와 모든 팀원이 각각 동의 여부, 본인 서명, 날짜를 작성해야 한다. 팀원 전원을 CC에 넣어야 하며, CC만으로 개별 동의를 대체할 수 없다. [제출 안내][submission], [접수양식][form]
- 공식 양식은 DOCX로 배포하지만 **DOCX와 PDF 모두 제출할 수 있다.** 패드·마우스 전자서명과 서명 이미지 삽입을 인정한다. 필수 항목과 순서를 유지하면 글꼴·표 변경과 이미지·도표 추가도 가능하다. [공지 007][n7]
- 대표자가 아닌 팀원 메일로도 제출할 수 있다. 수정은 처음 제출한 발신자 주소에서 마감 전까지 보내야 한다. 수정 제목은 `[수정제출] [차량용 앱 개발 공모전] 팀명(개인은 성명)_대표자명`이다. 전체 제출물과 서명한 동의서를 다시 첨부하고 전원을 CC에 넣는다. 마감 전 마지막 제출본이 최종본이다. [공지 007][n7], [참가 규정][rules]
- 시연 영상은 목업, 프로토타입, 화면 녹화를 인정한다. 시연 영상과 첨부자료의 분량에는 별도 제한이 없다. 추가 PPT, PDF, HTML은 심사 참고자료로 첨부할 수 있다. 작품 소개 자료에도 분량 제한이 없다고 양식에 명시한다. [제출 안내][submission], [공지 007][n7], [접수양식][form]
- 숏폼은 선택사항이며 본상 가산점이 없다. 별도 특별상 참여 영상만 30초~1분 이내 세로 영상 조건이 있다. 이 길이를 일반 시연 영상 제한으로 적용하면 안 된다. [FAQ][faq]

### 작품 소개의 여덟 항목

공식 양식의 `02 앱 프로젝트 소개 / 심사 자료`는 아래 순서다. 작품 소개 분량에는 제한이 없으며 작성란은 내용에 따라 늘어난다. [접수양식][form]

1. 앱 한 줄 소개를 작성한다.
2. 기획 배경을 작성한다.
3. 앱 주요 기능 및 차량 특화 요소를 작성한다.
4. 주요 사용 시나리오를 작성한다.
5. 개발 계획에 Pleos Connect 구현 범위와 SDK·API 사용계획을 작성한다.
6. 기대효과 및 발전 가능성을 작성한다. 타깃 고객 분석, 예상 MAU, Retention Rate, 서비스 확대 계획 등을 안내 예시로 제시한다.
7. 참고자료는 선택 제출이며 가산점 대상이다.
8. 숏폼 링크는 선택 제출이며 본상 가산점이 없다.

### GitHub와 APK를 선택 제출할 때

- 기존 개발 저장소나 새 저장소를 사용할 수 있다. APK만 단독 제출하는 대신 소스 코드와 APK를 함께 제출한다. APK는 `apk/`에 두고 파일명은 `팀명_앱이름_release.apk`로 한다. **실행 가능한 release 버전**을 요구한다. [제출 안내][submission], [FAQ][faq]
- GitHub 업로드 한도를 넘는 APK는 GitHub Releases에 등록하고 해당 Release 페이지 주소를 제출할 수 있다. 공모전 자체의 별도 APK 용량 한도는 확인한 안내에 명시되어 있지 않다. [제출 안내][submission]
- 접수 메일에는 저장소 주소와 최종 커밋 해시를 적는다. APK 경로 또는 Release 링크도 함께 명확히 제시하는 것이 안내 취지에 맞는다. 심사는 접수 메일에 적힌 커밋 기준이다. [제출 안내][submission], [공지 007][n7]
- 마감까지 비공개로 둘 수 있다. 11월 16일까지 Public으로 전환해 11월 23일까지 유지해야 한다. 미공개 상태이면 개발 산출물 가산점을 반영하지 않는다. 심사용 계정을 Collaborator로 초대할 필요는 없다. [공지 007][n7]
- 공개가 어려우면 소스 코드와 APK를 압축한 파일의 다운로드 URL을 마감 전 접수 메일로 제출할 수 있다. 이미 접수했다면 처음 제출한 메일 주소로 최종 커밋 번호만 회신할 수 있다는 추가 안내가 있다. [공지 007][n7]
- API 키 등 비밀값은 저장소에서 제외할 수 있고 자체 서버 소스는 필수 제출 대상이 아니다. 이 허용이 실행 방법과 필요한 설정을 생략해도 된다는 뜻은 아니다. [공지 007][n7], [제출 안내][submission]
- README에는 앱 이름과 한 줄 소개, 실행 방법, 테스트 환경과 필요한 설정, 사용한 Pleos Connect 에뮬레이터 버전과 화면 규격, APK 위치 또는 Release 링크를 적는다. [제출 안내][submission]

## 참가 자격과 작품 권리

- 대학생·대학원생·일반인·스타트업이 개인 또는 대표자 포함 최대 5인 팀으로 참가할 수 있다. 시상은 대학생 부문과 일반 부문으로 나뉘며 스타트업은 일반 부문이다. 현대자동차그룹 임직원은 참가할 수 있지만 최종 시상과 상금 대상에서 제외된다. 혼합 팀의 부문 판정, 연령·국적 제한, 여러 작품·팀의 중복 참가 세부 규칙은 확인한 페이지에 명시되어 있지 않다. [참가 규정][rules], [공지 006][n6]
- 순수 창작물이어야 한다. 타인 작품의 일부·전부 표절과 기발표된 타 공모전 수상작은 심사 대상에서 제외된다. 허위 기재는 선정 취소 사유이며 권리 침해 등 법적 문제는 수상 취소와 상금 환수로 이어질 수 있다. [공지 006][n6]
- **기존 작업 전체를 일률적으로 금지하거나 공고 후 새로 작성한 코드만 허용한다는 규정은 확인되지 않았다.** 기존 저장소 사용은 명시적으로 허용된다. 다만 이것이 기존 타 공모전 수상작 재출품 허용을 뜻하지는 않는다. 기존 작업의 참가자별 권리와 기여는 독립 창작·적법 사용 요건과 별도로 확인해야 한다. [제출 안내][submission], [공지 006][n6], [약관 제7조][terms]
- 소스 코드, 라이브러리, 데이터, 이미지, 음원, 영상, 글꼴, 상표를 적법하게 사용할 권리가 있어야 한다. 오픈소스 구성요소는 해당 라이선스를 준수하고 출처를 밝혀야 한다. GitHub 공개 의무와 별개로 출품작 전체에 특정 오픈소스 라이선스를 적용하라는 요건은 확인되지 않았다. [약관 제7조][terms]
- 확인한 참가 규정·FAQ·공지·약관에는 생성형 AI 도구 사용의 일괄 허용, 금지, 공개 의무를 정한 별도 조항이 없다. 이를 AI 사용에 대한 적극적 허가로 해석할 수는 없다. 독립 기획·개발, 사실대로 표시, 권리 침해 금지는 그대로 적용된다. Pleos LLM SDK 미제공은 아래의 기술 제공 범위 문제다. [약관 제7·9조][terms], [공지 006][n6], [공지 008][n8]
- 출품 자료의 지식재산권은 응모자에게 있다. 수상 아이디어는 주최측 통상실시권의 대가·범위·기간을 상호 협의할 수 있고, 결과 발표일부터 4개월의 IP 양도 우선협상권 조항이 있다. 비영리 공익 목적 복제·전송과 별도 합의에 따른 2차적 저작물·수익화 조항도 있다. 수상과 동시에 모든 권리가 자동 양도된다는 규정은 아니다. [공지 006][n6]

## 개발 환경과 허용 SDK

- 공모전 개발 안내는 Android API 28 이상, Gradle 8.0 이상, Java 또는 Kotlin을 명시한다. Pleos 설정 문서는 이를 `minSdk` 28 이상으로 설명하며 현재 설치 예시는 Android API 34의 Pleos Connect Emulator 2.1.0을 사용한다. API 28과 에뮬레이터 API 34는 서로 다른 항목이다. [개발 환경][development], [에뮬레이터 설치][setup]
- 이 언어·환경 안내는 Pleos Connect 앱 개발 기준이다. **11월 15일에 Java/Kotlin 완성 앱 제출이 필수라는 뜻은 아니다.** 웹 목업의 1차 참고자료 제출은 가능하지만 웹 화면만으로 2차의 에뮬레이터 구동 앱 요건을 충족한다고 볼 근거는 없다. 크로스플랫폼·WebView 사용 전체를 별도로 허용하거나 금지한 조항도 확인되지 않았다. [제출 안내][submission], [공지 008][n8], [개발 환경][development]
- 허용 범위는 현재 공개된 Pleos Playground 문서의 SDK·API다. Vehicle, NaviHelper, TextToSpeech, SpeechToText, FusedLocation을 사용할 수 있다. Workspace에 '준비 중'으로 표시되어 있어도 공개 문서 방식으로 에뮬레이터 개발·시험이 가능하다. 다섯 SDK를 모두 사용해야 한다는 조건은 없다. [공지 008][n8], [심사 안내][judging]
- 미공개 SDK와 Pleos LLM SDK는 공모전 기간에 제공하지 않는다. 문서가 지원하지 않는 기능은 사용할 수 없으며 필요한 경우 향후 계획으로 적는다. Gleo Interface의 App Schema는 참가팀이 별도 검토·승인 없이 사용할 수 있다. [공지 008][n8]
- 차량 마이크 음성을 외부 음성 인식 서비스로 보내는 방식은 허용하지 않는다. SpeechToText SDK를 사용해야 한다. 해당 SDK는 음성을 텍스트로 변환하며 자체적으로 명령을 실행하지 않는다. ON_DEVICE는 네트워크와 앱 등록 없이 사용할 수 있지만 HYBRID와 SERVER의 서버 인식은 앱 등록이 필요하다고 개발 문서가 설명한다. [공지 008][n8], [SpeechToText 안내][stt]
- Vehicle API 사용에는 해당 권한의 Manifest 선언과 기능별 Capability 확인이 필요하다. 일반 SDK 문서의 Pleos App Market 입점 심사·권한 승인 절차를 공모전 접수 필수절차로 혼동하면 안 된다. 공지 008은 공모전 심사가 입점 심사가 아니라고 명시한다. 입점·배포는 별도 검증 대상이다. [Vehicle 권한][permission], [Capability][capability], [SDK 개요][sdk], [공지 008][n8], [심사 안내][judging]

## 사고 대응 기획에 필요한 기능과 한계

아래는 개발 문서에서 확인한 범위다. 제품의 실차 성능이나 외부 기관의 연계를 검증한 결과가 아니다.

| 대상 기능 | 문서로 확인된 범위와 남는 제약 |
| --- | --- |
| 차량 상태·센서 | Vehicle SDK는 브레이크, 문, 주행 모드, 안전 경고, 좌석 등 도메인의 조회·일부 제어를 제공한다. 기능과 영역별 지원·접근 권한은 달라질 수 있다. 차량 물리 센서·제어장치에 직접 접근하는 방식은 금지하며 일부 자이로·근접 센서 등 모바일 API도 제한될 수 있다. [Vehicle 개요][vehicle], [Capability][capability], [하드웨어 정책][hardware] |
| 속도·급감속 추정 | Pleos 개발 FAQ는 클러스터와 같은 차량 속도를 얻으려면 AAOS `CarPropertyManager`의 `PERF_VEHICLE_SPEED`를 사용한다고 설명한다. GPS 속도와 차량 신호 속도는 다를 수 있다. 차량별 Property 지원·접근 확인이 필요하며 SDK가 제공하지 않는 특수 Property는 구현 전 기술 검토가 필요하다고 안내한다. 속도 변화가 곧 검증된 충돌 판정이라는 근거는 없다. [개발 FAQ][runtime], [API 가용성][availability] |
| 충돌·에어백 이벤트 | 확인한 Vehicle 도메인 개요와 Virtual Console 기능 목록은 안전 경고·브레이크 등의 상태를 제공하지만, 충돌 확정·충돌 심각도·원시 가속도 스트림을 사고 검출 API로 보장하지 않는다. 확인한 자료에서 해당 전용 API를 확보하지 못했다. 따라서 'SDK로 충돌 자동 감지를 지원한다'고 단정할 수 없다. 문서 미지원 기능은 향후 계획으로 구분한다. [Vehicle 개요][vehicle], [Console 기능][console], [공지 008][n8] |
| 위치 | FusedLocation은 마지막 위치, 위치 업데이트, 영역 진입·이탈 알림을 제공한다. 위치 결과에는 위도·경도·고도·진행 방향·신뢰도·타임스탬프가 포함된다. `isSupported()`와 위치 권한이 필요하며 마지막 위치는 없을 수 있고 새 위치 계산을 보장하지 않는다. [FusedLocation 안내][location] |
| 길 안내 | NaviHelper는 목적지·경유지·경로 변경과 내비게이션 화면 요청을 제공한다. 내비게이션 탑재 차량이 전제이며 이벤트는 Navigation 앱 상태·구현에 좌우된다. 구조기관 접수 기능은 이 SDK의 확인된 제공 범위가 아니다. [NaviHelper 안내][navi], [API 가용성][availability] |
| 블랙박스·카메라 | 확인한 공개 Connect SDK 다섯 모듈의 설명에서 블랙박스 영상 획득·저장·추출 API를 확인하지 못했다. 영상 코덱 지원은 카메라나 블랙박스 원본 접근권을 뜻하지 않는다. 실차 블랙박스 자동 연동을 구현 완료 또는 제공 확정으로 표현할 근거가 없다. [SDK 개요][sdk], [개발 FAQ][runtime], [공지 008][n8] |
| 119·전화·문자 | 확인한 공개 Connect SDK에는 119 자동 신고·접수 확인을 보장하는 API가 없다. 하드웨어 정책은 Telephony와 SMS가 제한될 수 있다고 설명한다. 긴급기관 연계나 전화 발신 성공을 단순 Android Intent·SDK 존재만으로 보장할 수 없다. 실제 연동은 미확인 사항이며 모의 시연과 실제 신고를 구분해야 한다. [SDK 개요][sdk], [하드웨어 정책][hardware], [공지 008][n8] |
| 에뮬레이터 시연 | Virtual Console은 기어·브레이크·조향각·문·좌석·비상등·안전 경고 등의 상태를 조작할 수 있다. 이는 차량 상태 연동 시연 수단이며 실제 충돌 재현이나 신고기관 연결 성공의 증거가 아니다. [Console 기능][console] |

Pleos 앱 카테고리에는 Mobility Services, Maps/Navigation 등이 있지만 카테고리 이름 자체가 주행 중 모든 조작을 허용하지 않는다. 주행 상태와 지역 정책의 제약이 따르며, 사고 지원 앱에 대한 포괄적인 안전 예외는 확인되지 않았다. 이는 공모전 시상 부문인 대학생·일반과 다른 분류다. [앱 카테고리][category], [참가 규정][rules]

## 개인정보와 익명 심사 자료

- 접수용 개인정보와 심사용 작품 소개는 분리한다. 공식 양식은 작품 소개에 대표자·구성원의 성명, 연락처, 이메일, 소속을 기재하지 말라고 명시한다. 공유 링크와 첨부자료에도 개인정보·계정정보·개발자 실명이 노출되지 않도록 요구한다. [접수양식][form]
- **GitHub 익명성은 미해결 해석이다.** 기존 GitHub 저장소 사용과 최종 커밋 제출을 허용하지만, 확인한 공지 006·007·008·FAQ·약관에는 저장소 소유자 계정이나 커밋 작성자 실명에 대한 익명 예외가 없다. 공개 저장소 제출 안내가 양식의 계정정보 비노출 요구를 면제한다고 추정해서는 안 된다. 반대로 커밋 이력 재작성이나 저장소 삭제가 의무라는 규정도 없다. 계정명·커밋 작성자·첨부물 실명이 허용되는 범위는 운영사무국에 확인할 항목이다. [접수양식][form], [제출 안내][submission], [공지 007][n7], [약관][terms]
- 타인의 개인정보 무단 노출은 게시 중단 등의 사유다. API 키 제외 허용과 별개로 실제 사고 당사자의 얼굴·연락처·위치 등 개인정보를 공개 제출물에 무단 포함해서는 안 된다. [약관 제7·9조][terms], [공지 007][n7]
- 공모전 개인정보 처리방침은 운영사의 참가자 정보 처리에 관한 문서이지, 출품 앱의 사고·위치·음성 데이터 수집을 일괄 승인하는 문서는 아니다. Pleos 설계 문서는 위치·음성 수집 이유와 동의 절차, 개인정보 최소 수집·로그 마스킹, 차량·사용자 ID 익명화·가명화를 요구한다. [개인정보 처리방침][privacy], [보안·개인정보 설계][security]

## 현재 repo와 제출 준비의 차이

아래는 `2451dfd` 기준 저장소에서 확인한 상태다. 사용자가 별도로 보관하거나 이미 제출한 서류·영상까지 없다고 단정하지 않는다.

| 제출 항목 | 확인한 상태 | 남은 준비 |
| --- | --- | --- |
| 공식 접수양식·동의서 | Repo에서 작성·서명한 공식 접수양식을 확인하지 못했다. 기존에 참조한 8쪽 UX 설계 PDF는 공식 양식이 아니다 | 공식 여덟 항목 중 필수 기획 내용과 참가 정보·전원 동의·본인 서명을 준비한다. 실명은 운영용 신청서와 동의서에만 기재한다. [접수양식][form] |
| 선택 시연 영상 | 추적된 MP4는 Web sample의 `front-20s.mp4`, `rear-20s.mp4`뿐이다. 합성 차량 영상이지 앱 시연 영상이 아니다. 최신 전체 앱 영상은 [정리 결과](../../evidence/repository-cleanup/README.md)도 미완료로 명시한다 | 기존 Web 화면 녹화도 선택 참고자료로 제출할 수 있다. 전체 제품 재구현이 먼저 필요한 것은 아니다. [제출 안내][submission], [공지 007][n7] |
| 선택 소스·release APK | 소스는 공개돼 있지만 추적된 `.apk`는 없다. 로컬 debug 앱·계측 APK는 제출용 release APK가 아니다. 기존 GitHub 보관 release는 trace TAR이며 앱 APK를 포함하지 않는다 | APK를 선택 제출한다면 실행 가능한 release APK를 준비해 소스와 함께 제공하고, 정확한 경로와 최종 커밋을 안내한다. APK 없이 소스만 제출할 때의 가산점 수준은 공개되지 않았다. [제출 안내][submission] |
| 제출용 README | [루트 README](../../README.md)는 board 편집기 중심이다. [Android README](../../prototype/android/README.md)는 일반 API28·35 AVD와 emulator 도구 버전을 기록한다 | 앱 이름·한 줄 소개·실행 방법·테스트 설정·실제로 사용한 Pleos Connect 에뮬레이터 버전 및 화면 규격·APK 위치를 제출물에 맞게 정리한다. 일반 Android emulator 버전을 Pleos 버전으로 바꾸어 적지 않는다. [제출 안내][submission] |
| 기술 활용·개발 계획 | [Android 의존성](../../prototype/android/app/build.gradle.kts)은 Compose·AndroidX이며 Pleos SDK dependency가 없다. Native는 SC05 11-state PoC이고 전체 여정은 Web prototype이다 | 구현 완료 범위와 앞으로 공개 SDK로 구현할 계획을 분리한다. Pleos SDK 연동·충돌 자동 감지·블랙박스 접근·기관 접수를 완료 실적으로 쓰지 않는다. [공지 008][n8] |

현재 근거에 맞는 소개는 'Web 전체 여정 시연 prototype과 Kotlin·Compose SC05 Android PoC'다. 'Pleos Connect 전체 앱 완성'이나 '실제 사고 감지·119 자동 신고·보험 접수 연동'은 확인된 실적이 아니다.

### 남은 하루의 권장 순서

1. 공식 접수양식의 기획 배경, 차량 특화 가치, 주요 사용 시나리오, SDK 개발 계획, 사업성을 먼저 작성한다. 예상 MAU·재이용률은 관측 성과로 꾸미지 않고 추정 근거와 가정을 구분한다.
2. 해당 시나리오를 설명하는 화면·짧은 Web 시연을 선택 참고자료로 묶는다. 일반 시연 영상의 권장 길이는 작업상 선택이며 공식 제한으로 쓰지 않는다.
3. 가산점용 소스·APK 제출을 선택하면 release APK·README·실행 환경·최종 커밋을 함께 고정한다. APK 준비가 필수 신청서 제출을 늦추지 않게 한다.
4. 참가 정보와 팀원 본인 서명을 확인하고 제출 파일·링크의 접근성·실명 노출을 점검한다. 서명이나 창작물의 권리는 repo 정보만으로 대신 확정하지 않는다.

이는 공식 필수요건이 아니라, 확인된 마감과 현재 산출물을 기준으로 정한 작업 우선순위다. 전체 화면 재설계, 완전한 Android 이식과 실차·기관 연동은 1차 접수 필수사항에서 도출되지 않는다.

## 문서 간 차이와 공개되지 않은 사항

- 제출 안내 일부에는 저장소 주소·APK 경로를 '제출 페이지에 입력'한다고 남아 있다. 같은 페이지의 접수 절차와 공지 007은 이메일 제출을 명시한다. 실제 접수 채널은 이메일로 확인되며 별도 입력 페이지가 필수라는 근거는 없다. [제출 안내][submission], [공지 007][n7]
- FAQ·제출 안내는 대표자가 보내도록 설명하지만 공지 007은 팀원 발신도 명시적으로 허용한다. DOCX 다운로드 표기만 보고 PDF를 금지하거나 대표자 발신만 유효하다고 판단하면 안 된다. [FAQ][faq], [공지 007][n7]
- 공지 006은 PT에서 '에뮬레이터 구동 화면 또는 기기 시연'이라고 쓰지만 공지 008은 Pleos Connect 에뮬레이터 구동 앱을 명시한다. 실차는 필요하지 않다는 점은 일치한다. 다른 기기만으로 에뮬레이터 시연을 대체할 수 있는지는 공개 문구만으로 확정하지 않는다. [공지 006][n6], [공지 008][n8]
- Pleos 시작 가이드 예시는 Vehicle SDK 2.3.1, SDK 연동 가이드는 2.3.2를 적고 있다. Vehicle 소개의 Service 기준은 2.3.21, Sample App은 2.3.22다. Sample App의 `minSdk` 23은 제품 앱의 API 28 이상 요건과 별도라고 설명한다. 이 예시 버전들을 공모전의 단일 고정 의무 버전으로 합치지 않는다. [시작 가이드][getting-started], [SDK 연동][vehicle-setup], [Vehicle 개요][vehicle], [Sample App][sample]
- 기획서의 고정 페이지 수, 일반 시연 영상의 고정 길이, 공모전 자체 APK 용량 상한, 가산점 수치, 특정 UI 재설계, SC05 같은 프로젝트 내부 시나리오 의무는 확인한 공모전 규정에 없다. 문서가 요구하는 실행 가능한 release APK는 APK를 선택 제출하는 경우의 요건이며, 1차 전체 참가자의 앱 완성 의무로 확대할 수 없다. [접수양식][form], [공지 007][n7], [제출 안내][submission], [심사 안내][judging]

[form]: https://appdevchallenge.auto-hmg.io/downloads/contest-application-consent.docx
[rules]: https://appdevchallenge.auto-hmg.io/guide/rules
[submission]: https://appdevchallenge.auto-hmg.io/guide/submission
[faq]: https://appdevchallenge.auto-hmg.io/faq
[schedule]: https://appdevchallenge.auto-hmg.io/guide/schedule
[judging]: https://appdevchallenge.auto-hmg.io/guide/judging-awards
[development]: https://appdevchallenge.auto-hmg.io/guide/development
[n6]: https://appdevchallenge.auto-hmg.io/notice/c0a1a000-2026-4923-8000-000000000006
[n7]: https://appdevchallenge.auto-hmg.io/notice/c0a1a000-2026-4923-8000-000000000007
[n8]: https://appdevchallenge.auto-hmg.io/notice/c0a1a000-2026-4923-8000-000000000008
[terms]: https://appdevchallenge.auto-hmg.io/terms
[privacy]: https://appdevchallenge.auto-hmg.io/privacy
[setup]: https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator
[sdk]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/
[vehicle]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/intro
[permission]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/vehicle-permission
[capability]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/check-capability
[availability]: https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/api-compatibility-availability
[hardware]: https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/platform-api-architecture
[runtime]: https://document.pleos.ai/en/docs/pleos-only/vehicle-app-developer-guide/app-runtime-environment-resources-guide/app-retrieve-codec-info
[location]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/FusedLocation/intro
[navi]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/NaviHelper/intro
[stt]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/SpeechToText/intro
[console]: https://document.pleos.ai/docs/pleos-only/app-test-guide/virtual-console-guide
[category]: https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/app-category
[security]: https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/security-privacy
[getting-started]: https://document.pleos.ai/docs/pleos-only/getting-started
[vehicle-setup]: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/project-setup
[sample]: https://document.pleos.ai/docs/pleos-only/tutorial/vehicle-sdk
