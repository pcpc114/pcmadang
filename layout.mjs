import {logoMark} from './brand.mjs';
import {structuredData} from './seo.mjs';
import {navGroups, findNavigation} from './navigation.mjs';
import {effectiveSeoPolicy} from './seo-policy.mjs';
import {renderFilters} from './filter-ui.mjs';
import {renderFooter} from './footer.mjs';

export function createLayout({content, icon, esc, origin, indexable, auditPreviewPages = false}) {
  const {listings, posts} = content;
  const route = listing => `/listing/${listing.id}/`;
  const logo = `<span class="brand-symbol" aria-hidden="true">${logoMark}</span>`;
  function navigation(pathname, active) {
    const current=findNavigation(pathname);
    return navGroups.map(group=>{
      const selected=current?.group.key===group.key||(!current&&group.key===active);
      if(!group.children.length)return `<a class="nav-single ${selected?'active':''}" href="${group.href}" ${pathname===group.href?'aria-current="page"':''}>${esc(group.label)}</a>`;
      return `<details class="nav-group ${selected?'active':''}" name="main-navigation"><summary>${esc(group.label)}${icon('chevron')}</summary><div class="nav-popover"><a class="nav-parent" href="${group.href}" ${pathname===group.href?'aria-current="page"':''}>${esc(group.label)} 전체 ${icon('arrow')}</a>${group.children.map(child=>`<a href="${child.href}" ${pathname===child.href?'aria-current="page"':''}>${esc(child.label)}</a>`).join('')}</div></details>`;
    }).join('');
  }

  function shell({title, description, body, pathname='/', active='home', page='home', noindex=false, seo, breadcrumbs}) {
    const fullTitle = pathname === '/' ? '성인PC마당 | PC방 매매·중고장터·업주 커뮤니티' : `${title} | 성인PC마당`;
    const policy = effectiveSeoPolicy({page, noindex, seo}, indexable, {auditPreviewPages});
    const robots = policy.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow';
    return `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${pathname==='/'&&origin==='https://pcmadang.com'?'<meta name="google-site-verification" content="YEFF-IflH4vdnV6Uy3PNL96UAs5i0a8IOIxYt8EmboA" />':''}
<title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}"><meta name="theme-color" content="${page==='games'?'#0d111b':'#faf9f6'}">
<link rel="canonical" href="${origin}${pathname}">
<meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="성인PC마당">
<meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin}${pathname}">
<meta property="og:image" content="${origin}/brand-social.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="성인PC마당 — PC방 매매와 업주 커뮤니티">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/market.css"><link rel="stylesheet" href="/boards.css"><link rel="stylesheet" href="/filters.css"><link rel="stylesheet" href="/footer.css"><script src="/app.js" type="module"></script>
${page==='games'?'<link rel="stylesheet" href="/slots.css"><script src="/slots.js" type="module"></script>':''}
<script type="application/ld+json">${structuredData({origin,pathname,title:fullTitle,description,breadcrumbs})}</script>
</head><body data-page="${page}">
<a class="skip-link" href="#main">본문 바로가기</a>
<div class="preview-strip"><div class="container"><span class="preview-chip">미리보기</span>매물·게시글은 예시이며, 작성 내용은 내 브라우저에만 저장됩니다.</div></div>
<header><div class="container header-main"><a class="brand" href="/" aria-label="성인PC마당 홈">${logo}<span>성인PC<span class="brand-accent">마당</span></span></a><span class="brand-caption">점포·장비 거래와<br>사장님들의 이야기</span><div class="header-actions"><a class="saved-link" aria-label="관심 매물" href="/saved/">${icon('heart')}<span>관심 매물</span><span class="saved-count">0</span></a><button class="draft-link" aria-label="내 초안" data-action="drafts">${icon('file')}<span>내 초안</span></button><button class="btn btn-primary" data-action="write">${icon('plus')}<span>매물 등록</span></button></div></div>
<div class="nav-line"><nav class="container main-nav category-navigation" aria-label="주 메뉴">${navigation(pathname,active)}</nav></div></header>
<main id="main">${body}</main>
${renderFooter({logo,esc})}
<dialog id="main-dialog" aria-labelledby="dialog-title"><div class="dialog-header"><h2 id="dialog-title"></h2><button class="icon-button" data-action="close-dialog" aria-label="닫기">${icon('close')}</button></div><div id="dialog-content"></div></dialog><div id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="site-data">${JSON.stringify(content).replace(/</g,'\\u003c')}</script></body></html>`;
  }

  function card(l) {
    const store = l.type === 'store';
    const category = store ? 'PC방팝니다' : l.category;
    const searchTerms = [l.title,l.region,l.city,l.category,l.description,l.spec,store?'성인pc 성인pc방 pc방매매 pc방팝니다 매장 양도 성인pc매물':'중고 장비 집기'].filter(Boolean).join(' ').toLowerCase();
    return `<article class="listing-card" data-listing="${esc(l.id)}" data-type="${l.type}" data-region="${esc(l.region)}" data-search="${esc(searchTerms)}">
<div class="listing-type ${store?'type-store':'type-equipment'}" aria-hidden="true">${icon(store?'shop':'monitor')}<span>${store?'점포':l.category==='PC 본체'?'PC':'집기'}</span></div>
<div class="card-body"><div class="card-meta"><span class="category-label">${esc(category)}</span><span class="listing-location">${esc(l.region)} ${esc(l.city)}</span><span class="sample-tag-inline">예시</span></div><h3><a href="${route(l)}">${esc(l.title)}</a></h3><p class="card-spec">${esc(store?`${l.area} · 보증금 ${l.deposit} · 월세 ${l.rent}`:`${l.quantity} · ${l.spec || l.condition}`)}</p></div>
<div class="card-price"><small>${esc(l.priceNote)}</small><strong>${esc(l.price)}</strong></div>
<button class="save-button" data-save="${esc(l.id)}" aria-label="${esc(l.title)} 관심 매물에 저장" aria-pressed="false">${icon('heart')}</button></article>`;
  }
  function postRow(p) {
    return `<a class="post-row" href="/community/${esc(p.id)}/"><span class="post-category">${esc(p.category)}</span><span class="post-title">${esc(p.title)}<span class="example-text">예시</span></span>${icon('chevron')}</a>`;
  }
  function searchBox(compact=false, mode='all') {
    return `<form class="search-form ${compact?'compact':''}" id="search-form" role="search"><label class="search-type"><span class="sr-only">찾을 매물 종류</span><select id="search-type">${[['all','전체 매물'],['store','매장 매물'],['equipment','PC·집기']].map(([value,label])=>`<option value="${value}" ${value===mode?'selected':''}>${label}</option>`).join('')}</select></label><div class="search-input-wrap">${icon('search')}<input id="search-input" name="q" type="search" placeholder="지역, 매물명, PC 사양으로 검색" aria-label="지역, 매물 또는 장비 검색" maxlength="100"></div><button class="btn btn-primary" type="submit">검색 ${icon('arrow')}</button></form>`;
  }
  function marketplace(mode='all',contained=true,sourceListings=listings,{showTabs=true}={}) {
    const selected = sourceListings.filter(l=>mode==='all'||l.type===mode);
    const labels=[['all','전체 매물','/'],['store','PC방팝니다','/stores/'],['equipment','PC·집기','/equipment/']];
    return `<section class="market-section ${contained?'container':''}" id="market"><div class="section-heading"><div><h2>${mode==='store'?'PC방매매 · 팝니다':mode==='equipment'?'PC·집기 중고장터':'매물 둘러보기'}</h2></div><a class="more-link" href="/store-guide/">매물 작성 안내 ${icon('arrow')}</a></div>
${showTabs?`<div class="filter-row"><div class="tabs" role="group" aria-label="매물 종류">${labels.map(([key,label,href])=>mode==='all'?`<button type="button" data-filter="${key}" class="${key===mode?'selected':''}" aria-pressed="${key===mode}">${label}</button>`:`<a href="${href}${key==='all'?'#market':''}" class="${key===mode?'selected':''}" ${key===mode?'aria-current="page"':''}>${label}</a>`).join('')}</div></div>`:''}
${renderFilters({mode,esc})}
<div class="result-bar"><p>예시 매물 <span id="result-count">${selected.length}</span>건</p><button type="button" class="text-button" id="clear-filters" hidden>전체 조건 해제</button><label class="sort-label">정렬<select id="sort-filter" aria-label="매물 정렬"><option value="default">기본순</option><option value="newest">최신 등록순</option><option value="low">가격 낮은순</option><option value="high">가격 높은순</option>${mode!=='equipment'?'<option value="rent-low">월세 낮은순</option>':''}</select></label></div><p class="sr-only" id="filter-results-status" role="status" aria-live="polite" aria-atomic="true">예시 매물 ${selected.length}개 표시</p>
<div class="listing-grid" id="listing-grid" data-initial="${mode}">${selected.map(card).join('')}</div><div class="empty-state" id="empty-state" hidden>${icon('search')}<h3>조건에 맞는 매물이 없습니다.</h3><p>다른 검색어나 지역으로 다시 찾아보세요.</p><button class="btn btn-primary" data-action="reset">검색 조건 초기화</button></div></section>`;
  }
  const guideCard = `<aside class="guide-card"><span class="eyebrow">등록 전에 읽어보세요</span><h3>잘 쓴 매물 글은<br>필요한 정보가 다릅니다.</h3><p>점포는 비용 항목과 인계 범위,<br>장비는 사양과 수량부터.</p><a href="/store-guide/">매물 작성 가이드 ${icon('arrow')}</a></aside>`;

  const sideColumn = `<aside class="side-column">
<section class="community-card"><div class="section-heading"><div><span class="eyebrow">사장님, 잠깐 이야기해요</span><h2>업주 이야기</h2></div><a class="more-link" href="/community/" aria-label="업주 이야기 게시판 전체 보기">${icon('arrow')}</a></div><div class="side-posts">${posts.map(postRow).join('')}</div><button class="community-write" data-action="write-post">이야기 작성 ${icon('plus')}</button></section>
<section class="checklist-card"><span class="eyebrow">거래 전, 한 번 더</span><h2>좋은 매물 글의 기본</h2><ol><li><span>01</span>위치와 면적을 구체적으로</li><li><span>02</span>보증금·월세·권리금은 따로</li><li><span>03</span>PC 사양과 인계 목록까지</li></ol><a href="/store-guide/">점포 매물 작성 가이드 ${icon('arrow')}</a></section>
<a class="buy-card" href="/buy/"><span>원하는 매장을 찾고 있다면</span><strong>PC방삽니다</strong><p>희망 지역과 예산부터 정리해보세요.</p><span class="buy-bottom">업종별 삽니다 게시판 ${icon('arrow')}</span></a>
</aside>`;
  const homeBody = `<section class="home-intro container"><div class="intro-copy"><span class="eyebrow">사장님들의 거래 마당</span><h1>성인PC 매매와 중고장터</h1><p>점포 양도·양수부터 PC·집기 거래, 업주들의 운영 이야기까지.</p></div><a class="intro-link" href="/guide/">처음 오셨나요? ${icon('arrow')}</a></section>
<div class="container search-area">${searchBox()}<nav class="category-shortcuts" aria-label="거래 분류 바로가기"><a href="/stores/">성인PC·PC방 매매 ${icon('arrow')}</a><a href="/equipment/">PC·집기 중고장터 ${icon('arrow')}</a><a href="/buy/">PC방 매입 조건 ${icon('arrow')}</a><a href="/community/">업주 커뮤니티 ${icon('arrow')}</a></nav></div>
<div class="home-columns container">${marketplace('all',false)}${sideColumn}</div>
<section class="container knowledge-section"><div class="section-heading"><div><span class="eyebrow">경험에 필요한 정보를 더하다</span><h2>거래·운영 가이드</h2></div><span class="section-caption">궁금한 주제부터 읽어보세요.</span></div><div class="knowledge-grid"><a href="/store-guide/"><span class="guide-index">01 / 매장 매매</span><h3>점포 양도 글,<br>무엇부터 적을까요?</h3><p>비용 항목과 인계할 시설을 빠짐없이 정리하는 방법.</p><span class="reading-bottom">PC방 매매 글 작성법 ${icon('arrow')}</span></a><a href="/interior/"><span class="guide-index">02 / 인테리어</span><h3>좌석 배치 전에<br>남겨둘 기록들.</h3><p>공간 치수와 동선, 설치할 PC와 집기부터 확인하세요.</p><span class="reading-bottom">PC방 인테리어 안내 ${icon('arrow')}</span></a><a href="/jobs-guide/"><span class="guide-index">03 / 구인구직</span><h3>함께 일할 사람에게<br>전할 정확한 정보.</h3><p>담당 업무와 근무 시간, 지원 방법을 명확하게 적기.</p><span class="reading-bottom">PC방 구인구직 안내 ${icon('arrow')}</span></a></div></section>
<section class="container home-about"><div><span class="eyebrow">성인PC마당</span><h2>매물도, 경험도.<br>사장님들의 정보가 모이는 곳.</h2></div><div><p>성인PC·일반 PC방의 점포 매매와 중고 PC, 모니터, 책상, 의자 거래를 살펴보세요. 매장은 지역과 비용을, 장비는 사양과 수량을 비교할 수 있습니다.</p><p>운영 중 생긴 질문과 경험은 업주 이야기에서 함께 나눕니다.</p><a class="more-link" href="/guide/">성인PC마당 이용 안내 ${icon('arrow')}</a></div></section>`;

  return {shell,card,route,postRow,searchBox,marketplace,guideCard,homeBody};
}
