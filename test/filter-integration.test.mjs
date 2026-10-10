import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLayout} from '../layout.mjs';
import {createBoards} from '../boards.mjs';
import {navGroups} from '../navigation.mjs';
import {createFilterState,normalizeFilterState,matchesListing,sortListings,parseFilterQuery,serializeFilterQuery} from '../filter-core.js';

const content=JSON.parse(await readFile(new URL('../content.json',import.meta.url),'utf8'));
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const icon=()=>'<svg aria-hidden="true" viewBox="0 0 24 24"></svg>';
const layout=createLayout({content,esc,icon,origin:'http://localhost:54633',indexable:true,auditPreviewPages:true});
const boards=createBoards({content,esc,icon,...layout});
const group=key=>navGroups.find(item=>item.key===key);
const page=(key,childKey)=>{
  const parent=group(key);
  const child=parent.children.find(item=>item.key===childKey);
  return layout.shell({...child?boards.boardPage(parent,child):boards.groupPage(parent),pathname:child?.href||parent.href});
};
const pages={
  '/':layout.shell({title:'성인PC마당',description:'매물 검색과 상세 필터',body:layout.homeBody}),
  '/stores/':page('store'),
  '/stores/adult/':page('store','adult'),
  '/stores/general/':page('store','general'),
  '/equipment/':page('equipment'),
  '/equipment/sell/':page('equipment','sell'),
};
const listingIds=html=>[...html.matchAll(/<article\b[^>]*\bdata-listing="([^"]+)"/g)].map(match=>match[1]);
const matchedIds=state=>content.listings.filter(listing=>matchesListing(listing,state)).map(listing=>listing.id);

test('actual sample data gives the expected intersection of region and three budgets',()=>{
  const filters=normalizeFilterState({regions:['서울','인천'],premium:{max:3500},deposit:{max:2000},rent:{max:150}});
  assert.deepEqual(matchedIds(filters),['store-001','store-003']);
  assert.deepEqual(matchedIds({...filters,rent:{min:null,max:120}}),['store-003']);
  assert.deepEqual(matchedIds({...filters,premium:{min:0,max:500}}),[]);
  assert.deepEqual(matchedIds(normalizeFilterState({rent:{max:120}})),['store-003']);
});

test('numeric sample costs agree with the prices that visitors see',()=>{
  const expected={
    'store-001':{premium:3500,deposit:2000,rent:150},
    'store-002':{premium:4200,deposit:3000,rent:190},
    'store-003':{premium:2800,deposit:1500,rent:120},
  };
  for (const listing of content.listings) {
    assert.equal(listing.price,`${listing.priceManwon.toLocaleString('ko-KR')}만 원`,`${listing.id} price`);
    if (listing.type==='store') {
      assert.deepEqual(listing.costsManwon,expected[listing.id]);
      for (const field of ['premium','deposit','rent']) {
        const display=`${listing.costsManwon[field].toLocaleString('ko-KR')}만 원`;
        assert.equal(listing[field],field==='rent'?`${display} / 월`:display,`${listing.id} ${field}`);
      }
    } else assert.equal(listing.costsManwon,undefined,'equipment has no store rental costs');
  }
});

test('rendered sale pages contain only their own eligible listing cards',()=>{
  const storeIds=['store-001','store-002','store-003'];
  const equipmentIds=['equipment-001','equipment-002','equipment-003','equipment-004','equipment-005'];
  assert.deepEqual(listingIds(pages['/']),[...storeIds,...equipmentIds]);
  assert.deepEqual(listingIds(pages['/stores/']),storeIds);
  assert.deepEqual(listingIds(pages['/stores/adult/']),storeIds);
  assert.deepEqual(listingIds(pages['/stores/general/']),[],'empty general board must not leak adult listings');
  assert.deepEqual(listingIds(pages['/equipment/']),equipmentIds);
  assert.deepEqual(listingIds(pages['/equipment/sell/']),equipmentIds);
});

test('each sale page renders one independently addressable filter form with all requested controls',()=>{
  const regions=['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];
  for (const [route,html] of Object.entries(pages)) {
    const ids=[...html.matchAll(/<[a-z][^>]*\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length,`${route}: duplicate DOM IDs would target the wrong control`);
    const form=html.match(/<form id="advanced-filter-form"[^>]*>([\s\S]*?)<\/form>/)?.[1];
    assert.ok(form,`${route}: filter form`);
    assert.deepEqual([...form.matchAll(/<input type="checkbox" name="regions" value="([^"]+)"/g)].map(match=>match[1]),regions,route);
    assert.equal([...form.matchAll(/<button\b[^>]*\bdata-clear-regions\b/g)].length,1,`${route}: all regions`);
    for (const field of ['premium','deposit','rent']) {
      for (const bound of ['Min','Max']) {
        const id=field+bound;
        assert.match(form,new RegExp(`<input id="${id}" name="${id}" type="number" min="0"`),`${route}: ${id}`);
        assert.match(form,new RegExp(`<label[^>]*for="${id}"[^>]*>[\\s\\S]*?최[소대] 금액 \\(만원\\)[\\s\\S]*?<\\/label>`),`${route}: labelled amount unit`);
      }
    }
    assert.match(form,/필터 설정은 이 브라우저에 저장됩니다\./,`${route}: honest storage scope`);
    assert.match(html,/<script src="\/app\.js" type="module"><\/script>/,`${route}: module controller can load`);
  }
});

test('quick budget choices use the requested exact ranges in 만원',()=>{
  const choices=[...pages['/stores/'].matchAll(/data-preset-field="([^"]+)" data-min="([^"]+)" data-max="([^"]+)"/g)].map(([,field,min,max])=>[field,Number(min),Number(max)]);
  assert.deepEqual(choices,[['premium',0,500],['premium',500,1000],['premium',1000,2000],['deposit',0,500],['deposit',500,1000],['deposit',1000,2000],['rent',0,50],['rent',50,100],['rent',100,150]]);
  assert.match(pages['/equipment/'],/id="store-cost-filters" class="filter-costs" hidden/);
  assert.match(pages['/equipment/sell/'],/id="store-cost-filters" class="filter-costs" hidden/);
});

test('a shared filtered search restores actual matching listings and obeys the destination category',()=>{
  const filters=normalizeFilterState({type:'store',regions:['서울','인천'],premium:{max:3500},deposit:{max:2000},rent:{max:150},sort:'rent-low'});
  const query=serializeFilterQuery(filters);
  const restored=parseFilterQuery(query,{initialType:'store',lockedType:true});
  assert.equal(restored.present,true);
  assert.deepEqual(sortListings(content.listings.filter(listing=>matchesListing(listing,restored.state)),restored.state.sort).map(listing=>listing.id),['store-003','store-001']);
  const conflicting=parseFilterQuery('filters=1&type=equipment&region=서울',{initialType:'store',lockedType:true});
  assert.deepEqual(matchedIds(conflicting.state),['store-001']);
  assert.deepEqual(parseFilterQuery(serializeFilterQuery(createFilterState('store'),{initialType:'store'}),{initialType:'store',lockedType:true}).state,createFilterState('store'));
});
