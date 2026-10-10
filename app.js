import {initListingFilters} from './filters.js';
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
  const field=(label,name,placeholder='',opts={})=>`<label class="field ${opts.wide?'wide':''}"><span>${label}${opts.required?' <small>필수</small>':''}</span><input name="${name}" ${opts.required?'required':''} maxlength="${opts.max||100}" placeholder="${placeholder}" ${opts.money?'type="number" min="0" step="any" inputmode="decimal"':opts.numeric?'inputmode="numeric"':''}></label>`;
  const businessLabels={adult:'성인PC방',general:'일반PC방',other:'기타업종'};
  const postBoards={'자유게시판':'/community/free/','사진':'/community/photos/','유머':'/community/humor/','매장 노하우&질문':'/community/tips/'};
  const listingBoard=(type,intent,business)=>type==='equipment'?`/equipment/${intent}/`:`/${intent==='buy'?'buy':'stores'}/${business}/`;
  function writeForm(context={}){
    const kind=['store-sell','store-buy','equipment-sell','equipment-buy'].includes(context.kind)?context.kind:'store-sell';
    const intent=kind.endsWith('-buy')?'buy':'sell';
    const initialType=kind.startsWith('equipment-')?'equipment':'store';
    const business=Object.hasOwn(businessLabels,context.business)?context.business:'adult';
    openDialog(intent==='buy'?'구매 조건 작성해보기':'판매 글 작성해보기',`
      <p class="form-info">등록 화면을 미리 체험해보세요. 입력한 내용은 이 브라우저에만 임시 저장되며, 다른 사람에게 공개되지 않습니다.</p>
      <form id="listing-form"><div class="form-grid">
        <label class="field wide"><span>거래 목적</span><select name="intent"><option value="sell" ${intent==='sell'?'selected':''}>팝니다 · 판매</option><option value="buy" ${intent==='buy'?'selected':''}>삽니다 · 구매</option></select></label>
        <label class="field"><span>매물 종류 <small>필수</small></span><select name="type" id="draft-type"><option value="store" ${initialType==='store'?'selected':''}>점포 양도·양수</option><option value="equipment" ${initialType==='equipment'?'selected':''}>PC·집기 거래</option></select></label>
        <label class="field"><span>지역 <small>필수</small></span><select name="region" required><option value="">지역 선택</option>${regionOptions}</select></label>
        ${field('제목','title','매물 또는 찾는 조건이 드러나는 제목',{required:true,wide:true,max:80})}
        ${field('시·군·구','city','예: 수원시 팔달구',{required:true,max:40})}${field('희망 가격·예산','price','예: 3,500만 원 / 협의 가능',{required:true,max:40})}
        <div class="field wide" id="store-fields"><div class="form-grid">
          <label class="field wide"><span>업종</span><select name="business">${Object.entries(businessLabels).map(([value,label])=>`<option value="${value}" ${business===value?'selected':''}>${label}</option>`).join('')}</select></label>
          ${field('면적','area','예: 99㎡ (약 30평)',{max:40})}${field('보증금 (만원)','deposit','예: 2000',{max:40,money:true})}${field('월세 (만원)','rent','예: 150',{max:40,money:true})}${field('권리금 (만원)','premium','예: 3500',{max:40,money:true})}
        </div></div>
        <div class="field wide" id="equipment-fields" hidden><div class="form-grid">
          ${field('모델·사양','spec','예: 메모리 16GB, SSD 512GB',{wide:true,max:150})}${field('수량','quantity','예: 10대',{max:30})}${field('사용 상태·희망 상태','condition','예: 사용 1년 이내, 정상 작동',{max:80})}${field('거래 방식','delivery','예: 직거래 / 배송 협의',{wide:true,max:80})}
        </div></div>
        <label class="field wide"><span>상세 설명 <small>필수</small></span><textarea name="description" required minlength="10" maxlength="3000" placeholder="매물의 특징과 상태 또는 찾는 조건을 10자 이상 적어주세요. 개인정보와 실제 연락처는 입력하지 마세요."></textarea></label>
      </div><p class="form-error" id="form-error" hidden></p><div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-dialog">취소</button><button type="submit" class="btn btn-primary">초안 임시 저장</button></div></form>`);
    const type=$('#draft-type');const switchType=()=>{const store=type.value==='store';$('#store-fields').hidden=!store;$('#equipment-fields').hidden=store;$('#store-fields').querySelectorAll('input,select').forEach(e=>e.disabled=!store);$('#equipment-fields').querySelectorAll('input').forEach(e=>e.disabled=store);};type.addEventListener('change',switchType);switchType();
    $('#listing-form').addEventListener('submit',e=>{
      e.preventDefault();const entry=Object.fromEntries(new FormData(e.currentTarget));Object.keys(entry).forEach(k=>entry[k]=String(entry[k]).trim());
      if(!entry.title||!entry.region||!entry.city||!entry.price||entry.description.length<10){$('#form-error').textContent='필수 항목을 입력하고 상세 설명을 10자 이상 적어주세요.';$('#form-error').hidden=false;return;}
      if(entry.type==='store'){
        entry.costsManwon={};
        for(const name of ['premium','deposit','rent']){
          const value=entry[name]===''?null:Number(entry[name]);
          if(value!==null&&(!Number.isFinite(value)||value<0)){$('#form-error').textContent='금액은 0 이상의 숫자로 입력해주세요.';$('#form-error').hidden=false;return;}
          entry.costsManwon[name]=value;
          entry[name]=value===null?'':value.toLocaleString('ko-KR',{maximumFractionDigits:4})+'만 원';
        }
      }
      entry.board=listingBoard(entry.type,entry.intent,entry.business);
      const drafts=getDrafts();drafts.unshift({...entry,id:crypto.randomUUID(),kind:'listing',createdAt:new Date().toISOString()});const stored=write(keys.drafts,drafts);
      message('매물 초안을 저장했습니다',stored?'이 브라우저의 ‘내 초안’에서 확인할 수 있습니다. 실제 매물로 게시되거나 다른 사람에게 공개되지 않습니다.':'현재 화면에서만 초안을 보관합니다. 이 브라우저에서는 저장소를 사용할 수 없어 새로고침하면 사라집니다.');
    });
  }
  function getDrafts(){const d=read(keys.drafts,[]);return Array.isArray(d)?d.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'):[];}
  function draftLabel(d){
    if(d.kind==='post')return d.category||'커뮤니티';
    if(d.kind==='job')return d.jobType==='seeking'?'구직정보':'구인정보';
    if(d.type==='equipment')return `중고장터 ${d.intent==='buy'?'구매':'판매'}`;
    return `PC방 ${d.intent==='buy'?'삽니다':'팝니다'}${businessLabels[d.business]?` · ${businessLabels[d.business]}`:''}`;
  }
  function draftDetails(d){
    const fields=[['board','게시판 주소'],['intent','거래 목적'],['business','업종'],['category','커뮤니티 게시판'],['jobType','구인구직 구분'],['duties','업무'],['hours','근무 시간'],['conditions','급여·희망 조건'],['area','면적'],['deposit','보증금'],['rent','월세'],['premium','권리금'],['spec','모델·사양'],['quantity','수량'],['condition','사용 상태·희망 상태'],['delivery','거래 방식']].filter(([k])=>d[k]);
    const display=(k)=>k==='intent'?(d[k]==='buy'?'삽니다 · 구매':'팝니다 · 판매'):k==='business'?(businessLabels[d[k]]||d[k]):k==='jobType'?(d[k]==='seeking'?'구직정보':'구인정보'):d[k];
    return fields.length?`<details class="draft-details"><summary>저장한 상세 정보</summary><dl>${fields.map(([k,label])=>`<div><dt>${label}</dt><dd>${escape(display(k))}</dd></div>`).join('')}</dl></details>`:'';
  }
  function showDrafts(){const drafts=getDrafts();openDialog('내 초안',`<p class="form-info">이 브라우저에 임시 저장한 내용입니다. 실제 서비스에 게시되거나 다른 사용자에게 전달되지 않습니다.</p>${drafts.length?drafts.map(d=>`<article class="draft-item"><small>${escape(draftLabel(d))} · 임시 저장</small><h3>${escape(d.title)}</h3>${d.kind==='listing'?`<p>${escape(d.region)} ${escape(d.city)} · ${escape(d.price)}</p>`:d.kind==='job'?`<p>${escape(d.region)} ${escape(d.city)}</p>`:''}<p>${escape(d.description||d.body||'')}</p>${draftDetails(d)}<button class="text-button" data-delete-draft="${escape(d.id)}">초안 삭제</button></article>`).join(''):'<p class="dialog-empty">저장한 초안이 없습니다.<br>매물, 커뮤니티 또는 구인구직 글 작성을 체험해보세요.</p>'}<div class="form-actions"><button class="btn btn-outline" data-action="close-dialog">닫기</button><button class="btn btn-primary" data-action="write">새 매물 등록</button></div>`);}
  function writePost(context={}){
    const category=Object.hasOwn(postBoards,context.category)?context.category:Object.keys(postBoards).find(key=>postBoards[key]===context.board)||'자유게시판';
    openDialog('커뮤니티 글 작성해보기',`<p class="form-info">이 브라우저에만 임시 저장됩니다. 실제 게시판에 공개되지 않습니다.</p><form id="post-form"><div class="form-grid"><label class="field wide"><span>게시판</span><select name="category" id="post-category">${Object.keys(postBoards).map(label=>`<option ${label===category?'selected':''}>${escape(label)}</option>`).join('')}</select></label><p class="form-info wide" id="photo-draft-info" hidden>사진 첨부 기능은 아직 연결되지 않았습니다. 사진 게시판에 올릴 제목과 설명을 글 초안으로만 저장합니다.</p>${field('제목','title','어떤 이야기를 나누고 싶으세요?',{required:true,wide:true,max:80})}<label class="field wide"><span>내용 <small>필수</small></span><textarea name="body" required minlength="10" maxlength="5000" placeholder="경험과 궁금한 점을 10자 이상 적어주세요."></textarea></label></div><p class="form-error" id="form-error" hidden></p><div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-dialog">취소</button><button type="submit" class="btn btn-primary">글 초안 임시 저장</button></div></form>`);
    const categorySelect=$('#post-category');const updatePhotoInfo=()=>{$('#photo-draft-info').hidden=categorySelect.value!=='사진';};categorySelect.addEventListener('change',updatePhotoInfo);updatePhotoInfo();
    $('#post-form').addEventListener('submit',e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget));p.title=p.title.trim();p.body=p.body.trim();if(!p.title||p.body.length<10){$('#form-error').hidden=false;$('#form-error').textContent='제목과 10자 이상의 내용을 입력해주세요.';return;}p.board=postBoards[p.category];const drafts=getDrafts();drafts.unshift({...p,id:crypto.randomUUID(),kind:'post',createdAt:new Date().toISOString()});const stored=write(keys.drafts,drafts);message('글 초안을 저장했습니다',stored?'이 브라우저의 ‘내 초안’에서 확인할 수 있습니다. 다른 사람에게 공개되지 않습니다.':'브라우저 저장소를 사용할 수 없어 현재 화면에서만 보관합니다. 새로고침하면 사라집니다.');});
  }
  function writeJob(context={}){
    const jobType=context.kind==='seeking'?'seeking':'recruit';
    openDialog(`${jobType==='seeking'?'구직정보':'구인정보'} 작성해보기`,`
      <p class="form-info">이 브라우저에만 임시 저장하는 초안입니다. 실제 게시, 지원이나 연락이 이루어지지 않습니다. 개인정보와 실제 연락처는 입력하지 마세요.</p>
      <form id="job-form"><div class="form-grid">
        <label class="field wide"><span>게시판</span><select name="jobType"><option value="recruit" ${jobType==='recruit'?'selected':''}>구인정보 · 직원을 구합니다</option><option value="seeking" ${jobType==='seeking'?'selected':''}>구직정보 · 일자리를 구합니다</option></select></label>
        ${field('제목','title','업무와 근무 조건이 드러나는 제목',{required:true,wide:true,max:80})}
        <label class="field"><span>근무 희망 지역 <small>필수</small></span><select name="region" required><option value="">지역 선택</option>${regionOptions}</select></label>
        ${field('시·군·구','city','예: 수원시 팔달구',{required:true,max:40})}${field('업무','duties','예: 매장 관리, PC 정리',{wide:true,max:150})}${field('근무 시간','hours','예: 주말 10:00~18:00 / 협의',{wide:true,max:100})}${field('급여·희망 조건','conditions','예: 시급, 근무 기간, 희망 조건',{wide:true,max:150})}
        <label class="field wide"><span>상세 내용 <small>필수</small></span><textarea name="body" required minlength="10" maxlength="3000" placeholder="업무, 경력 또는 희망 조건을 10자 이상 적어주세요."></textarea></label>
      </div><p class="form-error" id="form-error" hidden></p><div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-dialog">취소</button><button type="submit" class="btn btn-primary">글 초안 임시 저장</button></div></form>`);
    $('#job-form').addEventListener('submit',e=>{
      e.preventDefault();const entry=Object.fromEntries(new FormData(e.currentTarget));Object.keys(entry).forEach(k=>entry[k]=String(entry[k]).trim());
      if(!entry.title||!entry.region||!entry.city||entry.body.length<10){$('#form-error').textContent='제목과 지역, 10자 이상의 상세 내용을 입력해주세요.';$('#form-error').hidden=false;return;}
      entry.board=`/jobs/${entry.jobType}/`;const drafts=getDrafts();drafts.unshift({...entry,id:crypto.randomUUID(),kind:'job',createdAt:new Date().toISOString()});const stored=write(keys.drafts,drafts);
      message('구인구직 초안을 저장했습니다',stored?'이 브라우저의 ‘내 초안’에서 확인할 수 있습니다. 실제 게시되거나 다른 사람에게 전달되지 않습니다.':'브라우저 저장소를 사용할 수 없어 현재 화면에서만 보관합니다. 새로고침하면 사라집니다.');
    });
  }
  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save]');if(save){toggleSaved(save.dataset.save);return;}
    const del=e.target.closest('[data-delete-draft]');if(del){write(keys.drafts,getDrafts().filter(d=>d.id!==del.dataset.deleteDraft));showDrafts();return;}
    const trigger=e.target.closest('[data-action]');
    const action=trigger?.dataset.action;
    if(action==='close-dialog')dialog.close();
    if(action==='write')writeForm(trigger.dataset);
    if(action==='write-buy')writeForm({...trigger.dataset,kind:trigger.dataset.kind||'store-buy'});
    if(action==='write-post')writePost(trigger.dataset);
    if(action==='write-job')writeJob(trigger.dataset);
    if(action==='drafts')showDrafts();
    if(action==='inquiry')message('판매자 문의 안내','지금 보고 계신 매물은 화면 구성을 위한 예시입니다. 실제 판매자가 없으며 문의가 전송되지 않습니다.');
    if(action==='report')message('매물 신고 안내','현재는 예시 매물로 구성된 미리보기입니다. 실제 신고는 접수되지 않습니다.');
    if(action==='reset')resetFilters();
  });
  const listingFilters=initListingFilters({listings:data.listings,toast,showLink:url=>openDialog('조건 링크',`<p class="form-info">아래 링크를 복사하면 현재 적용한 조건을 함께 전달할 수 있습니다.</p><label class="field"><span>조건 링크</span><input type="text" readonly value="${escape(url)}"></label><button type="button" class="btn btn-outline" data-action="close-dialog">닫기</button>`)});
  function resetFilters(){listingFilters.reset();}
  const commentForm=$('#comment-form');
  function getComments(){const c=read(keys.comments,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{};}
  function renderComments(){if(!commentForm)return;const comments=getComments();const list=comments[commentForm.dataset.post];$('#comments-list').innerHTML=(Array.isArray(list)?list:[]).filter(c=>typeof c?.text==='string').map(c=>`<article class="comment"><span class="avatar">나</span><div><p>${escape(c.text)}</p><small>내 댓글 · 이 브라우저에만 임시 저장</small></div><button class="text-button" data-delete-comment="${escape(c.id)}">삭제</button></article>`).join('');}
  if(commentForm){renderComments();commentForm.addEventListener('submit',e=>{e.preventDefault();const input=$('#comment-text');const text=input.value.trim();if(!text){input.setCustomValidity('댓글 내용을 입력해주세요.');input.reportValidity();return;}input.setCustomValidity('');const comments=getComments();const id=commentForm.dataset.post;if(!Array.isArray(comments[id]))comments[id]=[];comments[id].push({id:crypto.randomUUID(),text});const stored=write(keys.comments,comments);input.value='';renderComments();if(stored)toast('댓글을 이 브라우저에 임시 저장했습니다.');});$('#comment-text').addEventListener('input',e=>e.target.setCustomValidity(''));$('#comments-list').addEventListener('click',e=>{const button=e.target.closest('[data-delete-comment]');if(!button)return;const comments=getComments();const id=commentForm.dataset.post;comments[id]=(comments[id]||[]).filter(c=>c.id!==button.dataset.deleteComment);write(keys.comments,comments);renderComments();});}
  window.addEventListener('storage',e=>{if(e.key===keys.saved){const raw=read(keys.saved,[]);saved=new Set(Array.isArray(raw)?raw.filter(id=>validIds.has(id)):[]);refreshSaved();}if(e.key===keys.comments)renderComments();});
})();
