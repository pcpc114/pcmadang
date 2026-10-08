(() => {
  'use strict';
  const data = JSON.parse(document.querySelector('#site-data').textContent);
  const page = document.body.dataset.page;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validIds = new Set(data.listings.map(l => l.id));
  const keys = {saved:'madang.saved.v1',drafts:'madang.drafts.v1',comments:'madang.comments.v1'};
  const memory = new Map();
  const memoryOnly = new Set();
  let toastTimer;
  function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),3500);}
  function read(key,fallback){if(memoryOnly.has(key))return memory.get(key)??fallback;try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{return memory.get(key)??fallback;}}
  function write(key,value){memory.set(key,value);try{localStorage.setItem(key,JSON.stringify(value));memoryOnly.delete(key);return true;}catch{memoryOnly.add(key);toast('브라우저 저장소를 사용할 수 없어 현재 화면에서만 보관됩니다.');return false;}}
  const rawSaved=read(keys.saved,[]);
  let saved=new Set(Array.isArray(rawSaved)?rawSaved.filter(id=>validIds.has(id)):[]);
  function refreshSaved(){
    $$('.saved-count').forEach(e=>e.textContent=saved.size);
    $$('[data-save]').forEach(b=>{const on=saved.has(b.dataset.save);b.setAttribute('aria-pressed',String(on));const l=data.listings.find(l=>l.id===b.dataset.save);b.setAttribute('aria-label',`${l?.title||'매물'} 관심 매물${on?'에서 제거':'에 저장'}`);});
    if(page==='saved'){
      $$('#listing-grid .listing-card').forEach(c=>c.hidden=!saved.has(c.dataset.listing));
      $('#empty-state').hidden=saved.size>0;
      $('#listing-grid').hidden=saved.size===0;
    }
  }
  function toggleSaved(id){saved.has(id)?saved.delete(id):saved.add(id);const stored=write(keys.saved,[...saved]);refreshSaved();if(stored)toast(saved.has(id)?'관심 매물에 저장했습니다.':'관심 매물에서 해제했습니다.');}
  refreshSaved();
  const dialog=$('#main-dialog');
  let returnFocus=null;
  function openDialog(title,html){returnFocus=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;if(!dialog.open)dialog.showModal();}
  dialog.addEventListener('close',()=>returnFocus?.focus?.());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  function message(title,text){openDialog(title,`<div class="dialog-message"><div class="big-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></div><p>${escape(text)}</p><button class="btn btn-primary" data-action="close-dialog">확인</button></div>`);}
  const regionOptions=['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'].map(r=>`<option>${r}</option>`).join('');
  const field=(label,name,placeholder='',opts={})=>`<label class="field ${opts.wide?'wide':''}"><span>${label}${opts.required?' <small>필수</small>':''}</span><input name="${name}" ${opts.required?'required':''} maxlength="${opts.max||100}" placeholder="${placeholder}" ${opts.numeric?'inputmode="numeric"':''}></label>`;
  function writeForm(){
    openDialog('매물 등록해보기',`<p class="form-info">등록 화면을 미리 체험해보세요. 입력한 내용은 이 브라우저에만 임시 저장되며, 다른 사람에게 공개되지 않습니다.</p><form id="listing-form"><div class="form-grid"><label class="field"><span>매물 종류 <small>필수</small></span><select name="type" id="draft-type"><option value="store">매장 양도·양수</option><option value="equipment">PC·집기 거래</option></select></label><label class="field"><span>지역 <small>필수</small></span><select name="region" required><option value="">지역 선택</option>${regionOptions}</select></label>${field('매물 제목','title','매물의 특징이 드러나는 제목',{required:true,wide:true,max:80})}${field('시·군·구','city','예: 수원시 팔달구',{required:true,max:40})}${field('희망 가격','price','예: 3,500만 원 / 협의 가능',{required:true,max:40})}<div class="field wide" id="store-fields"><div class="form-grid">${field('면적','area','예: 99㎡ (약 30평)',{max:40})}${field('보증금','deposit','예: 2,000만 원',{max:40})}${field('월세','rent','예: 150만 원',{max:40})}${field('권리금','premium','예: 3,500만 원',{max:40})}</div></div><div class="field wide" id="equipment-fields" hidden><div class="form-grid">${field('모델·사양','spec','예: 메모리 16GB, SSD 512GB',{wide:true,max:150})}${field('수량','quantity','예: 10대',{max:30})}${field('사용 상태','condition','예: 사용 1년, 정상 작동',{max:80})}${field('거래 방식','delivery','예: 직거래 / 배송 협의',{wide:true,max:80})}</div></div><label class="field wide"><span>상세 설명 <small>필수</small></span><textarea name="description" required minlength="10" maxlength="3000" placeholder="매물의 특징과 상태를 10자 이상 적어주세요. 개인정보와 실제 연락처는 입력하지 마세요."></textarea></label></div><p class="form-error" id="form-error" hidden></p><div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-dialog">취소</button><button type="submit" class="btn btn-primary">초안 임시 저장</button></div></form>`);
    const type=$('#draft-type');const switchType=()=>{const store=type.value==='store';$('#store-fields').hidden=!store;$('#equipment-fields').hidden=store;$('#store-fields').querySelectorAll('input').forEach(e=>e.disabled=!store);$('#equipment-fields').querySelectorAll('input').forEach(e=>e.disabled=store);};type.addEventListener('change',switchType);switchType();
    $('#listing-form').addEventListener('submit',e=>{
      e.preventDefault();const entry=Object.fromEntries(new FormData(e.currentTarget));Object.keys(entry).forEach(k=>entry[k]=String(entry[k]).trim());
      if(!entry.title||!entry.region||!entry.city||!entry.price||entry.description.length<10){$('#form-error').textContent='필수 항목을 입력하고 상세 설명을 10자 이상 적어주세요.';$('#form-error').hidden=false;return;}
      const drafts=getDrafts();drafts.unshift({...entry,id:crypto.randomUUID(),kind:'listing',createdAt:new Date().toISOString()});const stored=write(keys.drafts,drafts);
      message('매물 초안을 저장했습니다',stored?'이 브라우저의 ‘내 초안’에서 확인할 수 있습니다. 실제 매물로 게시되거나 다른 사람에게 공개되지 않습니다.':'현재 화면에서만 초안을 보관합니다. 이 브라우저에서는 저장소를 사용할 수 없어 새로고침하면 사라집니다.');
    });
  }
  function getDrafts(){const d=read(keys.drafts,[]);return Array.isArray(d)?d.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'):[];}
  function draftDetails(d){const fields=[['category','이야기 주제'],['area','면적'],['deposit','보증금'],['rent','월세'],['premium','권리금'],['spec','모델·사양'],['quantity','수량'],['condition','사용 상태'],['delivery','거래 방식']].filter(([k])=>d[k]);return fields.length?`<details class="draft-details"><summary>저장한 상세 정보</summary><dl>${fields.map(([k,label])=>`<div><dt>${label}</dt><dd>${escape(d[k])}</dd></div>`).join('')}</dl></details>`:'';}
  function showDrafts(){const drafts=getDrafts();openDialog('내 초안',`<p class="form-info">이 브라우저에 임시 저장한 내용입니다. 실제 서비스에 게시되거나 다른 사용자에게 전달되지 않습니다.</p>${drafts.length?drafts.map(d=>`<article class="draft-item"><small>${d.kind==='post'?'업주 이야기':'매물'} · 임시 저장</small><h3>${escape(d.title)}</h3>${d.kind==='listing'?`<p>${escape(d.region)} ${escape(d.city)} · ${escape(d.price)}</p>`:''}<p>${escape(d.description||d.body||'')}</p>${draftDetails(d)}<button class="text-button" data-delete-draft="${escape(d.id)}">초안 삭제</button></article>`).join(''):'<p class="dialog-empty">저장한 초안이 없습니다.<br>매물 등록이나 이야기 작성을 체험해보세요.</p>'}<div class="form-actions"><button class="btn btn-outline" data-action="close-dialog">닫기</button><button class="btn btn-primary" data-action="write">새 매물 등록</button></div>`);}
  function writePost(){openDialog('이야기 작성해보기',`<p class="form-info">이 브라우저에만 임시 저장됩니다. 실제 게시판에 공개되지 않습니다.</p><form id="post-form"><div class="form-grid"><label class="field wide"><span>이야기 주제</span><select name="category"><option>운영 이야기</option><option>장비 관리</option><option>거래 준비</option><option>자유 이야기</option></select></label>${field('제목','title','어떤 이야기를 나누고 싶으세요?',{required:true,wide:true,max:80})}<label class="field wide"><span>내용 <small>필수</small></span><textarea name="body" required minlength="10" maxlength="5000" placeholder="경험과 궁금한 점을 10자 이상 적어주세요."></textarea></label></div><p class="form-error" id="form-error" hidden></p><div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-dialog">취소</button><button type="submit" class="btn btn-primary">이야기 임시 저장</button></div></form>`);$('#post-form').addEventListener('submit',e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget));p.title=p.title.trim();p.body=p.body.trim();if(!p.title||p.body.length<10){$('#form-error').hidden=false;$('#form-error').textContent='제목과 10자 이상의 내용을 입력해주세요.';return;}const drafts=getDrafts();drafts.unshift({...p,id:crypto.randomUUID(),kind:'post',createdAt:new Date().toISOString()});const stored=write(keys.drafts,drafts);message('이야기 초안을 저장했습니다',stored?'이 브라우저의 ‘내 초안’에서 확인할 수 있습니다. 다른 사람에게 공개되지 않습니다.':'브라우저 저장소를 사용할 수 없어 현재 화면에서만 보관합니다. 새로고침하면 사라집니다.');});}
  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save]');if(save){toggleSaved(save.dataset.save);return;}
    const del=e.target.closest('[data-delete-draft]');if(del){write(keys.drafts,getDrafts().filter(d=>d.id!==del.dataset.deleteDraft));showDrafts();return;}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='close-dialog')dialog.close();
    if(action==='write')writeForm();
    if(action==='write-post')writePost();
    if(action==='drafts')showDrafts();
    if(action==='inquiry')message('판매자 문의 안내','지금 보고 계신 매물은 화면 구성을 위한 예시입니다. 실제 판매자가 없으며 문의가 전송되지 않습니다.');
    if(action==='report')message('매물 신고 안내','현재는 예시 매물로 구성된 미리보기입니다. 실제 신고는 접수되지 않습니다.');
    if(action==='reset')resetFilters();
  });
  let filter=$('#listing-grid')?.dataset.initial||'all';
  let query='';
  const market=$('#market');
  function setTab(type){filter=['all','store','equipment'].includes(type)?type:'all';$$('[data-filter]').forEach(b=>{const selected=b.dataset.filter===filter;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});if($('#search-type'))$('#search-type').value=filter;}
  function priceValue(id){const s=data.listings.find(l=>l.id===id)?.price||'';if(s.includes('협의'))return Number.POSITIVE_INFINITY;let amount=parseFloat(s.replaceAll(',',''));if(!Number.isFinite(amount))return Number.POSITIVE_INFINITY;if(s.includes('억'))return amount*100000000;if(s.includes('만'))return amount*10000;return amount;}
  function applyFilters(updateUrl=true){
    if(!market)return;const region=$('#region-filter').value;const order=$('#sort-filter').value;const words=query.toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);let count=0;
    const cards=$$('#listing-grid .listing-card');
    cards.sort((a,b)=>order==='default'?data.listings.findIndex(l=>l.id===a.dataset.listing)-data.listings.findIndex(l=>l.id===b.dataset.listing):(order==='low'?1:-1)*(priceValue(a.dataset.listing)-priceValue(b.dataset.listing)));
    cards.forEach(c=>{const match=(filter==='all'||c.dataset.type===filter)&&(!region||c.dataset.region===region)&&words.every(w=>c.dataset.search.includes(w));c.hidden=!match;if(match)count++;$('#listing-grid').appendChild(c);});
    $('#result-count').textContent=count;$('#empty-state').hidden=count>0;$('#listing-grid').hidden=count===0;$('#clear-filters').hidden=!query&&!region&&filter===($('#listing-grid').dataset.initial||'all');
    if(updateUrl){const url=new URL(location.href);url.searchParams.delete('q');url.searchParams.delete('region');url.searchParams.delete('type');if(query)url.searchParams.set('q',query);if(region)url.searchParams.set('region',region);if(filter!==($('#listing-grid').dataset.initial||'all'))url.searchParams.set('type',filter);history.replaceState(null,'',url.pathname+url.search+url.hash);}
  }
  function resetFilters(){if(!market)return;query='';$('#search-input').value='';$('#region-filter').value='';$('#sort-filter').value='default';setTab('all');applyFilters();}
  if(market){const params=new URLSearchParams(location.search);query=params.get('q')||'';$('#search-input').value=query;const region=params.get('region');if([...$('#region-filter').options].some(o=>o.value===region))$('#region-filter').value=region;setTab(params.get('type')||filter);applyFilters(false);$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{setTab(b.dataset.filter);applyFilters();}));$('#region-filter').addEventListener('change',()=>applyFilters());$('#sort-filter').addEventListener('change',()=>applyFilters());$('#clear-filters').addEventListener('click',resetFilters);$('#search-form').addEventListener('submit',e=>{e.preventDefault();query=$('#search-input').value.trim();setTab($('#search-type').value);applyFilters();market.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});}
  const commentForm=$('#comment-form');
  function getComments(){const c=read(keys.comments,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{};}
  function renderComments(){if(!commentForm)return;const comments=getComments();const list=comments[commentForm.dataset.post];$('#comments-list').innerHTML=(Array.isArray(list)?list:[]).filter(c=>typeof c?.text==='string').map(c=>`<article class="comment"><span class="avatar">나</span><div><p>${escape(c.text)}</p><small>내 댓글 · 이 브라우저에만 임시 저장</small></div><button class="text-button" data-delete-comment="${escape(c.id)}">삭제</button></article>`).join('');}
  if(commentForm){renderComments();commentForm.addEventListener('submit',e=>{e.preventDefault();const input=$('#comment-text');const text=input.value.trim();if(!text){input.setCustomValidity('댓글 내용을 입력해주세요.');input.reportValidity();return;}input.setCustomValidity('');const comments=getComments();const id=commentForm.dataset.post;if(!Array.isArray(comments[id]))comments[id]=[];comments[id].push({id:crypto.randomUUID(),text});const stored=write(keys.comments,comments);input.value='';renderComments();if(stored)toast('댓글을 이 브라우저에 임시 저장했습니다.');});$('#comment-text').addEventListener('input',e=>e.target.setCustomValidity(''));$('#comments-list').addEventListener('click',e=>{const button=e.target.closest('[data-delete-comment]');if(!button)return;const comments=getComments();const id=commentForm.dataset.post;comments[id]=(comments[id]||[]).filter(c=>c.id!==button.dataset.deleteComment);write(keys.comments,comments);renderComments();});}
  window.addEventListener('storage',e=>{if(e.key===keys.saved){const raw=read(keys.saved,[]);saved=new Set(Array.isArray(raw)?raw.filter(id=>validIds.has(id)):[]);refreshSaved();}if(e.key===keys.comments)renderComments();});
})();
