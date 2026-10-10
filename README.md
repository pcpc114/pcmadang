# 성인PC마당

성인PC 업주를 위한 점포 양도·양수, PC·집기 중고장터 및 커뮤니티 로컬 시안.
매물과 회원 게시글은 예시이며, 관심 목록·초안·댓글은 브라우저에만 저장됩니다.

## 실행

Node.js 22 이상에서 `npm start`를 실행하면 사용 가능한 포트가 선택됩니다.
서버가 해당 localhost 주소로 페이지를 빌드하며, 주소를 터미널에 출력합니다.
기존 주소로 실행하려면 `node serve.mjs 54633`을 사용합니다.

`npm run build`는 기본 주소 `http://localhost:54633`으로 정적 파일을 생성하고 SEO 정적 검사를 자동 실행합니다. 검사에 실패하면 빌드가 실패합니다.
`npm run seo:check`는 현재 빌드의 경로·파일 목록과 내부 링크, 고유 제목·설명, H1, 구조화 데이터 및 색인 설정을 확인합니다.
`node check-boards.mjs`는 요청한 8개 상위 메뉴·17개 하위 게시판, 게시글 분류, 작성 버튼 문맥과 현재 빌드의 검색 정책을 확인합니다.

## 상세 필터와 공통 푸터

홈, PC방 팝니다, 업종별 판매 게시판과 중고장터 판매 목록에서 상세 필터를 사용합니다. 지역 17개를 복수 선택하고 권리금·보증금·월세의 최소·최대 금액(만원)을 함께 적용합니다. 같은 항목의 구간 버튼을 다시 누르면 범위가 해제되며, 선택 조건별 해제·전체 초기화·결과 수·조건 링크 복사와 뒤로 가기 복원을 지원합니다. 중고장터에는 점포용 금액 조건을 적용하지 않습니다.

필터 설정은 `madang.filters.store.v1` / `madang.filters.equipment.v1` 키로 **현재 브라우저**에 저장합니다. URL에 명시된 조건은 저장된 조건보다 우선합니다. 계정 저장·기기 간 동기화는 아직 구현하지 않았습니다. 저장소를 사용할 수 없으면 화면에 안내하고 현재 탭에서 필터를 적용합니다.

금액 비교는 표시 문자열이 아닌 `costsManwon.premium`, `.deposit`, `.rent`의 숫자(만원)로 수행합니다. 미입력은 `null`이며 0원과 구분합니다. 매물의 `priceManwon`은 카드에 표시한 판매 가격·권리금의 숫자값입니다. 금액 조건이 있는 경우 해당 값이 없는 매물은 결과에 포함하지 않습니다. 등록 초안의 세 비용 입력도 숫자와 단위를 구분해 저장합니다. 실제 서버에 게시되는 기능은 별도입니다.

`filter-core.js`가 검색·범위·정렬·URL 규칙, `filters.js`가 브라우저 동작, `filter-ui.mjs`와 `filters.css`가 화면을 담당합니다. `app.js`는 ES module이며, 빌드 시 세 JS 파일을 함께 복사해야 합니다.

`footer.mjs`와 `footer.css`의 공통 푸터를 전체 페이지에 적용합니다. 실제 존재하는 거래·커뮤니티·이용 안내·고객센터 페이지로 연결하며, 확인되지 않은 운영자 정보나 없는 약관 링크를 만들지 않습니다.

## 메뉴 구성

`navigation.mjs`를 메뉴·주소·페이지 메타데이터의 공통 원본으로 사용합니다.

| 상위 메뉴 | 하위 게시판 |
| --- | --- |
| PC방 팝니다 | 성인PC방 · 일반PC방 · 기타업종 |
| PC방 삽니다 | 성인PC방 · 일반PC방 · 기타업종 |
| 중고장터 | 판매 · 구매 |
| 구인구직 | 구인정보 · 구직정보 |
| 커뮤니티 | 자유게시판 · 사진 · 유머 · 매장 노하우&질문 |
| 공지사항 | 공지사항 · 최신 뉴스 · 심의게임 소식 |
| 무료슬롯 | 게임 666개 목록·검색·분류·즐겨찾기·게임별 데모 연결 상태 |
| 고객센터 | 이용 도움말·자주 묻는 질문 |

