const categoryLabels = {popular: '인기', slot: '슬롯', classic: '클래식', megaways: '메가웨이즈'};

const cataloguePath = page => page === 1 ? '/games/' : `/games/page/${page}/`;

function renderSlotCard(game, index, esc, icon) {
  return `<article class="slot-card" data-slot-card data-slot-slug="${esc(game.slug)}" data-slot-category="${esc(game.category)}" data-slot-search="${esc(`${game.ko} ${game.name}`.toLowerCase())}">
      <a class="slot-card-open" data-slot-open="${esc(game.slug)}" href="/games/${esc(game.slug)}/" aria-label="${esc(game.ko)} 무료슬롯 게임 보기">
        <span class="slot-card-art"><img src="${esc(game.image)}" alt="${esc(game.name)}" width="339" height="180" ${index < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><span class="slot-card-type">${esc(categoryLabels[game.category] || '슬롯')}</span><span class="slot-card-overlay" aria-hidden="true">게임 보기 ${icon('arrow')}</span></span>
        <span class="slot-card-copy"><strong class="slot-card-name">${esc(game.ko)}</strong><span class="slot-card-english" lang="en">${esc(game.name)}</span></span>
      </a>
      <button type="button" class="slot-save" data-slot-save="${esc(game.slug)}" aria-label="${esc(game.ko)} 즐겨찾기" aria-pressed="false">${icon('heart')}</button>
    </article>`;
}

function renderCataloguePagination(page, pages, icon) {
  if (pages <= 1) return '';
  const numbers = [];
  let previous = 0;
  for (let number = 1; number <= pages; number++) {
    if (number !== 1 && number !== pages && Math.abs(number - page) > 1) continue;
    if (number - previous > 1) numbers.push('<span class="slot-page-gap" aria-hidden="true">…</span>');
    numbers.push(`<a href="${cataloguePath(number)}" data-slot-page="${number}" ${number === page ? 'aria-current="page"' : ''} aria-label="게임 목록 ${number}페이지">${number}</a>`);
    previous = number;
  }
  const previousLink = page > 1
    ? `<a class="slot-page-arrow slot-page-previous" href="${cataloguePath(page - 1)}" data-slot-page="prev" rel="prev" aria-label="이전 게임 목록 페이지">${icon('chevron')}</a>`
    : `<span class="slot-page-arrow slot-page-previous is-disabled" aria-hidden="true">${icon('chevron')}</span>`;
  const nextLink = page < pages
    ? `<a class="slot-page-arrow" href="${cataloguePath(page + 1)}" data-slot-page="next" rel="next" aria-label="다음 게임 목록 페이지">${icon('chevron')}</a>`
    : `<span class="slot-page-arrow is-disabled" aria-hidden="true">${icon('chevron')}</span>`;
  return previousLink + numbers.join('') + nextLink;
}

