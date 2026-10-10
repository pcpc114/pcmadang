import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createLayout} from './layout.mjs';
import {seoConfig} from './seo.mjs';
import {logoMark,logoLockup,socialCard} from './brand.mjs';
import {topics} from './topic-content.mjs';
import {navGroups} from './navigation.mjs';
import {createBoards} from './boards.mjs';
import {effectiveSeoPolicy} from './seo-policy.mjs';
import {writeBuildManifest,validateBuiltSite} from './seo-check.mjs';
import {getListingSeo} from './listing-seo.mjs';
import {renderSlotCatalogue,renderSlotDetail} from './slot-page.mjs';
import {validateSlotDemoUrl} from './slot-core.js';
import {resolveBuildPaths} from './build-paths.mjs';
const {root: outputRoot,manifestPath}=await resolveBuildPaths();
const content = JSON.parse(await readFile('content.json','utf8'));
const games = JSON.parse(await readFile('slot-data.json','utf8'));
const gameSlugs=new Set();
for(const game of games){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug)||gameSlugs.has(game.slug))throw new Error('Invalid or duplicate game slug');
  if(!game.name||!game.ko||!['slot','classic','megaways','popular'].includes(game.category)||game.image!==`/assets/slots/${game.slug}.png`||(game.demoUrl!==null&&!validateSlotDemoUrl(game.demoUrl)))throw new Error(`Invalid game data: ${game.slug}`);
  gameSlugs.add(game.slug);
}
const {listings,posts}=content;
const {origin,indexable,auditPreviewPages}=seoConfig();
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',heart:'<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',plus:'<path d="M12 5v14M5 12h14"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',shop:'<path d="M3 10V7l2-4h14l2 4v3M4 10v11h16V10M2 10h20M9 21v-7h6v7M8 3 7 10M16 3l1 7"/>',monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 11h8m-8 4h5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m5 12 4 4L19 6"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h5"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.arrow}</svg>`;
const {shell,card,route,postRow,searchBox,marketplace,guideCard,homeBody}=createLayout({content,icon,esc,origin,indexable,auditPreviewPages});
const {groupPage,boardPage,supportPage}=createBoards({content,icon,esc,card,searchBox,marketplace});
const pages=[];
async function output(pathname,options){
  if(pages.some(p=>p.pathname===pathname))throw new Error(`Duplicate output route: ${pathname}`);
  for(const key of ['title','description','body'])if(typeof options[key]!=='string'||!options[key].trim())throw new Error(`${pathname}: missing ${key}`);
  const policy=effectiveSeoPolicy(options,indexable,{auditPreviewPages});
  const directory=path.join(outputRoot,pathname);
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'index.html'),shell({...options,pathname}));
  pages.push({pathname,...policy});
}
await output('/',{title:'성인PC · PC방매매 · 중고장터 · 업주 커뮤니티',description:'성인PC마당에서 PC방팝니다·삽니다, 점포 양도·양수, PC·집기 중고장터와 운영 정보를 살펴보세요. 현재 매물과 게시글은 미리보기용 예시입니다.',body:homeBody});
for(const group of navGroups) {
  if(!group.children.length)continue;
  await output(group.href,groupPage(group));
  for(const child of group.children)await output(child.href,boardPage(group,child));
}
await output('/support/',supportPage);
await output('/saved/',{title:'관심 매물',description:'관심 있는 매물을 모아 확인하세요. 관심 목록은 이 브라우저에 저장됩니다.',page:'saved',active:'',body:`<section class="container page-intro"><span class="eyebrow">나의 마당</span><h1>관심 매물</h1><p>눈여겨본 매물을 한곳에 모아보세요. 이 브라우저에 저장됩니다.</p></section><section class="container saved-section"><div class="listing-grid" id="listing-grid">${listings.map(card).join('')}</div><div class="empty-state" id="empty-state" hidden>${icon('heart')}<h2>아직 관심 매물이 없습니다.</h2><p>마음에 드는 매물의 하트를 눌러보세요.</p><a class="btn btn-primary" href="/#market">매물 둘러보기 ${icon('arrow')}</a></div></section>`});
for(const l of listings){const listingSeo=getListingSeo(l);const details=l.type==='store'?[['지역',`${l.region} ${l.city}`],['면적',l.area],['보증금',l.deposit],['월세',l.rent],['권리금',l.premium]]:[['거래 지역',`${l.region} ${l.city}`],['사양',l.spec],['수량',l.quantity],['제품 상태',l.condition],['거래 방식',l.delivery]];await output(route(l),{...listingSeo,active:l.type,page:'detail',body:`<nav class="container breadcrumb" aria-label="현재 위치">${listingSeo.breadcrumbs.map((crumb,i)=>i===listingSeo.breadcrumbs.length-1?`<span aria-current="page">${esc(crumb.name)}</span>`:`<a href="${esc(crumb.pathname)}">${esc(crumb.name)}</a>${icon('chevron')}`).join('')}</nav><section class="container detail-layout"><div class="detail-main"><div class="detail-art"><div class="detail-placeholder">${icon(l.type==='store'?'shop':'monitor')}<strong>${listingSeo.isSample?'예시 매물':'매물 사진'}</strong><span>매물 사진이 등록되지 않았습니다.</span></div><span class="sample-tag">${listingSeo.isSample?'사진 미등록 · 화면 확인용 예시':'사진 미등록'}</span></div><div class="detail-description"><h2>매물 소개</h2>${l.description.split(/\n+/).filter(Boolean).map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}<div class="feature-tags">${l.features.map(t=>`<span>${esc(t)}</span>`).join('')}</div><h2>상세 정보</h2><dl class="details-list">${details.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'미입력')}</dd></div>`).join('')}</dl></div></div><aside class="detail-summary"><span class="category-label green">${l.type==='store'?'매장 양도':esc(l.category)}${listingSeo.isSample?' · 예시':''}</span><h1>${esc(l.title)}</h1><p class="location">${icon('pin')}${esc(l.region)} ${esc(l.city)}</p><p class="detail-price">${esc(l.price)}<small>${esc(l.priceNote)}</small></p><p class="detail-note">${listingSeo.isSample?'화면 구성을 위한 예시 매물입니다.<br>실제 판매 중인 매물이 아닙니다.':'등록된 정보와 실제 상태를 확인한 뒤 거래 조건을 협의하세요.'}</p><button class="btn btn-primary full-width" data-action="inquiry">${icon('chat')}판매자 문의 안내</button><button class="btn btn-outline full-width detail-save" data-save="${esc(l.id)}" aria-pressed="false" aria-label="${esc(l.title)} 관심 매물에 저장">${icon('heart')}관심 매물</button><button class="text-button full-width report-button" data-action="report">매물 신고 안내</button></aside></section><section class="container related-section"><div class="section-heading"><h2>다른 예시 매물</h2><a class="more-link" href="/${l.type==='store'?'stores':'equipment'}/">같은 분류 매물 보기 ${icon('arrow')}</a></div><div class="listing-grid">${listings.filter(x=>x.id!==l.id&&x.type===l.type).slice(0,3).map(card).join('')}</div></section>`});}
for(const p of posts)await output(`/community/${p.id}/`,{title:p.title,description:`예시 글 · ${p.excerpt}`,active:'community',page:'post',body:`<div class="container breadcrumb"><a href="/">마당 홈</a>${icon('chevron')}<a href="/community/">업주 이야기</a></div><article class="container post-detail"><span class="category-label green">${esc(p.category)} · 예시 글</span><h1>${esc(p.title)}</h1><div class="article-byline"><span class="avatar">마</span><span>예시 작성자</span><time datetime="${p.date}">${p.date.replaceAll('-','.')}</time></div><div class="post-content">${p.body.split('\n').filter(Boolean).map(t=>`<p>${esc(t)}</p>`).join('')}</div><div class="post-disclaimer">이 게시글은 화면 구성을 위한 예시입니다.</div><section class="comments-section"><h2>의견 나누기</h2><p>직접 댓글을 작성하며 화면을 살펴보세요.</p><form id="comment-form" data-post="${esc(p.id)}"><label class="sr-only" for="comment-text">댓글 내용</label><textarea id="comment-text" maxlength="1000" required placeholder="사장님의 경험을 나눠주세요. 작성 내용은 이 브라우저에만 저장됩니다."></textarea><button class="btn btn-primary" type="submit">댓글 임시 저장</button></form><div id="comments-list"></div></section><a href="/community/" class="btn btn-outline">목록으로 돌아가기</a></article>`});
await output('/guide/',{title:'마당 이용 안내',description:'성인PC마당에서 매장과 장비를 소개하고 업주들과 소통하는 방법을 살펴보세요.',active:'',page:'guide',body:`<section class="container page-intro"><span class="eyebrow">처음 오신 사장님께</span><h1>마당 이용 안내</h1><p>필요한 정보를 꼼꼼히 적으면, 서로의 시간을 아낄 수 있어요.</p></section><section class="container guide-layout"><article class="guide-step"><span>01</span><h2>어떤 매물인가요?</h2><p>점포를 판매할 때는 ‘PC방 팝니다’, 매입을 원할 때는 ‘PC방 삽니다’에서 업종을 선택하세요. PC나 의자·책상은 ‘중고장터’의 판매·구매 게시판을 이용합니다.</p></article><article class="guide-step"><span>02</span><h2>정보는 구체적으로</h2><p>매장은 지역·면적·보증금·월세·권리금을, 장비는 모델·사양·수량·가격·사용 상태를 적어주세요. 확인하지 않은 정보는 추측해서 적지 않습니다.</p></article><article class="guide-step"><span>03</span><h2>상태를 함께 알려주세요</h2><p>장점뿐 아니라 사용 흔적과 수리 이력, 인수할 때 알아야 할 사항도 설명해주세요. 실제 서비스에서는 직접 촬영한 사진을 함께 등록하면 좋습니다.</p></article><article class="guide-step"><span>04</span><h2>경험은 함께 나눠요</h2><p>장비 관리, 매장 운영, 거래 준비 과정에서 생긴 궁금증과 경험은 ‘커뮤니티’의 ‘매장 노하우&질문’에 나눠주세요.</p></article></section><section class="container preview-guide"><h2>지금은 화면을 살펴보는 미리보기입니다.</h2><p>표시된 매물과 게시글은 모두 예시입니다. 매물 등록·글쓰기·댓글은 이 브라우저에만 임시 저장되며, 다른 사람에게 공개되거나 실제 판매자에게 전달되지 않습니다.</p><button class="btn btn-primary" data-action="write">매물 등록해보기 ${icon('arrow')}</button></section>`});

await output('/games/',{title:'무료슬롯 · 슬롯게임 데모 모아보기',description:`성인PC마당 무료슬롯에서 ${games.length}개 슬롯게임의 한글·영문 이름을 검색하고 클래식·메가웨이즈 분류와 즐겨찾기로 찾아보세요. 게임별 무료 데모를 열 수 있습니다.`,active:'games',page:'games',seo:{visibility:'public'},body:renderSlotCatalogue({games,esc,icon})});
for(let page=2;page<=Math.ceil(games.length/24);page++){
  const pathname=`/games/page/${page}/`;
  await output(pathname,{title:`무료슬롯 게임 목록 · ${page}페이지`,description:`성인PC마당 무료슬롯 ${page}페이지입니다. 전체 ${games.length}개 중 ${(page-1)*24+1}~${Math.min(page*24,games.length)}번째 게임을 살펴보고 한글·영문 검색, 분류와 즐겨찾기로 게임을 찾아보세요.`,active:'games',page:'games',seo:{visibility:'public'},breadcrumbs:[{name:'마당 홈',pathname:'/'},{name:'무료슬롯',pathname:'/games/'},{name:`게임 목록 ${page}페이지`,pathname}],body:renderSlotCatalogue({games,page,pageSize:24,esc,icon})});
}
for(const game of games) {
  const pathname=`/games/${game.slug}/`;
  const description=game.demoUrl?`${game.ko} (${game.name}) 슬롯게임의 Pragmatic Play 무료 데모를 열어보세요. 전체 화면과 새 창 실행을 지원하며, 다른 무료슬롯 목록으로 이동할 수 있습니다.`:`${game.ko} (${game.name}) 슬롯게임의 이미지와 분류 정보를 살펴보세요. 현재 무료 데모 실행 주소가 연결되지 않았으며, 다른 게임은 전체 목록에서 확인할 수 있습니다.`;
  await output(pathname,{title:`${game.ko} (${game.name}) · 무료슬롯 ${game.demoUrl?'데모':'게임 정보'}`,description,active:'games',page:'games',seo:{visibility:'public'},breadcrumbs:[{name:'마당 홈',pathname:'/'},{name:'무료슬롯',pathname:'/games/'},{name:game.ko,pathname}],body:renderSlotDetail({game,games,esc,icon})});
}
for(const topic of topics.filter(topic=>topic.slug!=='games')) {
  const pathname = '/' + (['buy','jobs'].includes(topic.slug)?topic.slug+'-guide':topic.slug) + '/';
  const sections = topic.sections.map((section,i)=>'<section class="topic-section" id="section-'+(i+1)+'"><span class="topic-number">'+String(i+1).padStart(2,'0')+'</span><h2>'+esc(section.title)+'</h2>'+section.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>').join('');
  const cta = topic.slug==='buy' ? '<button class="btn btn-primary" data-action="write-buy">매입 조건 초안 작성 '+icon('plus')+'</button>' : '<a class="btn btn-primary" href="/stores/">매장 매물 둘러보기 '+icon('arrow')+'</a>';
  await output(pathname,{title:topic.title,description:topic.description,active:topic.slug,page:'topic',body:'<div class="container breadcrumb"><a href="/">마당 홈</a>'+icon('chevron')+'<span>'+esc(topic.eyebrow)+'</span></div><article class="container topic-article"><div class="page-intro"><span class="eyebrow">'+esc(topic.eyebrow)+'</span><h1>'+esc(topic.title)+'</h1><p>'+esc(topic.intro)+'</p></div><nav class="topic-nav" aria-label="이 페이지의 내용">'+topic.sections.map((s,i)=>'<a href="#section-'+(i+1)+'">'+esc(s.title)+'</a>').join('')+'</nav>'+sections+'<div class="topic-cta">'+cta+'<a class="more-link" href="/guide/">마당 이용 안내 '+icon('arrow')+'</a></div></article>'});
}
await mkdir(outputRoot,{recursive:true});
for(const file of ['market.css','boards.css','filters.css','footer.css','slots.css','app.js','filters.js','filter-core.js','slots.js','slot-core.js'])await copyFile(file,path.join(outputRoot,file));
await mkdir(path.join(outputRoot,'assets/slots'),{recursive:true});
for(const game of games)await copyFile('.'+game.image,path.join(outputRoot,game.image));
await writeFile(path.join(outputRoot,'slot-index.json'),JSON.stringify(games.map(({slug,name,ko,category,image})=>({slug,name,ko,category,image}))));
await writeFile(path.join(outputRoot,'favicon.svg'),logoMark);
await writeFile(path.join(outputRoot,'brand-symbol.svg'),logoMark);
await writeFile(path.join(outputRoot,'brand-logo.svg'),logoLockup);
await writeFile(path.join(outputRoot,'brand-social.svg'),socialCard);
await copyFile('assets/brand-social.png',path.join(outputRoot,'brand-social.png'));
await writeFile(path.join(outputRoot,'robots.txt'),'User-agent: *\nAllow: /\n'+(indexable?'Sitemap: '+origin+'/sitemap.xml\n':''));
await writeFile(path.join(outputRoot,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.filter(p=>p.indexable).map(p=>'<url><loc>'+esc(origin+p.pathname)+'</loc></url>').join('')+'</urlset>');
await writeBuildManifest({root:outputRoot,manifestPath,origin,pages,auditPreviewPages});
const report=await validateBuiltSite({root:outputRoot,manifestPath});
process.stdout.write('Built '+report.pages+' static pages; '+report.indexable+' indexable content pages. Origin: '+origin+'\n');
process.stdout.write('Static SEO checks passed for every generated page. Lighthouse scores require separate current evidence.\n');
if(auditPreviewPages)process.stdout.write('Mode: localhost template audit with sample content. Hosted sample pages remain noindex.\n');
