const publicationStates = new Set(['sample', 'published', 'draft', 'archived']);
const businesses = Object.freeze({adult: '성인PC방', general: '일반PC방', other: '기타업종 점포'});

function requiredText(listing, field) {
  if (typeof listing[field] !== 'string' || !listing[field].trim()) {
    throw new Error(`Listing ${listing.id || '(unknown)'}: ${field} is required for SEO.`);
  }
  return listing[field].trim();
}

function fact(label, value) {
  return typeof value === 'string' && value.trim() ? `${label} ${value.trim()}` : null;
}

/** Metadata follows the record's explicit publication state, never the template alone. */
export function getListingSeo(listing) {
  if (!listing || !publicationStates.has(listing.publication)) {
    throw new Error('Listing publication must be explicitly sample, published, draft, or archived.');
  }
  const id = requiredText(listing, 'id');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid listing id: ${id}`);
  const originalTitle = requiredText(listing, 'title');
  const region = requiredText(listing, 'region');
  const city = requiredText(listing, 'city');
  const isSample = listing.publication === 'sample';
  const location = region === city ? region : `${region} ${city}`;
  // Existing titles often start with the city. Keep the factual wording without repeating it.
  const titleDetail = originalTitle.startsWith(`${city} · `) ? originalTitle.slice(city.length + 3) : originalTitle;
  let subject, parents, facts;
  if (listing.type === 'store') {
    const business = Object.hasOwn(businesses, listing.business) ? businesses[listing.business] : undefined;
    if (!business) throw new Error(`Listing ${id}: business must be adult, general, or other.`);
    subject = `${business} ${listing.business === 'other' ? '양도' : '매매'}`;
    parents = [{name: 'PC방 팝니다', pathname: '/stores/'}, {name: business, pathname: `/stores/${listing.business}/`}];
    facts = [fact('면적', listing.area), fact('보증금', listing.deposit), fact('월세', listing.rent), fact('권리금', listing.premium)];
  } else if (listing.type === 'equipment') {
    subject = `${requiredText(listing, 'category')} 중고 판매`;
    parents = [{name: '중고장터', pathname: '/equipment/'}, {name: '판매', pathname: '/equipment/sell/'}];
    facts = [fact('수량', listing.quantity), fact('사양', listing.spec), fact('가격', listing.price), fact('판매 단위', listing.priceNote)];
  } else {
    throw new Error(`Listing ${id}: type must be store or equipment.`);
  }
  const title = `${isSample ? '예시 · ' : ''}${location} ${subject} · ${titleDetail}`;
  const suffix = {
    sample: '화면 확인용 예시이며 실제 판매 매물이 아닙니다.',
    published: '',
    draft: '공개 전 작성 중인 매물입니다.',
    archived: '보관 상태의 매물입니다.'
  }[listing.publication];
  const description = [title, ...facts.filter(Boolean), suffix].filter(Boolean).join('. ').replace(/\.\.$/, '.');
  // Sample policy belongs to the environment-aware page policy. Local diagnostic
  // mode can inspect the template; this does not publish or relabel sample data.
  const seo = listing.publication === 'published' ? {visibility: 'public'}
    : listing.publication === 'draft' ? {visibility: 'exclude', reason: '작성 중인 비공개 매물입니다.'}
    : listing.publication === 'archived' ? {visibility: 'exclude', reason: '보관 상태의 매물은 검색 대상에서 제외합니다.'}
    : undefined;
  return {
    title, description, isSample, seo,
    breadcrumbs: [
      {name: '성인PC마당', pathname: '/'},
      ...parents,
      {name: `${isSample ? '예시 · ' : ''}${originalTitle}`, pathname: `/listing/${id}/`}
    ]
  };
}