export function renderSlotCatalogue({games, page = 1, pageSize = 24, esc, icon, demoNotice}) {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 24;
  const pages = Math.max(1, Math.ceil(games.length / size));
  const currentPage = Math.min(pages, Number.isSafeInteger(page) && page > 0 ? page : 1);
  const offset = (currentPage - 1) * size;
  const pageGames = games.slice(offset, offset + size);
  const range = `${games.length ? offset + 1 : 0}–${Math.min(offset + size, games.length)} / ${games.length}개`;
  const connected = games.filter(game => game.demoUrl).length;
  const checking = games.filter(game => !game.demoUrl && game.demoStatus === 'checking').length;
  const unavailable = games.length - connected - checking;
  const availability = [`데모 주소 있음 ${connected}개`, ...(unavailable ? [`현재 주소 없음 ${unavailable}개`] : []), ...(checking ? [`연결 정보 확인 중 ${checking}개`] : [])].join(' · ');
  const notice = demoNotice || `${availability}. 게임별 상세 화면에서 연결 상태를 확인하세요. 즐겨찾기는 이 브라우저에 저장됩니다.`;
  const categories = [['all', '전체'], ['popular', '인기'], ['slot', '슬롯'], ['megaways', '메가웨이즈'], ['classic', '클래식'], ['saved', '즐겨찾기']];
  return `<section class="slot-catalogue container" id="slot-catalogue" data-slot-page-size="${size}" data-slot-current-page="${currentPage}" data-slot-total="${games.length}" data-slot-index-url="/slot-index.json">
  <div class="slot-intro">
    <span class="slot-eyebrow"><span class="slot-lobby-mark" aria-hidden="true"><i></i><i></i><i></i></span>성인PC마당 게임 라운지</span>
    <h1>무료슬롯</h1>
    <p class="slot-intro-copy">취향에 맞는 슬롯게임을 한곳에서 찾아보세요.</p>
    <form class="slot-search" id="slot-search-form" action="/games/" method="get" role="search">
      <label for="slot-search" class="sr-only">한글 또는 영문 게임명으로 검색</label>
      ${icon('search')}<input id="slot-search" name="q" type="search" placeholder="어떤 게임을 찾으세요?" maxlength="100" autocomplete="off">
      <button type="submit" aria-label="슬롯게임 검색">${icon('arrow')}</button>
    </form>
  </div>
  <div class="slot-controls">
    <div class="slot-categories" role="group" aria-label="슬롯게임 종류">
      ${categories.map(([key, label]) => `<button type="button" class="slot-category" data-slot-category="${key}" aria-pressed="${key === 'all'}">${key === 'saved' ? icon('heart') : ''}${label}</button>`).join('')}
    </div>
    <p class="slot-catalogue-count">게임 <strong id="slot-result-count">${games.length}</strong>개</p>
  </div>
  <div class="slot-search-feedback"><p id="slot-search-load-status" role="status" aria-live="polite"></p><button type="button" data-slot-load-retry hidden>다시 불러오기</button></div>
  <div class="slot-section-heading"><h2>게임 둘러보기</h2><span id="slot-visible-range">${range}</span></div>
  <div class="slot-grid" id="slot-grid">
    ${pageGames.map((game, index) => renderSlotCard(game, index, esc, icon)).join('')}
  </div>
  ${games[0] ? `<template id="slot-card-template">${renderSlotCard(games[0], 4, esc, icon)}</template>` : ''}
  <div class="slot-empty" id="slot-empty" ${games.length ? 'hidden' : ''}>${icon('search')}<h3>조건에 맞는 게임이 없습니다.</h3><p>다른 게임명으로 검색하거나 분류를 바꿔보세요.</p><button type="button" data-slot-reset>전체 게임 보기</button></div>
  <nav class="slot-pagination" id="slot-pagination" aria-label="슬롯게임 목록 페이지" ${pages <= 1 ? 'hidden' : ''}>${renderCataloguePagination(currentPage, pages, icon)}</nav>
  <p class="sr-only" id="slot-page-summary" role="status" aria-live="polite" aria-atomic="true">게임 ${games.length}개 중 ${games.length ? offset + 1 : 0}번째부터 ${Math.min(offset + size, games.length)}번째, ${currentPage}/${pages}페이지</p>
  <div class="slot-lobby-note"><span class="slot-note-symbol" aria-hidden="true">i</span><p>${esc(notice)}</p></div>
  <noscript><p class="slot-noscript">페이지 번호로 모든 게임을 둘러볼 수 있습니다. 검색, 즐겨찾기와 데모 실행을 사용하려면 브라우저의 JavaScript를 켜주세요.</p></noscript>
</section>`;
}

