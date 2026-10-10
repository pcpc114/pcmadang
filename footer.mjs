const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const footerGroups = [
  {
    title: 'PC방 거래',
    links: [['/stores/', 'PC방 팝니다'], ['/stores/adult/', '성인PC방 매물'], ['/stores/general/', '일반PC방 매물'], ['/stores/other/', '기타업종 매물'], ['/buy/', 'PC방 삽니다']],
  },
  {
    title: '중고장터·일자리',
    links: [['/equipment/sell/', '중고 장비 판매'], ['/equipment/buy/', '중고 장비 구매'], ['/jobs/recruit/', '구인정보'], ['/jobs/seeking/', '구직정보']],
  },
  {
    title: '커뮤니티·소식',
    links: [['/community/free/', '자유게시판'], ['/community/photos/', '사진 게시판'], ['/community/humor/', '유머 게시판'], ['/community/tips/', '매장 노하우 & 질문'], ['/notices/', '공지사항·소식']],
  },
  {
    title: '이용안내',
    links: [['/guide/', '사이트 이용 안내'], ['/store-guide/', '매물 작성 안내'], ['/buy-guide/', '매입 조건 안내'], ['/games/', '무료슬롯·게임 목록'], ['/support/', '고객센터']],
  },
];

export function renderFooter({ logo = '', esc = escapeHtml } = {}) {
  return `<footer class="site-footer" id="site-footer">
    <div class="container site-footer-content">
      <div class="site-footer-brand">
        <a class="brand site-footer-logo" href="/" aria-label="성인PC마당 홈">${logo}<span>성인PC마당</span></a>
        <p class="site-footer-intro">점포와 장비,<br>사장님들의 이야기가 모이는 곳</p>
        <div class="site-footer-tools"><button type="button" data-action="drafts">내 초안 보기</button><a href="/brand-logo.svg" download="성인PC마당-로고.svg">로고 다운로드</a></div>
      </div>
      <div class="site-footer-navigation">
        ${footerGroups.map(group => `<nav class="site-footer-group" aria-label="하단 ${esc(group.title)}"><h2>${esc(group.title)}</h2><ul>${group.links.map(([href, label]) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`).join('')}</ul></nav>`).join('')}
      </div>
    </div>
    <div class="container site-footer-base">
      <p class="site-footer-copyright">© 2026 성인PC마당</p>
      <div class="site-footer-status"><span>미리보기</span><p>매물·게시글은 예시이며, 작성한 내용은 이 브라우저에 저장됩니다.<br>실제 거래와 회원 간 게시 기능은 준비 중입니다.</p></div>
    </div>
  </footer>`;
}
