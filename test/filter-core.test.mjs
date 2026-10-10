import test from 'node:test';
import assert from 'node:assert/strict';
import {REGIONS,createFilterState,normalizeFilterState,validateFilterState,matchesListing,normalizeSearch,sortListings,parseFilterQuery,serializeFilterQuery} from '../filter-core.js';

const store=(values={})=>({id:'s',type:'store',category:'매장 양도·양수',title:'좌석이 여유로운 매장',region:'서울',city:'강서구',description:'운영 조건',priceManwon:1000,costsManwon:{premium:1000,deposit:500,rent:50},date:'2026-10-09',...values});
const state=values=>normalizeFilterState({...createFilterState(),...values});

test('seventeen regions follow the requested order and states have independent ranges',()=>{
  assert.deepEqual(REGIONS,['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주']);
  const first=createFilterState('store');
  first.premium.min=0;first.regions.push('서울');
  assert.equal(createFilterState().premium.min,null);
  assert.deepEqual(createFilterState().regions,[]);
  assert.equal(first.type,'store');
});

test('regions use OR, distinct financial ranges use AND, and bounds are inclusive',()=>{
  const filters=state({regions:['서울','경기'],premium:{min:1000,max:2000},deposit:{min:0,max:500},rent:{min:50,max:50}});
  assert.equal(matchesListing(store(),filters),true);
  assert.equal(matchesListing(store({region:'경기'}),filters),true);
  assert.equal(matchesListing(store({region:'인천'}),filters),false);
  assert.equal(matchesListing(store({costsManwon:{premium:2000,deposit:500,rent:50}}),filters),true);
  assert.equal(matchesListing(store({costsManwon:{premium:999,deposit:500,rent:50}}),filters),false);
  assert.equal(matchesListing(store({costsManwon:{premium:1000,deposit:501,rent:50}}),filters),false);
});

test('zero is a real amount; unknown, null and display strings never become zero',()=>{
  const filters=state({premium:{min:0,max:0}});
  assert.equal(matchesListing(store({costsManwon:{premium:0}}),filters),true);
  for (const premium of [null,undefined,'0','0만 원','협의',NaN,Infinity,-1]) {
    assert.equal(matchesListing(store({costsManwon:{premium}}),filters),false,String(premium));
  }
  assert.equal(matchesListing(store({costsManwon:undefined,premium:'0만 원'}),filters),false);
  assert.equal(matchesListing(store({costsManwon:undefined}),createFilterState()),true);
});

test('one-sided bounds work and store ranges exclude equipment',()=>{
  assert.equal(matchesListing(store(),state({rent:{min:50}})),true);
  assert.equal(matchesListing(store(),state({rent:{max:49}})),false);
  const equipment=store({type:'equipment'});
  assert.equal(matchesListing(equipment,createFilterState()),true);
  assert.equal(matchesListing(equipment,state({rent:{min:0}})),false);
  assert.equal(matchesListing(store(),createFilterState('equipment')),false);
});

test('normalization sanitizes corrupt saved state and canonicalizes regions',()=>{
  for (const invalid of [null,[],false,'bad']) assert.deepEqual(normalizeFilterState(invalid),createFilterState());
  const filters=normalizeFilterState({regions:['경기','서울','서울','없는 곳',null],q:{toString:()=> 'bad'},type:'oops',sort:'oops',premium:{min:'0',max:'1000'},deposit:{min:'협의',max:Infinity},rent:{min:false,max:{}}});
  assert.deepEqual(filters.regions,['서울','경기']);
  assert.deepEqual(filters.premium,{min:0,max:1000});
  assert.deepEqual(filters.deposit,{min:null,max:null});
  assert.deepEqual(filters.rent,{min:null,max:null});
  assert.equal(filters.type,'all');assert.equal(filters.sort,'default');assert.equal(filters.q,'');
});

test('negative and reversed finite ranges stay visible as validation errors',()=>{
  const filters=state({premium:{min:'2000',max:'1000'},rent:{min:'-1'}});
  assert.deepEqual(filters.premium,{min:2000,max:1000});
  assert.deepEqual(validateFilterState(filters).map(error=>error.field),['premium','rent']);
  assert.equal(matchesListing(store(),filters),false);
  for (const invalid of [NaN,Infinity,'x',true,{}]) assert.equal(validateFilterState({deposit:{min:invalid,max:null}}).length,1);
  assert.equal(validateFilterState(createFilterState()).length,0);
});

