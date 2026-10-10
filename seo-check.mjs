import {readFile, readdir, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const defaultManifest = 'artifacts/seo/build-manifest.json';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const requireValue = (condition, message) => { if (!condition) throw new Error(`SEO check: ${message}`); };
const decode = value => String(value ?? '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, key) => {
  if (key[0] === '#') return String.fromCodePoint(parseInt(key.slice(key[1].toLowerCase() === 'x' ? 2 : 1), key[1].toLowerCase() === 'x' ? 16 : 10));
  return ({amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '})[key.toLowerCase()];
});
const plain = value => decode(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
    .map(([, key, a, b, c]) => [key.toLowerCase(), decode(a ?? b ?? c ?? '')]));
}
function elements(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gi'))].map(match => attributes(match[1]));
}
function content(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi'))].map(match => match[1]);
}
function one(values, label, pathname) {
  requireValue(values.length === 1, `${pathname}: expected one ${label}, found ${values.length}.`);
  requireValue(typeof values[0] === 'string' && values[0].trim(), `${pathname}: empty ${label}.`);
  return values[0].trim();
}
function normalizePages(pages, origin) {
  requireValue(Array.isArray(pages) && pages.length > 0, 'build must declare at least one page.');
  const seen = new Set();
  return pages.map(page => {
    const url = new URL(page.pathname, origin);
    requireValue(typeof page.pathname === 'string' && page.pathname.startsWith('/') && page.pathname.endsWith('/') && url.origin === origin && url.pathname === page.pathname && !url.search && !url.hash, `invalid page route: ${page.pathname}`);
    requireValue(!seen.has(page.pathname), `duplicate route: ${page.pathname}`);
    seen.add(page.pathname);
    requireValue(typeof page.indexable === 'boolean', `${page.pathname}: missing indexability.`);
    requireValue(page.indexable ? page.reason === null : typeof page.reason === 'string' && page.reason.trim(), `${page.pathname}: excluded pages need a reason; public pages must have reason:null.`);
    return {pathname: page.pathname, indexable: page.indexable, reason: page.reason};
  }).sort((a, b) => a.pathname.localeCompare(b.pathname));
}
async function snapshot(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const file = path.join(directory, entry.name);
      requireValue(!entry.isSymbolicLink(), `symbolic links are not supported in build output: ${file}`);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) files.push({path: path.relative(root, file).split(path.sep).join('/'), sha256: sha256(await readFile(file))});
    }
  }
  await walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function fingerprintFor({origin, pages, files, auditPreviewPages = false}) {
  return sha256(JSON.stringify({schemaVersion: 1, origin, pages, files, auditPreviewPages}));
}

export async function writeBuildManifest({root = 'dist', manifestPath = defaultManifest, origin, pages, auditPreviewPages = false}) {
  requireValue(new URL(origin).origin === origin && /^https?:/.test(origin), 'manifest requires an HTTP(S) origin.');
  const manifest = {schemaVersion: 1, origin, auditPreviewPages, pages: normalizePages(pages, origin), files: await snapshot(path.resolve(root))};
  manifest.fingerprint = fingerprintFor(manifest);
  const previous = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => null);
  manifest.builtAt = previous?.fingerprint === manifest.fingerprint && Number.isFinite(Date.parse(previous.builtAt)) ? previous.builtAt : new Date().toISOString();
  await mkdir(path.dirname(manifestPath), {recursive: true});
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

