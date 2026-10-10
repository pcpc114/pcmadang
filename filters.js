import {createFilterState, normalizeFilterState, validateFilterState, matchesListing, sortListings, parseFilterQuery, serializeFilterQuery} from './filter-core.js';

const fields = {premium: '권리금', deposit: '보증금', rent: '월세'};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => Number(value).toLocaleString('ko-KR', {maximumFractionDigits: 4});
const hasRange = range => range.min !== null || range.max !== null;

export function initListingFilters({listings, toast, showLink}) {
  const market = document.querySelector('#market');
  if (!market) return {reset() {}};
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const form = $('#advanced-filter-form'), grid = $('#listing-grid');
  const initialType = grid.dataset.initial || 'all';
  const options = {initialType, lockedType: initialType !== 'all'};
  const storageKey = `madang.filters.${initialType === 'equipment' ? 'equipment' : 'store'}.v1`;
  const cards = new Map([...grid.querySelectorAll('[data-listing]')].map(card => [card.dataset.listing, card]));
  const entries = listings.filter(listing => cards.has(listing.id));
  let state = createFilterState(initialType);

  function adapt(candidate) {
    const next = normalizeFilterState(candidate, options);
    // A hidden store-only constraint must never hide equipment results.
    if (next.type === 'equipment') {
      for (const field of Object.keys(fields)) next[field] = {min: null, max: null};
      if (next.sort === 'rent-low') next.sort = 'default';
    }
    return next;
  }
  function readStored() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const candidate = adapt(stored || createFilterState(initialType));
      return validateFilterState(candidate).length ? createFilterState(initialType) : candidate;
    } catch { return createFilterState(initialType); }
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      $('#filter-storage-note').textContent = '필터 설정은 이 브라우저에 저장됩니다.';
    } catch {
      $('#filter-storage-note').textContent = '브라우저 저장소를 사용할 수 없어 현재 화면에서만 적용됩니다. 조건 링크로 보관할 수 있습니다.';
    }
  }
  function queryState() {
    const parsed = parseFilterQuery(location.search, options);
    const candidate = adapt(parsed.state);
    const invalid = validateFilterState(candidate).length > 0;
    return {present: parsed.present, invalid, state: invalid ? createFilterState(initialType) : candidate};
  }
  const initial = queryState();
  state = initial.present ? initial.state : readStored();

  function fromForm() {
    const candidate = {...state, regions: [...form.querySelectorAll('[name="regions"]:checked')].map(input => input.value)};
    const amount = name => { const input = form.elements.namedItem(name); return input.value === '' ? null : input.valueAsNumber; };
    for (const field of Object.keys(fields)) candidate[field] = {min: amount(field + 'Min'), max: amount(field + 'Max')};
    return adapt(candidate);
  }
  function clearErrors() {
    $('#filter-error').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  }
  function reportErrors(candidate) {
    clearErrors();
    if (!form.checkValidity() || validateFilterState(candidate).length) $('#advanced-filters').open = true;
    if (!form.reportValidity()) return true;
    const errors = validateFilterState(candidate);
    if (!errors.length) return false;
    $('#filter-error').textContent = errors.map(error => error.message).join(' ');
    $('#filter-error').hidden = false;
    for (const error of errors) {
      for (const bound of ['Min', 'Max']) form.elements.namedItem(error.field + bound)?.setAttribute('aria-invalid', 'true');
    }
    form.elements.namedItem(errors[0].field + 'Min')?.focus();
    return true;
  }
  function preview() {
    const draft = fromForm();
    $('[data-clear-regions]').setAttribute('aria-pressed', String(draft.regions.length === 0));
    const valid = form.checkValidity() && !validateFilterState(draft).length;
    $('#filter-apply').textContent = valid ? `예시 매물 ${entries.filter(listing => matchesListing(listing, draft)).length}개 보기` : '금액 조건 확인';
    $$('[data-preset-field]').forEach(button => {
      const range = draft[button.dataset.presetField];
      button.setAttribute('aria-pressed', String(range.min === Number(button.dataset.min) && range.max === Number(button.dataset.max)));
    });
  }
  function syncForm() {
    form.querySelectorAll('[name="regions"]').forEach(input => { input.checked = state.regions.includes(input.value); });
    for (const field of Object.keys(fields)) {
      for (const [bound, suffix] of [['min','Min'],['max','Max']]) form.elements.namedItem(field + suffix).value = state[field][bound] ?? '';
    }
    const equipment = state.type === 'equipment';
    $('#filter-summary-hint').textContent = equipment ? '지역 조건' : '지역·금액 조건';
    $('#store-cost-filters').hidden = equipment;
    $('#store-cost-filters').querySelectorAll('input,button').forEach(input => { input.disabled = equipment; });
    $('#search-input').value = state.q;
    $('#search-type').value = state.type;
    $('#sort-filter').value = state.sort;
    const rentSort = $('#sort-filter').querySelector('[value="rent-low"]');
    if (rentSort) { rentSort.hidden = equipment; rentSort.disabled = equipment; }
    $$('[data-filter]').forEach(button => {
      const selected = button.dataset.filter === state.type;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('selected', selected);
    });
    clearErrors();
    preview();
  }
  function renderChips() {
    const chips = [];
    const add = (label, key, value = '') => chips.push(`<button type="button" class="active-filter-chip" data-remove-filter="${key}" data-value="${esc(value)}" aria-label="${esc(label)} 조건 해제">${esc(label)}<span aria-hidden="true">×</span></button>`);
    for (const region of state.regions) add(region, 'region', region);
    for (const [field,label] of Object.entries(fields)) {
      const range = state[field];
      if (!hasRange(range)) continue;
      const text = range.min === null ? `${money(range.max)}만원 이하` : range.max === null ? `${money(range.min)}만원 이상` : `${money(range.min)}~${money(range.max)}만원`;
      add(`${label} ${text}`, field);
    }
    if (state.q) add(`검색: ${state.q}`, 'q');
    if (initialType === 'all' && state.type !== 'all') add(state.type === 'store' ? '점포 매물' : 'PC·집기', 'type');
    const sortLabels = {low:'가격 낮은순',high:'가격 높은순','rent-low':'월세 낮은순',newest:'최신 등록순'};
    if (state.sort !== 'default') add(sortLabels[state.sort], 'sort');
    $('#active-filter-chips').innerHTML = chips.join('');
    $('#filter-selection-bar').hidden = !chips.length;
    $('#filter-active-count').textContent = chips.length ? `${chips.length}` : '';
    $('#clear-filters').hidden = !chips.length;
  }
  function renderResults() {
    const sorted = sortListings(entries, state.sort);
    let count = 0;
    for (const listing of sorted) {
      const card = cards.get(listing.id);
      const match = matchesListing(listing, state);
      card.hidden = !match;
      if (match) count++;
      grid.appendChild(card);
    }
    $('#result-count').textContent = count;
    $('#listing-grid').hidden = !count;
    $('#empty-state').hidden = count > 0;
    const emptyHeading = $('#empty-state h3');
    if (emptyHeading) emptyHeading.textContent = entries.length ? '조건에 맞는 매물이 없습니다.' : '아직 등록된 매물이 없습니다.';
    $('#filter-results-status').textContent = `예시 매물 ${entries.length}개 중 ${count}개 표시`;
    renderChips();
  }
  function urlFor(candidate, pathname = location.pathname) {
    return `${pathname}?${serializeFilterQuery(candidate, {initialType})}#market`;
  }
  function updateHistory(replace = false) {
    const next = urlFor(state);
    if (location.pathname + location.search + location.hash === next) return;
    try { history[replace ? 'replaceState' : 'pushState'](null, '', next); } catch { /* Filtering still works if history is unavailable. */ }
  }
  function commit(candidate, {historyUpdate = true} = {}) {
    state = adapt(candidate);
    syncForm();
    renderResults();
    persist();
    if (historyUpdate) updateHistory();
  }
  function reset() { commit(createFilterState(initialType)); }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const candidate = fromForm();
    if (reportErrors(candidate)) return;
    commit(candidate);
    $('#advanced-filters').open = false;
    $('#advanced-filters summary').focus({preventScroll: true});
    $('#result-count').closest('.result-bar').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest'});
  });
  form.addEventListener('input', () => { clearErrors(); preview(); });
  form.addEventListener('change', preview);
  $$('[data-preset-field]').forEach(button => button.addEventListener('click', () => {
    const field = button.dataset.presetField;
    const selected = button.getAttribute('aria-pressed') === 'true';
    form.elements.namedItem(field + 'Min').value = selected ? '' : button.dataset.min;
    form.elements.namedItem(field + 'Max').value = selected ? '' : button.dataset.max;
    clearErrors(); preview();
  }));
  $('[data-clear-regions]').addEventListener('click', () => {
    form.querySelectorAll('[name="regions"]').forEach(input => { input.checked = false; });
    preview();
  });
  $$('[data-filter-reset]').forEach(button => button.addEventListener('click', reset));
  $('#clear-filters').addEventListener('click', reset);
  $('#active-filter-chips').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-filter]');
    if (!button) return;
    const candidate = {...state};
    const key = button.dataset.removeFilter;
    if (key === 'region') candidate.regions = state.regions.filter(region => region !== button.dataset.value);
    else if (Object.hasOwn(fields, key)) candidate[key] = {min:null,max:null};
    else if (key === 'q') candidate.q = '';
    else if (key === 'type') candidate.type = initialType;
    else if (key === 'sort') candidate.sort = 'default';
    commit(candidate);
    $('#advanced-filters summary').focus({preventScroll: true});
  });
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => commit({...state, type: button.dataset.filter})));
  $('#sort-filter').addEventListener('change', event => {
    const candidate = {...fromForm(), sort: event.target.value};
    if (reportErrors(candidate)) { event.target.value = state.sort; return; }
    commit(candidate);
  });
  $('#search-form').addEventListener('submit', event => {
    event.preventDefault();
    const type = $('#search-type').value;
    const candidate = adapt({...fromForm(), q: $('#search-input').value.trim()});
    if (type !== 'equipment' && reportErrors(candidate)) return;
    if (initialType !== 'all' && type !== initialType) {
      const target = type === 'all' ? '/' : type === 'store' ? '/stores/' : '/equipment/';
      const next = {...candidate, type};
      if (type === 'equipment') for (const key of Object.keys(fields)) next[key] = {min:null,max:null};
      location.href = urlFor(next, target);
      return;
    }
    commit({...candidate, type});
  });
  $('#copy-filter-link').addEventListener('click', async () => {
    const url = new URL(urlFor(state), location.origin).href;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      toast('현재 적용된 조건의 링크를 복사했습니다.');
    } catch { showLink(url); }
  });
  window.addEventListener('popstate', () => {
    const parsed = queryState();
    commit(parsed.present ? parsed.state : createFilterState(initialType), {historyUpdate: false});
    if (parsed.invalid) toast('링크의 금액 범위가 올바르지 않아 필터를 초기화했습니다.');
  });
  syncForm(); renderResults(); persist();
  if (initial.invalid) toast('링크의 금액 범위가 올바르지 않아 필터를 초기화했습니다.');
  if (!initial.present && (state.regions.length || state.q || Object.keys(fields).some(key => hasRange(state[key])) || state.sort !== 'default' || state.type !== initialType)) updateHistory(true);
  return {reset};
}