기존 점포 예시 3개는 성인PC방 분류, 장비 예시 5개는 중고장터 판매, 기존 게시글은 자유게시판 1개·노하우&질문 3개로 구분했습니다. 그 밖의 게시판은 빈 상태입니다. 새 글은 게시판에 공개되지 않고 내 브라우저 초안에 분류와 함께 저장됩니다. 사진 첨부·실제 문의 접수는 연결하지 않았습니다.

### 무료슬롯

`/games/`는 참고 사이트의 전체 666개 게임 목록입니다. 24개씩 28개 목록 페이지(`/games/page/2/` 등)로 나누며 마지막 페이지는 18개입니다. 한글·영문 검색, 실제 원본의 인기·슬롯·메가웨이즈·클래식 분류와 브라우저 즐겨찾기를 지원합니다. 검색은 최초 사용 시 전체 `slot-index.json`을 읽어 모든 게임에서 찾습니다. 모든 목록·상세 링크는 정적 HTML에 포함하며 각 `/games/<slug>/`에 고유 메타데이터·탐색 경로·사이트맵 항목을 생성합니다. 검색 조건 URL의 canonical은 기본 목록 주소, 각 정적 목록 페이지의 canonical은 해당 페이지 주소입니다.

최초 24개 실행 주소는 사용자가 연 참고 화면의 실제 iframe에서 확인했습니다. 전체 목록은 화면에서 확인한 공개 `/api/slots`와 게임별 상세 API를 통해 수집합니다. 목록 API가 최대 48개씩 반환하므로 14개 응답을 모아 666개 고유 slug를 확인합니다. 현재 API 실행 주소 330개와 제작사 공식 게임 페이지의 iframe에서 복구한 주소 336개로 전체 666개를 연결합니다. 공식 기록에는 기존 API와 중복되는 확인용 게임 1개도 포함됩니다. 원본과 공식 출처 모두에서 실행 주소를 확인할 수 없으면 임의 주소를 만들지 않고 상태를 표시합니다.

`slot-data.json`의 `demoUrl`을 클릭 시에만 iframe으로 불러옵니다. 허용된 무료 데모 호스트·경로만 실행하고 임베드가 표시되지 않으면 새 창으로 여는 링크와 다시 불러오기를 제공합니다. Big Bass Crash·Spaceman·High Flyer는 공식 HTML에서 확인한 정확한 URL만 별도로 허용합니다. 서버 상태와 제공사의 임베드 정책에 따라 동작은 달라질 수 있으며, 전체 게임을 브라우저에서 재생 시험한 상태는 아닙니다. 새 게임은 같은 데이터 형식으로 추가하며 빌드 시 주소·메타데이터·링크를 함께 검사합니다.

