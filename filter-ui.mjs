import { REGIONS } from './filter-core.js';

const PRICE_FIELDS = [
  { field: 'premium', label: '권리금', ranges: [[0, 500], [500, 1000], [1000, 2000]] },
  { field: 'deposit', label: '보증금', ranges: [[0, 500], [500, 1000], [1000, 2000]] },
  { field: 'rent', label: '월세', ranges: [[0, 50], [50, 100], [100, 150]] },
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function priceField({ field, label, ranges }, esc) {
  return `<fieldset class="filter-price-group">
    <legend>${esc(label)}</legend>
    <div class="filter-price-range">
      <label class="filter-amount" for="${field}Min">
        <span class="sr-only">${esc(label)} 최소 금액 (만원)</span>
        <input id="${field}Min" name="${field}Min" type="number" min="0" step="any" inputmode="decimal" placeholder="최소" autocomplete="off">
        <span aria-hidden="true">만원</span>
      </label>
      <span class="filter-range-separator" aria-hidden="true">~</span>
      <label class="filter-amount" for="${field}Max">
        <span class="sr-only">${esc(label)} 최대 금액 (만원)</span>
        <input id="${field}Max" name="${field}Max" type="number" min="0" step="any" inputmode="decimal" placeholder="최대" autocomplete="off">
        <span aria-hidden="true">만원</span>
      </label>
    </div>
    <div class="filter-presets" aria-label="${esc(label)} 빠른 선택">
      ${ranges.map(([min, max]) => `<button type="button" data-preset-field="${field}" data-min="${min}" data-max="${max}" aria-pressed="false">${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')}만</button>`).join('')}
    </div>
  </fieldset>`;
}

export function renderFilters({ mode = 'all', esc = escapeHtml } = {}) {
  return `<section class="filter-panel" aria-label="매물 상세 필터">
    <details id="advanced-filters" class="advanced-filters">
      <summary><svg class="filter-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg><span class="filter-summary-title">필터 <span id="filter-active-count" class="filter-active-count"></span></span><span id="filter-summary-hint" class="sr-only">${mode === 'equipment' ? '지역 조건' : '지역·금액 조건'}</span></summary>
      <form id="advanced-filter-form" class="advanced-filter-form">
        <fieldset class="filter-regions">
          <legend>지역 <span>여러 지역을 함께 선택할 수 있어요</span></legend>
          <div class="filter-region-options">
            <button type="button" class="filter-all-regions" data-clear-regions aria-pressed="true">전체 지역</button>
            ${REGIONS.map(region => `<label class="filter-region-option"><input type="checkbox" name="regions" value="${esc(region)}"><span>${esc(region)}</span></label>`).join('')}
          </div>
        </fieldset>
        <div id="store-cost-filters" class="filter-costs"${mode === 'equipment' ? ' hidden' : ''}>
          <p class="filter-cost-caption">원하는 금액 범위를 입력하거나 아래 구간을 선택하세요.</p>
          <div class="filter-price-grid">${PRICE_FIELDS.map(item => priceField(item, esc)).join('')}</div>
          <p class="filter-cost-note">금액 조건을 선택하면 해당 금액이 입력된 매장 매물만 표시됩니다.</p>
        </div>
        <p id="filter-error" class="filter-error" role="alert" hidden></p>
        <div class="filter-actions">
          <div class="filter-action-meta"><p id="filter-storage-note" class="filter-storage-note">필터 설정은 이 브라우저에 저장됩니다.</p><button id="copy-filter-link" class="filter-copy-link" type="button">조건 링크 복사</button></div>
          <div class="filter-action-buttons"><button type="button" class="btn btn-outline" data-filter-reset>초기화</button><button type="submit" class="btn btn-primary" id="filter-apply">조건 적용</button></div>
        </div>
      </form>
    </details>
    <div id="filter-selection-bar" class="filter-selection-bar" hidden>
      <div id="active-filter-chips" class="active-filter-chips" role="group" aria-label="적용된 필터"></div>
    </div>
    <noscript><p class="filter-noscript">현재 전체 매물을 보여드리고 있습니다. 상세 필터와 조건 저장은 자바스크립트를 켜면 이용할 수 있습니다.</p></noscript>
  </section>`;
}
