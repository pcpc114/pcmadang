import {navGroups} from './navigation.mjs';

export {previewPageTypes} from './seo-policy.mjs';

export function createBoards({content, icon, esc, card, searchBox, marketplace}) {
  const crumbs = (group, child) => `<nav class="container breadcrumb" aria-label="현재 위치"><a href="/">마당 홈</a>${icon('chevron')}<a href="${group.href}">${esc(group.label)}</a>${child ? `${icon('chevron')}<span aria-current="page">${esc(child.label)}</span>` : ''}</nav>`;
  const subnav = (group, child) => `<nav class="container board-subnav" aria-label="${esc(group.label)} 게시판"><a href="${group.href}" ${!child?'class="selected" aria-current="page"':''}>전체</a>${group.children.map(item=>`<a href="${item.href}" ${child?.key===item.key?'class="selected" aria-current="page"':''}>${esc(item.label)}</a>`).join('')}</nav>`;
  function writeButton(child) {
    if (!child || child.kind==='notice') return '';
    const action = child.kind==='post'?'write-post':['recruit','seeking'].includes(child.kind)?'write-job':'write';
    const label = child.kind==='post'?'글쓰기':child.kind==='recruit'?'구인정보 작성':child.kind==='seeking'?'구직정보 작성':child.kind.endsWith('buy')?'구매 조건 작성':'판매 글 작성';
    return `<button class="btn btn-primary" data-action="${action}" data-kind="${child.kind}" data-board="${child.href}" data-business="${['adult','general','other'].includes(child.key)?child.key:''}" data-category="${esc(child.label)}">${icon('plus')}${label}</button>`;
  }
  const entriesFor = child => child.kind==='store-sell' ? content.listings.filter(l=>l.type==='store'&&l.business===child.key) : child.kind==='equipment-sell' ? content.listings.filter(l=>l.type==='equipment') : child.kind==='post' ? content.posts.filter(p=>p.board===child.href) : [];
  function articleRows(posts) {
    return `<div class="community-panel"><div class="board-heading"><h2>게시글 목록</h2><span>예시 글 ${posts.length}개</span></div>${posts.map(p=>`<a class="community-article" href="/community/${p.id}/"><span class="category-label">${esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><div class="article-meta">예시 글 <span>·</span><time datetime="${p.date}">${p.date.replaceAll('-','.')}</time>${icon('arrow')}</div></a>`).join('')}</div>`;
  }
  function empty(child) {
    const notice=child.kind==='notice';
    return `<section class="board-empty"><div class="board-empty-icon" aria-hidden="true">${icon(notice?'file':child.kind==='post'?'chat':'shop')}</div><h2>${notice?'아직 등록된 소식이 없습니다.':'아직 등록된 글이 없습니다.'}</h2><p>${notice?'확인된 공지와 소식이 등록되면 이곳에서 볼 수 있습니다.':'작성한 글은 내 브라우저의 초안으로 보관됩니다.'}</p>${writeButton(child)}${child.key==='photos'?'<small>현재는 글 초안 작성만 가능하며 사진 첨부는 준비 중입니다.</small>':''}</section>`;
  }
  function boardPage(group, child) {
    const entries=entriesFor(child);
    const saleMode=child.kind==='store-sell'?'store':child.kind==='equipment-sell'?'equipment':null;
    const body=saleMode?marketplace(saleMode,false,entries,{showTabs:false}):entries.length?articleRows(entries):empty(child);
    const related = group.key==='buy'?['/buy-guide/','PC방 매입 조건 작성 안내']:group.key==='jobs'?['/jobs-guide/','구인 글 작성 안내']:group.key==='community'?['/guide/','커뮤니티 이용 안내']:['/store-guide/','매물 작성 가이드'];
    return {title:child.title,description:child.description,active:group.key,page:'board',noindex:true,body:`${crumbs(group,child)}<section class="container page-intro board-intro"><div><span class="eyebrow">${esc(group.label)}</span><h1>${esc(child.label)}</h1><p>${esc(child.description)}</p></div>${writeButton(child)}${saleMode?searchBox(true,saleMode):''}</section>${subnav(group,child)}<div class="container board-content">${body}<div class="board-help"><a href="${group.href}">${esc(group.label)} 전체 보기 ${icon('arrow')}</a><a href="${group.key==='notices'?'/support/':related[0]}">${group.key==='notices'?'고객센터':related[1]} ${icon('arrow')}</a></div></div>`};
  }
  function groupPage(group) {
    const listingMode=group.key==='store'?'store':group.key==='equipment'?'equipment':null;
    let body;
    if(listingMode) body=`<section class="container page-intro"><span class="eyebrow">점포·장비 거래</span><h1>${esc(group.label)}</h1><p>${esc(group.description)} 현재 매물은 화면 확인용 예시입니다.</p>${searchBox(true,listingMode)}</section>${subnav(group)}${marketplace(listingMode)}`;
    else if(group.key==='community') body=`<section class="container page-intro"><span class="eyebrow">사장님들의 이야기</span><h1>커뮤니티</h1><p>${esc(group.description)}</p></section>${subnav(group)}<section class="container board-content">${articleRows(content.posts)}<div class="board-help"><a href="/community/free/">자유게시판에서 글쓰기 ${icon('arrow')}</a><a href="/community/tips/">매장 노하우&질문 ${icon('arrow')}</a></div></section>`;
    else body=`<section class="container page-intro"><span class="eyebrow">성인PC마당 게시판</span><h1>${esc(group.label)}</h1><p>${esc(group.description)}</p></section>${subnav(group)}<section class="container board-content"><div class="board-directory">${group.children.map((child,i)=>`<a href="${child.href}"><span class="directory-number">${String(i+1).padStart(2,'0')}</span><h2>${esc(child.label)}</h2><p>${esc(child.description)}</p><span class="directory-bottom">게시판 보기 ${icon('arrow')}</span></a>`).join('')}</div><p class="board-status">현재 등록된 ${group.key==='notices'?'소식':'게시글'}이 없습니다.</p>${group.key==='buy'?'<div class="board-help"><a href="/buy-guide/">매입 조건을 작성하는 방법 →</a></div>':group.key==='jobs'?'<div class="board-help"><a href="/jobs-guide/">구인 글을 작성하는 방법 →</a></div>':''}</section>`;
    return {title:group.key==='notices'?'공지와 소식 모아보기':group.key==='store'?'PC방 팝니다 · 성인PC방·일반PC방 매매':group.key==='community'?'커뮤니티 · PC방 업주 게시판':group.label,description:group.description,active:group.key,page:listingMode||group.key==='community'?group.key:'empty-board',body};
  }
  const supportPage={title:'고객센터 · 이용 방법과 자주 묻는 질문',description:'성인PC마당의 매물 등록, 게시판 분류, 초안 저장과 문의·신고 방법을 확인하세요.',active:'support',page:'support',body:`<section class="container page-intro"><span class="eyebrow">성인PC마당 이용 도움말</span><h1>고객센터</h1><p>이용 중 궁금한 내용을 확인해보세요.</p></section><section class="container support-content"><div class="support-shortcuts"><a href="/guide/">${icon('file')}이용 안내 ${icon('arrow')}</a><button data-action="drafts">${icon('file')}내 초안 확인 ${icon('arrow')}</button><a href="/notices/announcements/">${icon('chat')}공지사항 ${icon('arrow')}</a></div><h2>자주 묻는 질문</h2><div class="support-faq"><details><summary>어느 게시판에 매물을 올리나요?</summary><p>점포를 판매할 때는 PC방 팝니다, 매입을 원할 때는 PC방 삽니다에서 성인PC방·일반PC방·기타업종을 선택하세요. PC와 집기는 중고장터의 판매·구매 게시판을 이용합니다.</p></details><details><summary>작성한 글은 어디에서 확인하나요?</summary><p>현재는 미리보기입니다. 작성 내용은 이 브라우저에만 초안으로 저장됩니다. 화면 위쪽이나 아래쪽의 ‘내 초안’에서 확인할 수 있습니다. 다른 회원에게 공개되지는 않습니다.</p></details><details><summary>매물과 사진은 실제 판매 정보인가요?</summary><p>‘예시’로 표시한 매물과 게시글은 화면 구성을 위한 자료입니다. 실제 거래 중인 매물이 아니며 실제 매장 사진도 등록되지 않았습니다.</p></details><details><summary>구인·구직 글도 작성할 수 있나요?</summary><p>구인정보와 구직정보를 나누어 초안을 작성할 수 있습니다. 지금은 실제 모집 공고 게시나 지원 접수가 연결되어 있지 않습니다.</p></details><details><summary>문의나 신고는 어떻게 하나요?</summary><p>실제 문의·신고 접수는 아직 연결되지 않았습니다. 판매자 문의나 고객센터에 내용이 전송되지 않습니다.</p></details></div><div class="support-notice"><h2>현재 제공하는 범위</h2><p>게시판 탐색, 매물 검색, 관심 매물 저장과 글 초안 작성을 이용할 수 있습니다. 회원 간 게시·사진 첨부·문의 전송은 준비 중입니다.</p></div></section>`};
  return {boardPage,groupPage,supportPage,subnav};
}
