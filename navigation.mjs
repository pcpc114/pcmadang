/** Shared navigation and page metadata for the marketplace categories. */
export const navGroups = [
  {
    key: 'store',
    label: 'PC방 팝니다',
    href: '/stores/',
    description: '성인PC방, 일반PC방, 기타업종의 점포 양도·양수 매물을 업종별로 살펴보세요.',
    children: [
      {
        key: 'adult', label: '성인PC방', href: '/stores/adult/',
        title: '성인PC방 팝니다 · 점포 매매',
        description: '성인PC방 매매를 위한 게시판입니다. 지역, 면적, 보증금, 월세와 양도 조건을 확인하세요.',
        kind: 'store-sell',
      },
      {
        key: 'general', label: '일반PC방', href: '/stores/general/',
        title: '일반PC방 팝니다 · 점포 매매',
        description: '일반PC방 매매를 위한 게시판입니다. PC 대수와 사양, 매장 시설, 임대 조건을 살펴보세요.',
        kind: 'store-sell',
      },
      {
        key: 'other', label: '기타업종', href: '/stores/other/',
        title: '기타업종 팝니다 · 점포 양도',
        description: '기타업종 점포 양도를 위한 게시판입니다. 업종과 지역, 시설 및 양도 범위를 확인하세요.',
        kind: 'store-sell',
      },
    ],
  },
  {
    key: 'buy',
    label: 'PC방 삽니다',
    href: '/buy/',
    description: '성인PC방, 일반PC방, 기타업종의 점포 매입 희망 조건을 업종별로 나누는 공간입니다.',
    children: [
      {
        key: 'adult', label: '성인PC방', href: '/buy/adult/',
        title: '성인PC방 삽니다 · 매입 희망',
        description: '성인PC방 매입 희망 게시판입니다. 찾는 지역, 예산, 매장 규모와 인수 희망 시기를 정리해 보세요.',
        kind: 'store-buy',
      },
      {
        key: 'general', label: '일반PC방', href: '/buy/general/',
        title: '일반PC방 삽니다 · 매입 희망',
        description: '일반PC방 매입 희망 게시판입니다. 희망 지역, 예산, PC 대수와 필요한 시설 조건을 나눠 보세요.',
        kind: 'store-buy',
      },
      {
        key: 'other', label: '기타업종', href: '/buy/other/',
        title: '기타업종 삽니다 · 점포 매입 희망',
        description: '기타업종 점포 매입 희망 게시판입니다. 관심 업종, 희망 지역과 인수 조건을 정리해 보세요.',
        kind: 'store-buy',
      },
    ],
  },
  {
    key: 'equipment',
    label: '중고장터',
    href: '/equipment/',
    description: 'PC 본체, 모니터, 책상과 의자 등 PC방 중고 장비·집기의 판매 및 구매 게시판입니다.',
    children: [
      {
        key: 'sell', label: '판매', href: '/equipment/sell/',
        title: '중고장터 판매 · PC·모니터·집기',
        description: 'PC방 중고 장비와 집기 판매 게시판입니다. 제품 사양, 수량, 상태, 가격과 거래 지역을 확인하세요.',
        kind: 'equipment-sell',
      },
      {
        key: 'buy', label: '구매', href: '/equipment/buy/',
        title: '중고장터 구매 · PC·모니터·집기',
        description: 'PC방 중고 장비와 집기 구매 게시판입니다. 필요한 품목과 사양, 수량, 예산을 정리해 보세요.',
        kind: 'equipment-buy',
      },
    ],
  },
  {
    key: 'jobs',
    label: '구인구직',
    href: '/jobs/',
    description: 'PC방 구인정보와 구직정보를 나누는 공간입니다. 근무 지역과 시간, 업무 및 희망 조건을 확인하세요.',
    children: [
      {
        key: 'recruit', label: '구인정보', href: '/jobs/recruit/',
        title: 'PC방 구인정보 · 직원·아르바이트 모집',
        description: 'PC방 직원과 아르바이트 구인 게시판입니다. 담당 업무, 근무 시간, 급여와 지원 방법을 확인하세요.',
        kind: 'recruit',
      },
      {
        key: 'seeking', label: '구직정보', href: '/jobs/seeking/',
        title: 'PC방 구직정보 · 일자리 구합니다',
        description: 'PC방 일자리를 찾는 구직 게시판입니다. 희망 지역과 근무 시간, 관련 경력 및 희망 업무를 나눠 보세요.',
        kind: 'seeking',
      },
    ],
  },
  {
    key: 'community',
    label: '커뮤니티',
    href: '/community/',
    description: 'PC방 업주들이 일상, 사진, 유머와 매장 운영 경험을 나누고 질문하는 커뮤니티입니다.',
    children: [
      {
        key: 'free', label: '자유게시판', href: '/community/free/',
        title: '자유게시판 · PC방 업주 이야기',
        description: 'PC방 업주들의 자유게시판입니다. 매장 일상과 업계에 관한 생각, 함께 나누고 싶은 이야기를 적어 보세요.',
        kind: 'post',
      },
      {
        key: 'photos', label: '사진', href: '/community/photos/',
        title: '사진 게시판 · 매장과 일상',
        description: '매장과 일상의 사진을 나누는 게시판입니다. 직접 촬영한 매장 공간, 장비 배치와 일상 사진을 소개해 보세요.',
        kind: 'post',
      },
      {
        key: 'humor', label: '유머', href: '/community/humor/',
        title: '유머 게시판 · 잠깐 쉬어가는 마당',
        description: '잠깐 쉬어가는 성인PC마당 유머 게시판입니다. 함께 웃을 수 있는 가벼운 이야기와 일화를 나눠 보세요.',
        kind: 'post',
      },
      {
        key: 'tips', label: '매장 노하우&질문', href: '/community/tips/',
        title: '매장 노하우&질문 · PC방 운영 이야기',
        description: 'PC방 매장 운영 노하우와 질문을 나누는 게시판입니다. 장비 관리, 청소, 직원 관리와 운영 경험을 공유해 보세요.',
        kind: 'post',
      },
    ],
  },
  {
    key: 'notices',
    label: '공지사항',
    href: '/notices/',
    description: '성인PC마당의 운영 공지와 업계 최신 뉴스, 심의게임 소식을 확인하는 공간입니다.',
    children: [
      {
        key: 'announcements', label: '공지사항', href: '/notices/announcements/',
        title: '공지사항 · 성인PC마당 운영 안내',
        description: '성인PC마당 운영 공지 게시판입니다. 서비스 변경, 이용 방법과 게시판 운영 안내를 확인하세요.',
        kind: 'notice',
      },
      {
        key: 'news', label: '최신 뉴스', href: '/notices/news/',
        title: '최신 뉴스 · PC방 업계 소식',
        description: 'PC방 업계 소식을 살펴보는 뉴스 게시판입니다. 게시물의 출처와 발표일을 함께 확인하세요.',
        kind: 'notice',
      },
      {
        key: 'game-review', label: '심의게임 소식', href: '/notices/game-review/',
        title: '심의게임 소식 · 등급분류 정보',
        description: '게임 등급분류 관련 소식을 살펴보는 게시판입니다. 개별 게임의 등급분류 정보는 공식 출처와 확인일을 함께 확인하세요.',
        kind: 'notice',
      },
    ],
  },
  {
    key: 'games',
    label: '무료슬롯',
    href: '/games/',
    description: '무료슬롯 게임을 검색하고 클래식·메가웨이즈 분류별로 살펴보세요. 게임별 무료 데모와 즐겨찾기를 이용할 수 있습니다.',
    children: [],
  },
  {
    key: 'support',
    label: '고객센터',
    href: '/support/',
    description: '성인PC마당 이용 방법과 자주 묻는 질문, 게시물 신고 및 문의 안내를 확인하세요.',
    children: [],
  },
];

/** Find the exact category for a pathname; query strings and hashes are ignored. */
export function findNavigation(pathname) {
  const cleanPath = String(pathname || '/').split(/[?#]/, 1)[0];
  const normalized = `/${cleanPath.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
  for (const group of navGroups) {
    if (group.href === normalized) return { group, child: null };
    const child = group.children.find((item) => item.href === normalized);
    if (child) return { group, child };
  }
  return null;
}
