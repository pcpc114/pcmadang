const CATEGORIES = new Set(['all', 'popular', 'slot', 'classic', 'megaways', 'saved']);
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlotState(input = {}) {
  const rawPage = String(input.page ?? '1');
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return {
    q: typeof input.q === 'string' ? input.q.trim().slice(0, 100) : '',
    category: CATEGORIES.has(input.category) ? input.category : 'all',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function parseSlotQuery(search = '') {
  const params = new URLSearchParams(search);
  return normalizeSlotState({q: params.get('q'), category: params.get('category'), page: params.get('page')});
}

export function serializeSlotQuery(input, search = '') {
  const state = normalizeSlotState(input);
  const params = new URLSearchParams(search);
  for (const field of ['q', 'category', 'page']) params.delete(field);
  if (state.q) params.set('q', state.q);
  if (state.category !== 'all') params.set('category', state.category);
  if (state.page > 1) params.set('page', String(state.page));
  const result = params.toString();
  return result ? `?${result}` : '';
}

function searchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[^\p{L}\p{N}]/gu, '');
}

export function filterSlotGames(games, input, saved = new Set()) {
  const state = normalizeSlotState(input);
  const terms = state.q.split(/\s+/u).map(searchText).filter(Boolean);
  return games.filter(game => {
    if (state.category === 'saved' && !saved.has(game.slug)) return false;
    if (state.category !== 'all' && state.category !== 'saved' && game.category !== state.category) return false;
    const haystack = searchText(game.search ?? `${game.ko ?? ''} ${game.name ?? ''}`);
    return terms.every(term => haystack.includes(term));
  });
}

export function paginateSlots(games, requestedPage = 1, pageSize = 24) {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 24;
  const pages = Math.max(1, Math.ceil(games.length / size));
  const page = Math.min(pages, normalizeSlotState({page: requestedPage}).page);
  const offset = (page - 1) * size;
  return {page, pages, total: games.length, start: games.length ? offset + 1 : 0,
    end: Math.min(offset + size, games.length), games: games.slice(offset, offset + size)};
}

export function normalizeSlotIndex(input) {
  if (!Array.isArray(input)) throw new Error('게임 목록 형식이 올바르지 않습니다.');
  const slugs = new Set();
  return input.map(game => {
    if (!game || typeof game !== 'object' || typeof game.slug !== 'string' ||
        !VALID_SLUG.test(game.slug) || game.slug.length > 120 || slugs.has(game.slug) ||
        typeof game.name !== 'string' || !game.name.trim() ||
        typeof game.ko !== 'string' || !game.ko.trim() ||
        !['popular', 'slot', 'classic', 'megaways'].includes(game.category) ||
        typeof game.image !== 'string' || !(/^(?:\/(?!\/)|https:\/\/)/u.test(game.image))) {
      throw new Error('게임 목록에 사용할 수 없는 항목이 있습니다.');
    }
    if (game.image.startsWith('https://')) {
      const image = new URL(game.image);
      if (image.protocol !== 'https:' || image.username || image.password) throw new Error('게임 이미지 주소가 올바르지 않습니다.');
    }
    slugs.add(game.slug);
    return {slug: game.slug, name: game.name.trim(), ko: game.ko.trim(), category: game.category, image: game.image};
  });
}

export function parseSlotFavorites(raw) {
  try {
    const values = JSON.parse(raw ?? '[]');
    return new Set(Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.length <= 120 && VALID_SLUG.test(value)) : []);
  } catch { return new Set(); }
}

// Both hosts were observed in reference/official free-demo iframe sources.
export function validateSlotDemoUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    // These three exact demo endpoints were read from their official game pages.
    if([
      'https://prelive-gs1.pragmaticplaylive.net/api/bigBassDemo',
      'https://prelive-gs1.pragmaticplaylive.net/api/spacemanDemo',
      'https://prelive-gs1.pragmaticplaylive.net/api/crashGamesDemo?operatorGameId=2201',
    ].includes(url.href))return url.href;
    if (url.protocol !== 'https:' || !['demogamesfree-asia.pragmaticplay.net','demogamesfree.pragmaticplay.net'].includes(url.hostname) ||
        url.port || url.username || url.password || url.pathname !== '/gs2c/openGame.do') return null;
    const symbols = url.searchParams.getAll('gameSymbol');
    if (symbols.length !== 1 || !/^[a-zA-Z0-9_]{1,80}$/.test(symbols[0])) return null;
    return url.href;
  } catch { return null; }
}