// This checks our generated static HTML. It does not emulate a browser or assign a Lighthouse score.
export async function validateBuiltSite({root = 'dist', manifestPath = defaultManifest} = {}) {
  root = path.resolve(root);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  requireValue(manifest.schemaVersion === 1, 'unsupported build manifest version.');
  const {origin, auditPreviewPages = false} = manifest;
  requireValue(new URL(origin).origin === origin && /^https?:/.test(origin), 'invalid manifest origin.');
  requireValue(typeof auditPreviewPages === 'boolean' && (!auditPreviewPages || ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)), 'preview template auditing is restricted to localhost.');
  requireValue(Number.isFinite(Date.parse(manifest.builtAt)), 'invalid build timestamp.');
  const pages = normalizePages(manifest.pages, origin);
  const files = await snapshot(root);
  requireValue(fingerprintFor({origin, pages, files, auditPreviewPages}) === manifest.fingerprint, 'build output changed after manifest creation; rebuild before verification.');
  const paths = new Set(files.map(file => file.path));
  const htmlPaths = files.filter(file => file.path.endsWith('.html')).map(file => file.path);
  const expectedPaths = pages.map(page => page.pathname.slice(1) + 'index.html');
  requireValue(htmlPaths.length === expectedPaths.length && expectedPaths.every(file => htmlPaths.includes(file)), 'HTML route inventory differs from generated routes (missing page or leftover HTML).');
  const htmlByFile = new Map(await Promise.all(htmlPaths.map(async file => [file, await readFile(path.join(root, file), 'utf8')])));
  const titles = new Set(), descriptions = new Set();
  let internalLinksAndAssets = 0;

  function targetFor(value, pathname, {fragment = false} = {}) {
    requireValue(typeof value === 'string' && value.trim(), `${pathname}: empty link or asset URL.`);
    const url = new URL(value, origin + pathname);
    requireValue(!['javascript:', 'vbscript:'].includes(url.protocol), `${pathname}: script URL cannot be crawled: ${value}`);
    if (url.origin !== origin) return;
    let file = decodeURIComponent(url.pathname).slice(1);
    if (file.endsWith('/') || !file) file += 'index.html';
    else if (!paths.has(file) && paths.has(file + '/index.html')) file += '/index.html';
    requireValue(paths.has(file), `${pathname}: broken internal link/asset ${value}`);
    if (fragment && url.hash && htmlByFile.has(file)) {
      const id = decodeURIComponent(url.hash.slice(1));
      const ids = [...htmlByFile.get(file).matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => decode(match[1] ?? match[2]));
      requireValue(ids.includes(id), `${pathname}: missing link fragment ${value}`);
    }
    internalLinksAndAssets++;
  }

  for (const page of pages) {
    const {pathname} = page, canonical = origin + pathname;
    const html = htmlByFile.get(pathname.slice(1) + 'index.html');
    const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const meta = elements(document, 'meta');
    const getMeta = name => one(meta.filter(tag => tag.name?.toLowerCase() === name || tag.property?.toLowerCase() === name).map(tag => tag.content), name, pathname);
    const title = one(content(document, 'title').map(plain), 'title', pathname);
    const description = getMeta('description');
    requireValue(!titles.has(title), `${pathname}: duplicate title.`); titles.add(title);
    requireValue(!descriptions.has(description), `${pathname}: duplicate description.`); descriptions.add(description);
    requireValue(elements(document, 'html').length === 1 && elements(document, 'html')[0].lang === 'ko', `${pathname}: expected html lang=ko.`);
    requireValue(meta.filter(tag => tag.charset?.toLowerCase() === 'utf-8').length === 1, `${pathname}: expected UTF-8 charset.`);
    requireValue(/width\s*=\s*device-width/.test(getMeta('viewport')), `${pathname}: missing responsive viewport.`);
    one(content(document, 'h1').map(plain), 'H1', pathname);
    one(content(document, 'main').map(plain), 'main content', pathname);
    const links = elements(document, 'link');
    requireValue(one(links.filter(tag => tag.rel?.toLowerCase() === 'canonical').map(tag => tag.href), 'canonical', pathname) === canonical, `${pathname}: canonical differs from page URL.`);
    const robots = getMeta('robots').toLowerCase().split(/[\s,]+/);
    requireValue(robots.includes('follow') && !robots.includes('nofollow') && !robots.includes('none'), `${pathname}: page must allow following links.`);
    requireValue(page.indexable ? robots.includes('index') && !robots.includes('noindex') : robots.includes('noindex') && !robots.includes('index'), `${pathname}: robots conflicts with declared index policy.`);
    for (const tag of meta.filter(tag => ['googlebot', 'bingbot', 'yeti'].includes(tag.name?.toLowerCase()))) {
      requireValue(!/(?:noindex|nofollow|none)/i.test(tag.content || '') || !page.indexable, `${pathname}: crawler-specific robots conflicts with public policy.`);
    }
    requireValue(getMeta('og:title') === title && getMeta('og:description') === description && getMeta('og:url') === canonical, `${pathname}: Open Graph metadata differs from page metadata.`);
    targetFor(getMeta('og:image'), pathname);
    getMeta('og:image:alt');
    for (const tag of [...links, ...elements(document, 'img'), ...elements(document, 'source')]) {
      if (tag.href !== undefined) targetFor(tag.href, pathname);
      if (tag.src !== undefined) targetFor(tag.src, pathname);
    }
    for (const tag of elements(html, 'script')) if (tag.src !== undefined) targetFor(tag.src, pathname);
    for (const tag of elements(document, 'img')) {
      requireValue(Object.hasOwn(tag, 'alt'), `${pathname}: image has no alt attribute.`);
      requireValue(Boolean(tag.src), `${pathname}: image has no src.`);
    }
    for (const match of document.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const tag = attributes(match[1]);
      const label = tag['aria-label'] || plain(match[2]) || elements(match[2], 'img').map(img => img.alt).join('').trim();
      requireValue(label, `${pathname}: link has no descriptive label.`);
      targetFor(tag.href, pathname, {fragment: true});
    }
    const jsonScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => attributes(match[1]).type === 'application/ld+json');
    requireValue(jsonScripts.length > 0, `${pathname}: missing structured data.`);
    const graphs = jsonScripts.flatMap(match => {
      let data;
      try { data = JSON.parse(match[2]); } catch { throw new Error(`SEO check: ${pathname}: invalid JSON-LD.`); }
      requireValue(data['@context'] === 'https://schema.org', `${pathname}: invalid schema context.`);
      return data['@graph'] || [data];
    });
    const websites = graphs.filter(item => item['@type'] === 'WebSite');
    const webpages = graphs.filter(item => item['@type'] === 'WebPage');
    requireValue(websites.length === 1 && websites[0].url === origin + '/', `${pathname}: WebSite URL mismatch.`);
    requireValue(webpages.length === 1 && webpages[0].url === canonical && webpages[0].name === title && webpages[0].description === description, `${pathname}: WebPage metadata mismatch.`);
    requireValue(webpages[0].isPartOf?.['@id'] === websites[0]['@id'] && webpages[0].inLanguage === 'ko-KR', `${pathname}: WebPage site/language mismatch.`);
    if (pathname !== '/') {
      const breadcrumbs = graphs.filter(item => item['@type'] === 'BreadcrumbList');
      requireValue(breadcrumbs.length === 1, `${pathname}: missing or duplicate BreadcrumbList.`);
      const items = breadcrumbs[0].itemListElement;
      requireValue(Array.isArray(items) && items.length >= 2 && items[0].item === origin + '/' && items.at(-1).item === canonical, `${pathname}: breadcrumb endpoints mismatch.`);
      for (const [i, item] of items.entries()) {
        requireValue(item.position === i + 1 && typeof item.name === 'string' && item.name.trim() && typeof item.item === 'string' && item.item.startsWith(origin + '/'), `${pathname}: invalid breadcrumb item.`);
        targetFor(item.item, pathname);
      }
    }
  }

  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const locations = content(sitemap, 'loc').map(decode).sort();
  const expected = pages.filter(page => page.indexable).map(page => origin + page.pathname).sort();
  requireValue(locations.length === new Set(locations).size && JSON.stringify(locations) === JSON.stringify(expected), 'sitemap must contain exactly the indexable routes, once each.');
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
  requireValue(/^User-agent:\s*\*\s*$/im.test(robots) && /^Allow:\s*\/\s*$/im.test(robots) && !/^Disallow:\s*\S+/im.test(robots), 'robots.txt must allow crawling so page-level index/noindex can be read.');
  const sitemapLines = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map(match => match[1]);
  requireValue(expected.length ? sitemapLines.length === 1 && sitemapLines[0] === origin + '/sitemap.xml' : sitemapLines.length === 0, 'robots.txt sitemap differs from index policy.');
  return {ok: true, pages: pages.length, indexable: expected.length, excluded: pages.filter(page => !page.indexable), auditPreviewPages, internalLinksAndAssets, uniqueTitles: titles.size, fingerprint: manifest.fingerprint, result: 'passed'};
}
