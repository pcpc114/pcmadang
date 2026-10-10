import {findNavigation} from './navigation.mjs';

export function seoConfig() {
  const url = new URL(process.env.SITE_ORIGIN || 'http://localhost:54633');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_ORIGIN must be an http(s) origin without a path or credentials.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!local && process.env.SITE_AUDIT_PREVIEWS === 'true') {
    throw new Error('SITE_AUDIT_PREVIEWS is only allowed on localhost, never on a hosted origin.');
  }
  // Local templates can be audited with sample data. Hosted sample content stays excluded.
  const indexable = process.env.SITE_INDEXABLE === 'true' || (local && process.env.SITE_INDEXABLE !== 'false');
  const auditPreviewPages = local && indexable && process.env.SITE_AUDIT_PREVIEWS !== 'false';
  return {origin: url.origin, indexable, auditPreviewPages};
}

export function structuredData({origin, pathname, title, description, breadcrumbs}) {
  const graph = [{
    '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`,
    name: '성인PC마당', alternateName: '성인PC 마당', inLanguage: 'ko-KR',
    description: 'PC방 매매와 PC·집기 중고장터, 업주 커뮤니티'
  }, {
    '@type': 'WebPage', '@id': `${origin}${pathname}#webpage`,
    url: `${origin}${pathname}`, name: title, description, inLanguage: 'ko-KR',
    isPartOf: {'@id': `${origin}/#website`}
  }];
  const navigation=findNavigation(pathname);
  if (pathname !== '/') graph.push({
    '@type': 'BreadcrumbList', itemListElement: breadcrumbs ? breadcrumbs.map((crumb, i) => ({
      '@type': 'ListItem', position: i + 1, name: crumb.name, item: `${origin}${crumb.pathname}`
    })) : [
      {'@type': 'ListItem', position: 1, name: '성인PC마당', item: `${origin}/`},
      ...(navigation?.child ? [
        {'@type':'ListItem',position:2,name:navigation.group.label,item:`${origin}${navigation.group.href}`},
        {'@type':'ListItem',position:3,name:navigation.child.label,item:`${origin}${pathname}`}
      ] : [{'@type': 'ListItem', position: 2, name: navigation?.group.label||title, item: `${origin}${pathname}`}])
    ]
  });
  return JSON.stringify({'@context': 'https://schema.org', '@graph': graph}).replace(/</g, '\\u003c');
}