export function renderSlotDetail({game, games, esc, icon}) {
  const currentIndex = games.findIndex(item => item.slug === game.slug);
  const related = [...games.slice(currentIndex + 1), ...games.slice(0, currentIndex)].slice(0, 4);
  const available = Boolean(game.demoUrl);
  const checking = !available && game.demoStatus === 'checking';
  const startLabel = available ? '무료 데모 시작' : checking ? '연결 정보 확인 중' : '현재 데모 주소 없음';
  const playerStatus = available ? '시작 버튼을 누르면 게임사의 무료 데모를 불러옵니다.'
    : checking ? '이 게임의 데모 연결 정보를 확인하고 있습니다. 현재 화면에서는 실행할 수 없습니다.'
      : '현재 제공되는 데모 실행 주소가 없어 이 게임을 실행할 수 없습니다.';
  const guideText = available
    ? '무료 데모에서 게임 화면과 진행 방식을 살펴보세요. 게임이 표시되지 않으면 새 창에서 열기를 이용할 수 있습니다.'
    : checking ? '게임 목록에 포함되어 있으며 데모 연결 정보를 확인하고 있습니다. 실행 주소가 확인된 다른 게임을 둘러볼 수 있습니다.'
      : '게임 목록에는 포함되어 있지만 현재 제공되는 데모 실행 주소가 없습니다. 실행 주소가 있는 다른 게임을 선택해 주세요.';
  return `<article class="slot-detail container">
  <nav class="slot-breadcrumb" aria-label="현재 위치"><a href="/">마당 홈</a>${icon('chevron')}<a href="/games/">무료슬롯</a>${icon('chevron')}<span aria-current="page">${esc(game.ko)}</span></nav>
  <div class="slot-detail-heading"><div><span class="slot-detail-category">${esc(categoryLabels[game.category] || '슬롯')}${available ? ' · 무료 데모' : ''}</span><h1>${esc(game.ko)}</h1><p lang="en">${esc(game.name)}</p></div><button class="slot-detail-save" type="button" data-slot-save="${esc(game.slug)}" aria-pressed="false" aria-label="${esc(game.ko)} 즐겨찾기">${icon('heart')}<span>즐겨찾기</span></button></div>
  <div class="slot-player-frame">
    <div class="slot-player" id="slot-player">
      <button class="slot-start" id="slot-start" data-slot-start type="button" ${available ? '' : 'disabled'} aria-label="${esc(game.ko)} · ${esc(startLabel)}">
        <img src="${esc(game.image)}" alt="${esc(game.name)}" width="339" height="180" fetchpriority="high" decoding="async">
        <span class="slot-start-content"><span class="slot-start-icon" aria-hidden="true">${available ? '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M8 4v16l13-8z" fill="currentColor"/></svg>' : icon('monitor')}</span><strong>${esc(startLabel)}</strong><span>${esc(game.ko)}</span></span>
      </button>
    </div>
    <div class="slot-player-toolbar"><span class="slot-demo-label ${available ? '' : 'is-unavailable'}"><i aria-hidden="true"></i>${available ? '무료 데모' : esc(startLabel)}</span>${available ? `<div><button type="button" data-slot-retry hidden>다시 불러오기</button><button type="button" data-slot-fullscreen aria-label="${esc(game.ko)} 게임 전체 화면"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>전체 화면</span></button><a id="slot-external" href="${esc(game.demoUrl)}" target="_blank" rel="noopener noreferrer">새 창에서 열기 ${icon('arrow')}</a></div>` : ''}</div>
  </div>
  <p class="slot-player-status" id="slot-player-status" role="status" aria-live="polite">${esc(playerStatus)}</p>
  <div class="slot-detail-guide"><div><h2>${esc(game.ko)} 무료슬롯 안내</h2><p>${esc(game.name)}는 ${esc(categoryLabels[game.category] || '슬롯')} 분류의 게임입니다. ${esc(guideText)}</p></div><a href="/games/">${icon('chevron')}게임 목록으로</a></div>
  <section class="slot-related" aria-labelledby="slot-related-title"><div class="slot-section-heading"><h2 id="slot-related-title">다른 게임도 둘러보세요</h2><a href="/games/">전체 보기 ${icon('arrow')}</a></div><div class="slot-grid">${related.map(item => `<article class="slot-card"><a class="slot-card-open" href="/games/${esc(item.slug)}/"><span class="slot-card-art"><img src="${esc(item.image)}" alt="${esc(item.name)}" width="339" height="180" loading="lazy" decoding="async"><span class="slot-card-type">${esc(categoryLabels[item.category] || '슬롯')}</span><span class="slot-card-overlay" aria-hidden="true">게임 보기 ${icon('arrow')}</span></span><span class="slot-card-copy"><strong class="slot-card-name">${esc(item.ko)}</strong><span class="slot-card-english" lang="en">${esc(item.name)}</span></span></a></article>`).join('')}</div></section>
  ${available ? `<noscript><p class="slot-noscript">무료 데모를 실행하려면 브라우저의 JavaScript를 켜주세요. <a href="${esc(game.demoUrl)}" target="_blank" rel="noopener noreferrer">게임사 데모 새 창에서 열기</a></p></noscript>` : ''}
</article><script type="application/json" id="slot-game-data">${JSON.stringify({game}).replace(/</g, '\\u003c')}</script>`;
}
