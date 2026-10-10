import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSlotQuery, serializeSlotQuery, filterSlotGames, paginateSlots, parseSlotFavorites, validateSlotDemoUrl, normalizeSlotIndex} from '../slot-core.js';

const games = [
  {slug: '5-lions-dance', ko: '5 라이온스 댄스', name: '5 Lions Dance', category: 'slot'},
  {slug: 'starz-megaways', ko: '스타즈 메가웨이즈', name: 'Starz Megaways', category: 'megaways'},
  {slug: 'master-joker', ko: '마스터 조커', name: 'Master Joker', category: 'classic'},
];

test('slot query preserves unrelated parameters and normalizes invalid categories/pages', () => {
  assert.deepEqual(parseSlotQuery('?category=unknown&page=-3&q=%20jOkEr%20'), {q: 'jOkEr', category: 'all', page: 1});
  assert.equal(serializeSlotQuery({q: '조커', category: 'classic', page: 2}, '?campaign=one&page=4&q=old'), '?campaign=one&q=%EC%A1%B0%EC%BB%A4&category=classic&page=2');
  assert.deepEqual(parseSlotQuery(serializeSlotQuery({q: '댄스', category: 'slot', page: 3})), {q: '댄스', category: 'slot', page: 3});
  assert.equal(parseSlotQuery('?page=1e2').page, 1);
  assert.equal(parseSlotQuery('?page=9007199254740992').page, 1);
});

test('slot search combines Korean/English text, type, and saved filter', () => {
  assert.deepEqual(filterSlotGames(games, {q: 'LIONS dance'}).map(game => game.slug), ['5-lions-dance']);
  assert.equal(filterSlotGames(games, {q: '라이온스댄스'}).length, 1);
  assert.equal(filterSlotGames(games, {q: 'joker', category: 'slot'}).length, 0);
  assert.deepEqual(filterSlotGames(games, {category: 'saved'}, new Set(['master-joker'])), [games[2]]);
  assert.deepEqual(filterSlotGames(games, {q: 'dance', category: 'saved'}, new Set(['master-joker'])), []);
});

test('pagination clamps a stale URL or removed favorite to an existing page', () => {
  const inventory = Array.from({length: 48}, (_, index) => index);
  assert.deepEqual(paginateSlots(inventory, 2), {page: 2, pages: 2, total: 48, start: 25, end: 48, games: inventory.slice(24)});
  assert.equal(paginateSlots(inventory.slice(0, 3), 999).page, 1);
  assert.deepEqual(paginateSlots([], 2), {page: 1, pages: 1, total: 0, start: 0, end: 0, games: []});
});

test('all 666 games remain searchable and the 28th page contains the final 18', () => {
  const inventory = normalizeSlotIndex(Array.from({length: 666}, (_, number) => ({
    slug: `game-${number + 1}`, ko: `게임 ${number + 1}`, name: `Game ${number + 1}`,
    category: 'slot', image: `/assets/slots/game-${number + 1}.png`,
  })));
  const last = paginateSlots(inventory, 28);
  assert.equal(last.pages, 28);
  assert.equal(last.start, 649);
  assert.equal(last.end, 666);
  assert.equal(last.games.length, 18);
  assert.equal(last.games[17].slug, 'game-666');
  assert.equal(paginateSlots(inventory, 999).page, 28);
  assert.equal(filterSlotGames(inventory, {q: 'game666'})[0].slug, 'game-666');
  assert.equal(paginateSlots(filterSlotGames(inventory, {category: 'saved'}, new Set(['game-666'])), 28).page, 1);
});

test('compact index rejects duplicate slugs and executable image URLs', () => {
  const game = {...games[0], image: '/assets/slots/5-lions-dance.png'};
  assert.equal(normalizeSlotIndex([game])[0].name, game.name);
  assert.throws(() => normalizeSlotIndex([game, game]));
  assert.throws(() => normalizeSlotIndex([{...game, image: 'javascript:alert(1)'}]));
  assert.throws(() => normalizeSlotIndex([{...game, image: '//unknown.example/image.png'}]));
  assert.throws(() => normalizeSlotIndex([{...game, slug: '../outside'}]));
  assert.equal(normalizeSlotIndex([{...game, category: 'popular'}])[0].category, 'popular');
  assert.equal(filterSlotGames([{...game, category: 'popular'}], {category: 'popular'}).length, 1);
});

test('favorites reject broken storage without crashing or accepting arbitrary values', () => {
  assert.deepEqual([...parseSlotFavorites('{broken')], []);
  assert.deepEqual([...parseSlotFavorites('{"master-joker":true}')], []);
  assert.deepEqual([...parseSlotFavorites('["master-joker","master-joker",null,42,"<script>"]')], ['master-joker']);
});

test('demo player accepts only observed HTTPS free-demo hosts and exact endpoint', () => {
  const valid = 'https://demogamesfree-asia.pragmaticplay.net/gs2c/openGame.do?lang=ko&cur=KRW&gameSymbol=vs1024lionsd&jurisdiction=99';
  assert.equal(validateSlotDemoUrl(valid), valid);
  const official=valid.replace('demogamesfree-asia.','demogamesfree.');
  assert.equal(validateSlotDemoUrl(official),official);
  const crash='https://prelive-gs1.pragmaticplaylive.net/api/bigBassDemo';
  assert.equal(validateSlotDemoUrl(crash),crash);
  assert.equal(validateSlotDemoUrl(crash+'?redirect=https://example.com'),null);
  assert.equal(validateSlotDemoUrl(crash.replace('bigBassDemo','other')),null);
  assert.equal(validateSlotDemoUrl(crash.replace('bigBassDemo','spacemanDemo')),crash.replace('bigBassDemo','spacemanDemo'));
  const flyer=crash.replace('bigBassDemo','crashGamesDemo?operatorGameId=2201');
  assert.equal(validateSlotDemoUrl(flyer),flyer);
  assert.equal(validateSlotDemoUrl(flyer.replace('2201','2202')),null);
  for (const value of [
    valid.replace('https:', 'http:'), valid.replace('.net', '.net.evil.test'),
    valid.replace('/gs2c/openGame.do', '/other'), valid.replace('https://', 'https://user:secret@'),
    valid.replace('.net/', '.net:444/'), valid.replace('gameSymbol=vs1024lionsd', 'gameSymbol='),
    `${valid}&gameSymbol=duplicate`, 'javascript:alert(1)', null,
  ]) assert.equal(validateSlotDemoUrl(value), null);
});
