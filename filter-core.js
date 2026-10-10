/** Shared, side-effect-free marketplace filtering. All amounts are in 만원. */
export const REGIONS = Object.freeze(['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주']);

const TYPES = new Set(['all','store','equipment']);
const SORTS = new Set(['default','low','high','rent-low','newest']);
const RANGE_LABELS = Object.freeze({premium:'권리금',deposit:'보증금',rent:'월세'});
const RANGE_FIELDS = Object.keys(RANGE_LABELS);
const QUERY_FIELDS = ['filters','q','type','region','sort',...RANGE_FIELDS.flatMap(field=>[`${field}Min`,`${field}Max`])];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isAmount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validType = value => TYPES.has(value) ? value : 'all';

export function createFilterState(initialType='all') {
  return {regions:[],premium:{min:null,max:null},deposit:{min:null,max:null},rent:{min:null,max:null},q:'',type:validType(initialType),sort:'default'};
}

function normalizeBound(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  // Reject display prices, hexadecimal values, booleans and arbitrary objects.
  const text=value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const number=Number(text);
  return Number.isFinite(number) ? number : null;
}

export function normalizeFilterState(input,{initialType='all',lockedType=false}={}) {
  const state=createFilterState(initialType);
  if (!isRecord(input)) return state;
  const requestedRegions=Array.isArray(input.regions) ? input.regions : typeof input.regions==='string' ? input.regions.split(',') : [];
  const regionSet=new Set(requestedRegions.filter(region=>typeof region==='string').map(region=>region.trim()));
  state.regions=REGIONS.filter(region=>regionSet.has(region));
  for (const field of RANGE_FIELDS) {
    const range=isRecord(input[field]) ? input[field] : {};
    state[field]={min:normalizeBound(range.min),max:normalizeBound(range.max)};
  }
  state.q=typeof input.q==='string' ? input.q.trim() : '';
  state.type=lockedType ? state.type : TYPES.has(input.type) ? input.type : state.type;
  state.sort=SORTS.has(input.sort) ? input.sort : 'default';
  return state;
}

export function validateFilterState(state) {
  const errors=[];
  for (const [field,label] of Object.entries(RANGE_LABELS)) {
    const range=state?.[field];
    if (range === undefined) continue;
    if (!isRecord(range)) {
      errors.push({field,message:`${label} 금액을 다시 입력해 주세요.`});
      continue;
    }
    const {min,max}=range;
    if ([min,max].some(value=>value !== null && value !== undefined && !isAmount(value))) {
      errors.push({field,message:`${label}은 0 이상의 숫자로 입력해 주세요.`});
    } else if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
      errors.push({field,message:`${label} 최소 금액은 최대 금액보다 클 수 없습니다.`});
    }
  }
  return errors;
}

export function normalizeSearch(value) {
  return String(value ?? '').toLocaleLowerCase('ko')
    .replace(/피시|피씨/g,'pc')
    .replace(/성인\s*pc(?:\s*방)?(?:\s*(?:매물|매매|팝니다))?/g,'매장')
    .replace(/pc\s*방\s*(?:매물|매매|팝니다)/g,'매장')
    .replace(/pc\s*방\s*중고\s*장터/g,'중고')
    .replace(/\s+/g,' ').trim();
}

export function matchesListing(listing,state=createFilterState()) {
  if (!isRecord(listing) || validateFilterState(state).length) return false;
  const filters=normalizeFilterState(state);
  if (filters.type !== 'all' && listing.type !== filters.type) return false;
  if (filters.regions.length && !filters.regions.includes(listing.region)) return false;
  for (const field of RANGE_FIELDS) {
    const {min,max}=filters[field];
    if (min === null && max === null) continue;
    if (listing.type !== 'store') return false;
    const value=listing.costsManwon?.[field];
    if (!isAmount(value) || (min !== null && value < min) || (max !== null && value > max)) return false;
  }
  const haystack=normalizeSearch(['category','title','region','city','description','spec'].map(field=>typeof listing[field]==='string'?listing[field]:'').join(' '));
  return normalizeSearch(filters.q).split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));
}

function timestamp(listing) {
  const value=listing.date ?? listing.createdAt;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const result=Date.parse(value);
  if (!Number.isFinite(result)) return null;
  // Date.parse rolls invalid dates such as February 30 into the next month.
  if (value.length===10 && new Date(result).toISOString().slice(0,10)!==value) return null;
  return result;
}

export function sortListings(listings,sort='default') {
  const result=Array.isArray(listings) ? [...listings] : [];
  if (!SORTS.has(sort) || sort==='default') return result;
  const direction=sort==='high'||sort==='newest' ? -1 : 1;
  const valueFor=listing=>{
    if (sort==='newest') return timestamp(listing);
    const amount=sort==='rent-low' ? listing.type==='store' ? listing.costsManwon?.rent : null : listing.priceManwon;
    return isAmount(amount) ? amount : null;
  };
  return result.map((listing,index)=>({listing,index,value:valueFor(listing)})).sort((a,b)=>{
    if (a.value===null && b.value===null) return a.index-b.index;
    if (a.value===null) return 1;
    if (b.value===null) return -1;
    return direction*(a.value-b.value)||a.index-b.index;
  }).map(item=>item.listing);
}

export function parseFilterQuery(search,options={}) {
  const params=new URLSearchParams(typeof search==='string'||search instanceof URLSearchParams ? search : '');
  const input={
    q:params.get('q') ?? '',
    type:params.get('type'),
    regions:params.getAll('region').flatMap(region=>region.split(',')),
    sort:params.get('sort'),
  };
  for (const field of RANGE_FIELDS) input[field]={min:params.get(`${field}Min`),max:params.get(`${field}Max`)};
  return {present:QUERY_FIELDS.some(field=>params.has(field)),state:normalizeFilterState(input,options)};
}

export function serializeFilterQuery(state,{initialType='all'}={}) {
  const value=normalizeFilterState(state,{initialType});
  const params=new URLSearchParams({filters:'1'});
  if (value.q) params.set('q',value.q);
  if (value.type!==validType(initialType)) params.set('type',value.type);
  for (const region of value.regions) params.append('region',region);
  for (const field of RANGE_FIELDS) {
    if (value[field].min!==null) params.set(`${field}Min`,String(value[field].min));
    if (value[field].max!==null) params.set(`${field}Max`,String(value[field].max));
  }
  if (value.sort!=='default') params.set('sort',value.sort);
  return params.toString();
}