test('legacy URLs, repeated regions and comma-separated regions parse consistently',()=>{
  assert.equal(parseFilterQuery('?utm_source=x').present,false);
  assert.equal(parseFilterQuery('?filters=1').present,true);
  assert.deepEqual(parseFilterQuery('?region=서울').state.regions,['서울']);
  assert.deepEqual(parseFilterQuery('?region=경기,서울&region=인천&region=서울').state.regions,['서울','경기','인천']);
  const invalid=parseFilterQuery('?type=unexpected&sort=random&premiumMin=abc&rentMax=-3');
  assert.equal(invalid.present,true);assert.equal(invalid.state.premium.min,null);
  assert.equal(validateFilterState(invalid.state)[0].field,'rent');
});

test('serialized filters round-trip, including zero and explicit empty state',()=>{
  const original=state({type:'store',q:'강서구 성인피시방',regions:['서울','경기'],premium:{min:0,max:1000},deposit:{max:500},rent:{min:50,max:100},sort:'rent-low'});
  const query=serializeFilterQuery(original);
  assert.ok(query.startsWith('filters=1'));
  assert.equal(new URLSearchParams(query).getAll('region').length,2);
  assert.deepEqual(parseFilterQuery(query).state,original);
  assert.equal(serializeFilterQuery(createFilterState()),'filters=1');
  assert.deepEqual(parseFilterQuery('filters=1').state,createFilterState());
});

test('category pages can lock their type for URL and saved state',()=>{
  const options={initialType:'store',lockedType:true};
  assert.equal(parseFilterQuery('?type=equipment',options).state.type,'store');
  assert.equal(normalizeFilterState({type:'equipment'},options).type,'store');
  assert.equal(normalizeFilterState({type:'equipment'},{initialType:'store'}).type,'equipment');
  const query=serializeFilterQuery(createFilterState('store'),{initialType:'store'});
  assert.equal(query,'filters=1');
  assert.equal(parseFilterQuery(query,options).state.type,'store');
});

test('Korean PC aliases retain existing keyword behavior across listing text fields',()=>{
  for (const query of ['성인PC','성인피시','성인피씨','성인피시방매물','피씨방팝니다','PC방매매']) assert.equal(normalizeSearch(query),'매장',query);
  assert.equal(normalizeSearch('PC방 중고장터'),'중고');
  assert.equal(matchesListing(store(),state({q:'서울 성인피시방'})),true);
  assert.equal(matchesListing(store(),state({q:'강서구 운영'})),true);
  assert.equal(matchesListing(store(),state({q:'서울 부산'})),false);
  assert.equal(matchesListing(store({type:'equipment',spec:'SSD 512GB'}),state({q:'ssd 512gb'})),true);
});

test('numeric price sorting is stable, immutable, and puts unknown prices last in both directions',()=>{
  const listings=[store({id:'unknown',priceManwon:null}),store({id:'high',priceManwon:100}),store({id:'zero',priceManwon:0}),store({id:'tie',priceManwon:100}),store({id:'display',priceManwon:undefined,price:'1만 원'})];
  const ids=sort=>sortListings(listings,sort).map(listing=>listing.id);
  assert.deepEqual(ids('low'),['zero','high','tie','unknown','display']);
  assert.deepEqual(ids('high'),['high','tie','zero','unknown','display']);
  assert.deepEqual(ids('default'),listings.map(listing=>listing.id));
  assert.notEqual(sortListings(listings,'default'),listings);
  assert.equal(listings[0].id,'unknown');
});

test('rent and newest sorts keep missing, invalid and inapplicable values last',()=>{
  const listings=[store({id:'unknown',date:'not-a-date',costsManwon:{rent:null}}),store({id:'equipment',type:'equipment',date:'2026-10-01',costsManwon:{rent:0}}),store({id:'latest',date:'2026-10-09',costsManwon:{rent:50}}),store({id:'older',date:'2026-10-08',costsManwon:{rent:0}}),store({id:'invalid',date:'2026-02-30',costsManwon:{rent:'10'}})];
  assert.deepEqual(sortListings(listings,'rent-low').map(listing=>listing.id),['older','latest','unknown','equipment','invalid']);
  assert.deepEqual(sortListings(listings,'newest').map(listing=>listing.id),['latest','older','equipment','unknown','invalid']);
});
