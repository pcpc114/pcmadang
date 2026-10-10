const publicPageTypes = new Set(['home', 'store', 'equipment', 'community', 'support', 'topic', 'guide']);
const excludedTypes = Object.freeze({
  saved: '개인 관심 목록은 이 브라우저에만 저장됩니다.',
  detail: '실제 거래 매물이 아닌 예시 상세 페이지입니다.',
  post: '실제 회원이 작성한 글이 아닌 예시 게시글입니다.',
  board: '실제 공개 글이 연결되지 않은 미리보기 게시판입니다.',
  'empty-board': '실제 공개 글이 없는 미리보기 분류 페이지입니다.'
});

export const previewPageTypes = Object.freeze(Object.keys(excludedTypes));
const auditableTemplates = new Set(['detail', 'post', 'board', 'empty-board']);

// A new template must declare its policy; real content can explicitly override a preview default.
export function resolveSeoPolicy({page = 'home', noindex = false, seo} = {}) {
  if (seo !== undefined) {
    if (!seo || !['public', 'exclude'].includes(seo.visibility)) {
      throw new Error(`SEO policy for ${page}: visibility must be public or exclude.`);
    }
    if (seo.visibility === 'public') {
      if (noindex) throw new Error(`Conflicting public/noindex policy for ${page}.`);
      return {visibility: 'public', reason: null};
    }
    if (typeof seo.reason !== 'string' || !seo.reason.trim()) {
      throw new Error(`Excluded page ${page} needs an SEO reason.`);
    }
    return {visibility: 'exclude', reason: seo.reason.trim()};
  }
  if (Object.hasOwn(excludedTypes, page)) return {visibility: 'exclude', reason: excludedTypes[page]};
  if (!publicPageTypes.has(page)) throw new Error(`Unknown page type ${page}: declare an explicit seo policy.`);
  if (noindex) throw new Error(`Page ${page} needs seo: {visibility: 'exclude', reason: '...'} for noindex.`);
  return {visibility: 'public', reason: null};
}

export function effectiveSeoPolicy(options, siteIndexable, {auditPreviewPages = false} = {}) {
  const policy = resolveSeoPolicy(options);
  // This is supplied only by loopback seoConfig, not by URL query or user agent.
  // Explicit exclusions (draft/private content) always win over template auditing.
  const auditTemplate = auditPreviewPages && options.seo === undefined && auditableTemplates.has(options.page);
  const indexable = siteIndexable && (policy.visibility === 'public' || auditTemplate);
  return {indexable, reason: indexable ? null : policy.reason || '사이트 전체가 비색인 미리보기 모드입니다.'};
}