출처: [참고 목록](https://xn--hy1b122ayhbp54a.com/slot), [Pragmatic Play 공식 5 Lions Dance](https://www.pragmaticplay.com/en/games/5-lions-dance/). 이미지 출처는 `assets/slots/SOURCES.md`에 있습니다. 이 작업은 로컬 연동이며 공급사 계약이나 상용 이용 허가를 획득한 것은 아닙니다. [공식 이용약관](https://www.pragmaticplay.com/en/terms-of-use/)의 사용 조건은 공개 운영 전 별도 확인 대상입니다.

기존 매입 조건/구인 글 작성 안내는 `/buy-guide/`, `/jobs-guide/`에 유지합니다. `/buy/`와 `/jobs/`는 이제 게시판 분류 페이지입니다.

## SEO 설정

### pcmadang.com 배포 준비

대표 운영 주소는 `https://pcmadang.com`입니다. 사용자는 도메인을 오렌지에서 구매했으며 GitHub에 코드를 보관하고, 우선 검색 노출용 정적 사이트를 배포하는 단계입니다. 비회원 글쓰기 서버는 별도 후속 작업이며 지금 배포 설정이 게시글 저장 기능을 제공하지는 않습니다. 기존 `.openai/hosting.json`은 이전 Sites 연결 이력으로 보존하며 이번 GitHub/Cloudflare 배포 설정과 구분합니다.

- `npm run build:production`: `dist-production`에 운영 파일 생성, `artifacts/seo-production`에 별도 검증 manifest 생성. localhost의 `dist`는 바꾸지 않습니다.
- `npm run seo:check:production`: 운영 파일의 정적 SEO 검사. 실제 Lighthouse 점수를 뜻하지 않습니다.
- `npm run seo:verify:production`: 운영 빌드의 실제 Lighthouse 증거 확인. 증거가 없으면 PENDING으로 실패합니다.
- `npm run seo:release:production`: 운영 재빌드 후 Lighthouse 증거까지 확인합니다.
- `npm run deploy`: 운영 빌드와 Lighthouse 증거 검사가 모두 통과한 경우에만 Wrangler 배포를 실행합니다. 직접 Wrangler를 호출해 필수 검사를 생략하지 않습니다.

Cloudflare Workers 설정은 `wrangler.jsonc`입니다. 정적 파일 폴더는 `dist-production`, Worker 이름은 `pcmadang`입니다. `workers.dev`와 버전별 미리보기 URL은 비활성화했습니다. 2026-10-10 계정과 Cloudflare 도메인 활성화를 확인하여 계정 ID 및 `pcmadang.com` Custom Domain을 배포 설정에 명시했습니다. 이 설정 파일만으로 Worker나 DNS가 변경되지는 않습니다. 실제 배포 시 기존 루트 DNS를 Worker로 연결하므로, 기존 홈페이지·메일 사용 여부를 확인해야 합니다. `www` 리디렉션은 아직 설정하지 않았습니다. 파일이 없는 경로는 404로 응답하며 정적 페이지는 끝 슬래시 주소를 사용합니다. Cloudflare Git 연동 시 저장소의 이 파일과 package.json이 있는 폴더를 루트로 선택합니다. 빌드 명령은 `npm run build:production`, 배포 명령은 `npm run deploy`입니다. 원본 Lighthouse 보고서와 evidence.json을 검증 환경에 공급하기 전에는 배포 명령이 통과하지 않습니다.

GitHub Actions는 빌드·테스트·정적 SEO 검사를 수행합니다. 이 워크플로의 성공은 공개 배포나 Lighthouse 100점 완료를 의미하지 않습니다. Cloudflare 계정 연결, pcmadang.com의 DNS/인증서 설정, Search Console 소유 확인은 별도의 실제 계정 단계입니다. 서버에서 반환한 DNS 값과 검색엔진 소유 확인 토큰을 사용하며 임의로 만들지 않습니다.

공개 시에는 실제 예시 콘텐츠를 계속 구분하며, 슬롯 이미지·데모의 공개 사용 조건도 확인해야 합니다. 이번 설정 파일 추가만으로 사이트가 인터넷에 새로 공개되지는 않습니다.

- `SITE_ORIGIN`: 경로 없는 실제 서비스 주소. canonical, OG URL, JSON-LD, sitemap에 함께 적용됩니다.
- localhost·127.0.0.1·[::1] 빌드는 예시 매물 상세·회원 글·미리보기 게시판까지 **로컬 템플릿 진단**을 기본 허용합니다. 예시 표시와 데이터는 유지하며 실제 공개 매물로 바꾸지 않습니다. 외부 검색엔진은 localhost에 접근할 수 없습니다.
- `SITE_AUDIT_PREVIEWS=false`: 로컬에서도 예시 상세·글·미리보기·빈 게시판을 `noindex, follow`로 두고 사이트맵에서 제외합니다. 공개 도메인과 동일한 예시 제외 정책을 점검할 때 사용합니다. 외부 도메인에서 이 값을 `true`로 설정하면 빌드가 실패합니다.
- 개인 관심 목록과 명시적으로 검색 제외한 초안·비공개·보관 콘텐츠는 로컬 진단 모드에서도 `noindex, follow`를 유지합니다. `SITE_INDEXABLE=false`이면 모든 페이지를 비색인 상태로 만듭니다.
- 공개 도메인 빌드는 기본적으로 검색 차단 상태입니다. 실제 서비스 공개 준비 후 `SITE_INDEXABLE=true`를 명시해야 색인이 허용됩니다. 비공개 호스팅 접근 제한은 별도로 유지됩니다.
- 공개 도메인에서는 `SITE_INDEXABLE=true`여도 예시 상세·글·미리보기·빈 게시판을 계속 제외합니다. 매물 데이터는 `publication`에 `sample`(예시), `published`(실제 공개), `draft`(초안), `archived`(보관)를 명시합니다. `listing-seo.mjs`는 상태와 지역·업종·기재된 조건을 바탕으로 제목·설명·4단계 탐색 경로를 생성합니다. 상태가 없는 매물은 빌드에서 실패합니다.
- 키워드는 `keyword-plan.md`의 의도별 구조에 맞춰 제목·설명·본문·내부 링크에 배치합니다. 검색어 표기 차이는 내부 검색에서도 처리합니다.
- 구조화 데이터는 WebSite, WebPage, BreadcrumbList만 사용합니다. 예시 매물에 실제 판매 제안·평점·리뷰 데이터를 만들지 않습니다.

로컬 진단 점수는 실제 검색 노출이나 순위를 보장하지 않습니다. 공개 전 실제 도메인, 실제 데이터, 회원·게시판 저장 기능을 연결하고 해당 도메인을 네이버 서치어드바이저와 Google Search Console에서 확인해야 합니다.

## 새 페이지와 SEO 검증 절차

사용자 기준은 **검색 허용 페이지 전체의 Lighthouse SEO 100/100**입니다. 최대 점수는 100점입니다. 정적 검사는 실제 브라우저의 Lighthouse 측정을 대신하지 않습니다. 로컬의 예시 템플릿 진단과 실제 공개 페이지의 검증을 구분합니다. 개인 목록·비공개 데이터의 검색 차단은 유지합니다.

1. 공통 레이아웃과 `build.mjs`의 페이지 생성 경로로 페이지를 추가합니다. 새 페이지 유형에는 `seo: {visibility: 'public'}` 또는 `seo: {visibility: 'exclude', reason: '검색에서 제외할 구체적인 이유'}`를 설정합니다. 기존 유형의 정책은 `seo-policy.mjs`를 확인합니다.
2. `npm run build`를 실행합니다. 빌드가 모든 출력 경로·진단 모드와 배포 파일 해시를 `artifacts/seo/build-manifest.json`에 기록하고, 실제 HTML 목록·메타데이터·내부 링크·구조화 데이터·검색 정책·사이트맵을 검사합니다. 신규 페이지도 이 검사에 포함되며 미등록 경로는 실패합니다.
3. `npm run seo:check`로 현재 산출물을 다시 확인합니다. `npm test`로 검증기의 회귀 테스트를 실행합니다. 게시판 분류를 바꿨다면 `node check-boards.mjs`도 실행합니다.
4. 실제로 제공되는 현재 빌드의 검색 허용 경로 전부를 Lighthouse로 측정합니다. 홈 등 대표 페이지만 측정해서 전체를 통과한 것으로 간주하지 않습니다. 현재 빌드 fingerprint와 보고서 해시가 연결된 증거 묶음을 준비합니다.
5. `npm run seo:release`를 실행합니다. 빌드·정적 검사 후 저장된 Lighthouse 증거를 검증합니다. 이 명령 자체는 브라우저를 열거나 Lighthouse를 새로 측정하지 않습니다. 보고서가 없거나 오래된 빌드의 결과, 누락된 경로, 100점 미만 결과는 통과하지 않습니다.

Lighthouse 증거의 기본 위치는 `artifacts/seo/lighthouse/evidence.json`이며, 보고서 파일은 같은 디렉터리를 기준으로 참조합니다.

```json
{
  "schemaVersion": 1,
  "buildFingerprint": "현재 빌드 manifest의 fingerprint",
  "capturedAt": "보고서 묶음을 만든 ISO 8601 시각",
  "reports": [
    {
      "pathname": "/",
      "file": "home.report.json",
      "sha256": "실제 보고서 파일의 SHA-256"
    }
  ]
}
```

위 JSON은 형식 설명이며 유효한 측정 증거가 아닙니다. 실제 증거에는 검색 허용 경로 전체의 원본 Lighthouse JSON이 필요합니다. 측정한 파일·주소와 빌드가 일치하는지 수집 단계에서 확인해야 합니다. fingerprint와 보고서 해시만으로 브라우저가 어떤 HTML을 제공받았는지 독립적으로 증명할 수는 없습니다. 원본 보고서나 증거 값을 손으로 변경해 점검을 통과시키지 않습니다.

출력 파일·주소·검색 정책·진단 모드가 동일한 재빌드는 fingerprint와 기준 빌드 시각을 유지하므로 유효한 증거를 재사용할 수 있습니다. 파일이나 경로가 바뀌면 fingerprint도 달라지며 해당 빌드를 다시 측정해야 합니다. localhost 템플릿 진단 보고서는 공개 도메인의 검증 증거로 사용할 수 없습니다.

검증 근거가 없다면 상태는 **미측정**입니다. 이번 변경의 규칙과 이후 작업 기준은 `AGENTS.md`에도 보관합니다.

## 브랜드

`brand.mjs`가 원본입니다. `assets/brand-logo.svg`와 `assets/brand-symbol.svg`는 벡터 에셋입니다.
`assets/brand-logo.png`는 투명 배경 로고이며, `assets/brand-social.png`는 1200×630 공유 이미지입니다.
브랜드는 열린 ㅁ 형태의 마당과 작은 문턱을 표현한 심볼, 따뜻한 흰색·먹색·벽돌색을 사용합니다.
`layout.mjs`가 공통 정적 HTML 구조, `boards.mjs`가 게시판 화면을 담당합니다. `market.css`는 공통 스타일, `boards.css`는 메뉴·게시판·고객센터 스타일입니다. 외부 폰트나 큰 장식 이미지를 불러오지 않습니다.
이전 시안의 `styles.css`, `courtyard.css`, `courtyard-art.mjs`는 현재 페이지에서 사용하지 않습니다.

## 현재 검증 범위

사용자가 제공한 화면에서 `/listing/store-001/`의 수정 전 Lighthouse SEO는 **66점**입니다. 해당 예시 상세의 `noindex`를 코드에서 확인하고 로컬 템플릿 진단 정책을 적용했습니다. 지역·업종을 담은 상세 메타데이터와 실제 분류에 맞는 탐색 경로도 반영했습니다. 변경 후 점수는 아직 미측정이며, 실제 검사 결과는 `VERIFICATION.md` 맨 위에 기록합니다. 브라우저 보안 정책으로 로컬 페이지 열기가 차단되어 새 Lighthouse 측정을 완료하지 못했습니다. 이전 홈·목록의 100점 기록이나 정적 검사 통과를 현재 전체 페이지의 100점으로 간주하지 않습니다.

수집·조립: `node import-slot-catalogue.mjs` → `node import-slot-images.mjs` → `node restore-slot-demos.mjs` → `node assemble-slot-data.mjs` → `npm run build`. 참고 API에 빠진 데모 주소는 제작사의 공식 사이트맵에 있는 정확한 게임 페이지의 iframe에서 복구하고 `artifacts/slots/official-demos.json`에 원문 주소와 출처를 기록합니다. 수집 결과와 출처는 `artifacts/slots/`, 실행·이미지 정보는 `slot-data.json`에 기록합니다. 수집 스크립트는 외부 공개 데이터 접근이 필요하며 기존 상세·이미지 캐시를 재사용합니다.

새 목록을 다시 확인할 때는 `node import-slot-catalogue.mjs --refresh`를 사용합니다. 기본 실행은 중단된 수집을 이어가기 위해 캐시를 재사용합니다.
