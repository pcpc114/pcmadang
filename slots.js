import {normalizeSlotState, parseSlotQuery, serializeSlotQuery, filterSlotGames, paginateSlots, parseSlotFavorites, validateSlotDemoUrl, normalizeSlotIndex} from './slot-core.js';

const FAVORITES_KEY = 'pc-madang-slot-favorites-v1';

export function initSlots() {
  const catalogue = document.querySelector('#slot-catalogue');
  const player = document.querySelector('#slot-player');
  if (!catalogue && !player) return;
  const root = catalogue || player;
  if (root.dataset.slotInitialized) return;
  root.dataset.slotInitialized = 'true';

  let saved;
  try { saved = parseSlotFavorites(localStorage.getItem(FAVORITES_KEY)); } catch { saved = new Set(); }
  let refreshCatalogue = () => {};
  const announce = message => {
    const status = document.querySelector('#slot-page-summary, #slot-player-status');
    if (status) status.textContent = message;
  };
  const updateSavedButtons = () => {
    document.querySelectorAll('button[data-slot-save]').forEach(button => {
      button.setAttribute('aria-pressed', String(saved.has(button.dataset.slotSave)));
    });
  };
  updateSavedButtons();

  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-slot-save]');
    if (!button) return;
    event.preventDefault();
    const slug = button.dataset.slotSave;
    if (saved.has(slug)) saved.delete(slug); else saved.add(slug);
    let stored = true;
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...saved])); } catch { stored = false; }
    updateSavedButtons();
    refreshCatalogue();
    announce(stored ? (saved.has(slug) ? '즐겨찾기에 저장했습니다.' : '즐겨찾기에서 삭제했습니다.') : '브라우저 저장 공간을 사용할 수 없어 이번 화면에서만 적용됩니다.');
  });
  window.addEventListener('storage', event => {
    if (event.key !== FAVORITES_KEY && event.key !== null) return;
    saved = event.key === null ? new Set() : parseSlotFavorites(event.newValue);
    updateSavedButtons();
    refreshCatalogue();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    // A detail page can change favorites while this catalogue lives in the back/forward cache.
    try { saved = parseSlotFavorites(localStorage.getItem(FAVORITES_KEY)); } catch { return; }
    updateSavedButtons();
    refreshCatalogue();
  });

  if (catalogue) {
    const form = catalogue.querySelector('#slot-search-form');
    const input = catalogue.querySelector('#slot-search');
    const grid = catalogue.querySelector('#slot-grid');
    const template = document.querySelector('#slot-card-template');
    const pagination = catalogue.querySelector('#slot-pagination');
    const categories = [...catalogue.querySelectorAll('button[data-slot-category]')];
    const empty = catalogue.querySelector('#slot-empty');
    const count = catalogue.querySelector('#slot-result-count');
    const range = catalogue.querySelector('#slot-visible-range');
    const originalRange = range?.textContent || '';
    const loadStatus = catalogue.querySelector('#slot-search-load-status, #slot-load-status');
    const loadRetry = catalogue.querySelector('[data-slot-load-retry]');
    const pageSize = Number(catalogue.dataset.slotPageSize) || 24;
    const serverPage = Math.max(1, Number(catalogue.dataset.slotCurrentPage) || 1);
    const totalGames = Number(catalogue.dataset.slotTotal) || grid?.querySelectorAll('[data-slot-card]').length || 0;
    const originalCards = [...(grid?.childNodes || [])];
    const originalPagination = [...(pagination?.childNodes || [])];
    const originalPaginationHidden = pagination?.hidden ?? true;
    let state = parseSlotQuery(location.search);
    let searchTimer;
    let editingSearch = false;
    let index;
    let indexPromise;
    let revision = 0;
    let filteredView = false;

    function setLoadStatus(message, retry = false) {
      if (loadStatus) loadStatus.textContent = message;
      if (loadRetry) loadRetry.hidden = !retry;
    }
    function updateControls(syncInput = true) {
      if (syncInput && input) input.value = state.q;
      categories.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.slotCategory === state.category)));
    }
    function restoreCatalogue() {
      grid?.replaceChildren(...originalCards);
      pagination?.replaceChildren(...originalPagination);
      if (pagination) pagination.hidden = originalPaginationHidden;
      if (empty) empty.hidden = true;
      if (count) count.textContent = String(totalGames);
      if (range) range.textContent = originalRange;
      catalogue.removeAttribute('aria-busy');
      filteredView = false;
      updateSavedButtons();
      setLoadStatus('');
      const first = totalGames ? (serverPage - 1) * pageSize + 1 : 0;
      announce(`게임 ${totalGames}개 중 ${first}~${Math.min(serverPage * pageSize, totalGames)}번째, ${serverPage}/${Math.max(1, Math.ceil(totalGames / pageSize))}페이지`);
    }
    async function loadIndex() {
      if (index) return index;
      if (!indexPromise) {
        indexPromise = (async () => {
          const indexUrl = new URL(catalogue.dataset.slotIndexUrl || '/slot-index.json', location.origin);
          if (indexUrl.origin !== location.origin) throw new Error('다른 출처의 게임 목록은 불러올 수 없습니다.');
          const abort = new AbortController();
          const timeout = setTimeout(() => abort.abort(), 12000);
          try {
            const response = await fetch(indexUrl, {signal: abort.signal, credentials: 'same-origin', cache: 'no-cache', headers: {Accept: 'application/json'}});
            if (!response.ok) throw new Error('게임 목록 응답을 확인할 수 없습니다.');
            const data = normalizeSlotIndex(await response.json());
            if (data.length !== totalGames) throw new Error('게임 목록이 갱신 중입니다.');
            if (data.length && !template?.content?.querySelector('[data-slot-card]')) throw new Error('게임 카드 양식을 확인할 수 없습니다.');
            index = data;
            return index;
          } finally { clearTimeout(timeout); }
        })().catch(error => { indexPromise = null; throw error; });
      }
      return indexPromise;
    }

    function writeUrl(mode = 'replace') {
      const url = `${location.pathname}${serializeSlotQuery(state, location.search)}${location.hash}`;
      if (url === `${location.pathname}${location.search}${location.hash}`) return;
      try { history[mode === 'push' ? 'pushState' : 'replaceState'](history.state, '', url); } catch { /* Filters still work when history is unavailable. */ }
    }
    function pageButton(label, value, disabled = false, current = false) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.slotPage = String(value);
      button.textContent = label;
      button.disabled = disabled;
      button.setAttribute('aria-label', value === 'prev' ? '이전 게임 목록 페이지' : value === 'next' ? '다음 게임 목록 페이지' : `게임 목록 ${value}페이지`);
      if (current) button.setAttribute('aria-current', 'page');
      return button;
    }
    function createCard(game) {
      const card = template.content.querySelector('[data-slot-card]').cloneNode(true);
      card.dataset.slotSlug = game.slug;
      card.dataset.slotCategory = game.category;
      card.dataset.slotSearch = `${game.ko} ${game.name}`;
      const link = card.querySelector('[data-slot-open], .slot-card-open');
      link.dataset.slotOpen = game.slug;
      link.href = `/games/${game.slug}/`;
      link.setAttribute('aria-label', `${game.ko} 무료슬롯 게임 보기`);
      card.querySelector('.slot-card-name').textContent = game.ko;
      card.querySelector('.slot-card-english').textContent = game.name;
      card.querySelector('.slot-card-type').textContent = {popular: '인기', slot: '슬롯', classic: '클래식', megaways: '메가웨이즈'}[game.category];
      const image = card.querySelector('img');
      image.src = game.image;
      image.alt = game.name;
      image.loading = 'lazy';
      image.removeAttribute('fetchpriority');
      const save = card.querySelector('[data-slot-save]');
      save.dataset.slotSave = game.slug;
      save.setAttribute('aria-label', `${game.ko} 즐겨찾기`);
      save.setAttribute('aria-pressed', String(saved.has(game.slug)));
      return card;
    }
    function renderFiltered() {
      const matches = filterSlotGames(index, state, saved);
      const result = paginateSlots(matches, state.page, pageSize);
      state.page = result.page;
      grid?.replaceChildren(...result.games.map(createCard));
      filteredView = true;
      if (empty) empty.hidden = result.total > 0;
      if (count) count.textContent = String(result.total);
      if (range) range.textContent = `${result.start}–${result.end} / ${result.total}개`;
      if (pagination) {
        const nodes = [pageButton('‹', 'prev', result.page === 1)];
        let previous = 0;
        for (let number = 1; number <= result.pages; number++) {
          if (number !== 1 && number !== result.pages && Math.abs(number - result.page) > 1) continue;
          if (number - previous > 1) {
            const gap = document.createElement('span');
            gap.textContent = '…';
            gap.setAttribute('aria-hidden', 'true');
            nodes.push(gap);
          }
          nodes.push(pageButton(String(number), number, false, number === result.page));
          previous = number;
        }
        nodes.push(pageButton('›', 'next', result.page === result.pages));
        pagination.replaceChildren(...nodes);
        pagination.hidden = result.pages <= 1;
      }
      announce(result.total ? `게임 ${result.total}개 중 ${result.start}~${result.end}번째, ${result.page}/${result.pages}페이지` : '조건에 맞는 게임이 없습니다.');
      writeUrl();
    }
    async function render({historyMode = 'replace', syncInput = true, action = false} = {}) {
      const currentRevision = ++revision;
      updateControls(syncInput);
      if (action && serverPage !== 1) {
        location.assign(`/games/${serializeSlotQuery(state, location.search)}`);
        return;
      }
      if (historyMode) writeUrl(historyMode);
      if (!state.q && state.category === 'all' && state.page === 1) {
        restoreCatalogue();
        return;
      }
      if (serverPage !== 1) {
        location.replace(`/games/${serializeSlotQuery(state, location.search)}`);
        return;
      }
      setLoadStatus(index ? '' : '전체 게임 목록에서 검색하고 있습니다.');
      catalogue.setAttribute('aria-busy', 'true');
      try {
        await loadIndex();
        if (currentRevision !== revision) return;
        renderFiltered();
        setLoadStatus('');
      } catch {
        if (currentRevision !== revision) return;
        setLoadStatus('전체 게임 목록을 불러오지 못했습니다. 현재 목록을 유지했습니다. 다시 시도해 주세요.', true);
      } finally {
        if (currentRevision === revision) catalogue.removeAttribute('aria-busy');
      }
    }
    refreshCatalogue = () => {
      if (filteredView && index && state.category === 'saved') renderFiltered();
    };
    form?.addEventListener('submit', event => {
      event.preventDefault();
      clearTimeout(searchTimer);
      editingSearch = false;
      state = normalizeSlotState({...state, q: input?.value || '', page: 1});
      render({historyMode: 'push', action: true});
    });
    input?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      // A numbered page submits explicitly so typing does not cause a mid-query navigation.
      if (serverPage !== 1) return;
      searchTimer = setTimeout(() => {
        const historyMode = editingSearch ? 'replace' : 'push';
        editingSearch = true;
        state = normalizeSlotState({...state, q: input.value, page: 1});
        render({historyMode, syncInput: false, action: true});
      }, 180);
    });
    input?.addEventListener('blur', () => { editingSearch = false; });
    categories.forEach(button => button.addEventListener('click', () => {
      clearTimeout(searchTimer);
      editingSearch = false;
      state = normalizeSlotState({q: input?.value ?? state.q, category: button.dataset.slotCategory, page: 1});
      render({historyMode: 'push', action: true});
    }));
    catalogue.querySelectorAll('[data-slot-reset]').forEach(button => button.addEventListener('click', () => {
      clearTimeout(searchTimer);
      editingSearch = false;
      state = normalizeSlotState();
      render({historyMode: 'push', action: true});
      input?.focus();
    }));
    loadRetry?.addEventListener('click', () => render());
    pagination?.addEventListener('click', async event => {
      const button = event.target.closest('button[data-slot-page]');
      if (!button || button.disabled) return;
      clearTimeout(searchTimer);
      editingSearch = false;
      const value = button.dataset.slotPage;
      state.page = value === 'prev' ? state.page - 1 : value === 'next' ? state.page + 1 : Number(value);
      await render({historyMode: 'push'});
      pagination.querySelector('[aria-current="page"]')?.focus({preventScroll: true});
      catalogue.querySelector('.slot-section-heading')?.scrollIntoView({block: 'start', behavior: 'auto'});
    });
    window.addEventListener('popstate', () => {
      clearTimeout(searchTimer);
      editingSearch = false;
      state = parseSlotQuery(location.search);
      render();
    });
    render();
  }

  if (player) {
    let game;
    try { game = JSON.parse(document.querySelector('#slot-game-data')?.textContent || '{}').game; } catch { game = null; }
    const demoUrl = validateSlotDemoUrl(game?.demoUrl);
    const start = document.querySelector('[data-slot-start]');
    const retry = document.querySelector('[data-slot-retry]');
    const status = document.querySelector('#slot-player-status');
    const initialStatus = status?.textContent || '';
    const posters = [...player.children];
    let frame;
    let slowTimer;
    const setStatus = message => { if (status) status.textContent = message; };
    const stop = () => {
      clearTimeout(slowTimer);
      if (frame) {
        frame.onload = null;
        frame.onerror = null;
        frame.remove();
        frame = null;
      }
    };
    const launch = () => {
      if (!demoUrl) {
        setStatus('무료 데모 주소를 확인할 수 없습니다.');
        return;
      }
      stop();
      posters.forEach(poster => { poster.hidden = true; });
      frame = document.createElement('iframe');
      frame.className = 'slot-game-frame';
      frame.title = `${game.ko || game.name} 무료 데모`;
      frame.allowFullscreen = true;
      frame.allow = 'fullscreen; autoplay';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.onload = () => {
        clearTimeout(slowTimer);
        setStatus('데모 프레임을 불러왔습니다. 게임 화면이 표시되지 않으면 새 창에서 열기를 이용해 주세요.');
      };
      frame.onerror = () => {
        clearTimeout(slowTimer);
        setStatus('데모를 불러오지 못했습니다. 다시 불러오거나 새 창에서 열어 주세요.');
      };
      frame.src = demoUrl;
      player.append(frame);
      if (retry) retry.hidden = false;
      setStatus('게임사의 무료 데모를 불러오는 중입니다.');
      slowTimer = setTimeout(() => setStatus('화면이 늦게 표시되면 다시 불러오거나 새 창에서 열어 주세요.'), 15000);
    };
    if (start) {
      start.disabled = !demoUrl;
      start.addEventListener('click', launch);
    }
    retry?.addEventListener('click', launch);
    document.querySelector('[data-slot-fullscreen]')?.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (player.requestFullscreen) await player.requestFullscreen();
        else setStatus('이 브라우저는 전체 화면을 지원하지 않습니다. 새 창에서 열기를 이용해 주세요.');
      } catch { setStatus('전체 화면으로 전환하지 못했습니다. 새 창에서 열기를 이용해 주세요.'); }
    });
    window.addEventListener('pagehide', () => {
      stop();
      posters.forEach(poster => { poster.hidden = false; });
      if (retry) retry.hidden = true;
      setStatus(initialStatus);
    });
  }
}

if (typeof document !== 'undefined') initSlots();
