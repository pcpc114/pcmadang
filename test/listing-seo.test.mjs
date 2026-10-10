import assert from 'node:assert/strict';
import test from 'node:test';
import {getListingSeo} from '../listing-seo.mjs';

const store = Object.freeze({
  id: 'store-test', type: 'store', business: 'adult', publication: 'sample',
  region: '서울', city: '강서구', title: '강서구 · 좌석 배치가 여유로운 매장',
  area: '99㎡', deposit: '2,000만 원', rent: '150만 원 / 월', premium: '3,500만 원'
});

test('sample metadata preserves its status, factual fields and exact category hierarchy', () => {
  const result = getListingSeo(store);
  assert.equal(result.title, '예시 · 서울 강서구 성인PC방 매매 · 좌석 배치가 여유로운 매장');
  assert.match(result.description, /보증금 2,000만 원/);
  assert.match(result.description, /월세 150만 원 \/ 월/);
  assert.match(result.description, /권리금 3,500만 원/);
  assert.match(result.description, /실제 판매 매물이 아닙니다/);
  assert.equal(result.isSample, true);
  assert.equal(result.seo, undefined);
  assert.deepEqual(result.breadcrumbs.map(item => item.pathname), ['/', '/stores/', '/stores/adult/', '/listing/store-test/']);
  assert.equal(store.publication, 'sample');
});

test('published listings explicitly request public indexing without sample claims', () => {
  const result = getListingSeo({...store, publication: 'published'});
  assert.deepEqual(result.seo, {visibility: 'public'});
  assert.equal(result.isSample, false);
  assert.doesNotMatch(result.title + result.description, /예시|실제 판매 매물이 아닙니다|인증|검증 완료/);
});

test('draft and archived records stay excluded independently of the template environment', () => {
  for (const publication of ['draft', 'archived']) {
    const result = getListingSeo({...store, publication});
    assert.equal(result.seo.visibility, 'exclude');
    assert.ok(result.seo.reason.length > 0);
    assert.equal(result.isSample, false);
  }
});

test('missing or unrecognized publication cannot silently become an indexed record', () => {
  for (const publication of [undefined, null, '', 'public', 'live']) {
    assert.throws(() => getListingSeo({...store, publication}), /publication must be explicitly/);
  }
});

test('store business determines truthful metadata and category destination', () => {
  for (const [business, expected] of [['general', '일반PC방 매매'], ['other', '기타업종 점포 양도']]) {
    const result = getListingSeo({...store, business});
    assert.ok(result.title.includes(expected));
    assert.equal(result.breadcrumbs[2].pathname, `/stores/${business}/`);
  }
  assert.throws(() => getListingSeo({...store, business: undefined}), /business must be/);
  assert.throws(() => getListingSeo({...store, business: 'toString'}), /business must be/);
});

test('equipment uses sale hierarchy and supplied specifications without invented shop facts', () => {
  const result = getListingSeo({
    id: 'equipment-test', type: 'equipment', publication: 'published',
    region: '경기', city: '부천시', category: 'PC 본체', title: '메모리 16GB PC 본체 12대',
    quantity: '12대', spec: '메모리 16GB / SSD 512GB', price: '360만 원', priceNote: '12대 일괄'
  });
  assert.match(result.title, /경기 부천시 PC 본체 중고 판매/);
  assert.match(result.description, /메모리 16GB \/ SSD 512GB/);
  assert.match(result.description, /가격 360만 원/);
  assert.doesNotMatch(result.description, /보증금|월세|수익|인증/);
  assert.deepEqual(result.breadcrumbs.map(item => item.pathname), ['/', '/equipment/', '/equipment/sell/', '/listing/equipment-test/']);
});

test('missing identity and malformed route data fail instead of producing unusable URLs', () => {
  assert.throws(() => getListingSeo({...store, id: '../private'}), /Invalid listing id/);
  assert.throws(() => getListingSeo({...store, title: ''}), /title is required/);
  assert.throws(() => getListingSeo({...store, region: ''}), /region is required/);
  assert.throws(() => getListingSeo({...store, type: 'unknown'}), /type must be/);
});
