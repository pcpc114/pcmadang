import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {fileURLToPath} from 'node:url';

const origin = 'https://pcmadang.com';
const projectRoot = fileURLToPath(new URL('./', import.meta.url));
const reportPath = path.join(projectRoot, 'artifacts/deployment/live-check-remote.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#39);/g, entity => ({'&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&lt;':'<','&gt;':'>'}[entity]));
const attrs = text => Object.fromEntries([...text.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4])]));
const elements = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))].map(match => attrs(match[1]));
const textContent = value => decode(value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const blocked = value => /(?:^|[\s,:])(?:noindex|none)(?:$|[\s,])/i.test(value);
const blockedFollow = value => /(?:^|[\s,:])(?:nofollow|none)(?:$|[\s,])/i.test(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function htmlFacts(source) {
  const html = source.replace(/<!--[\s\S]*?-->/g, '');
  const metas = elements(html, 'meta');
  const meta = name => metas.filter(item => item.name?.toLowerCase() === name).map(item => item.content ?? '');
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match => JSON.parse(match[1]));
  return {
    titles: [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(match => textContent(match[1])),
    descriptions: meta('description'), robots: meta('robots'),
    canonicals: elements(html, 'link').filter(item => item.rel?.toLowerCase() === 'canonical').map(item => item.href),
    h1s: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => textContent(match[1])),
    main: [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map(match => textContent(match[1])),
    lang: elements(html, 'html')[0]?.lang,
    jsonLd,
    scripts: elements(html, 'script').map(item => item.src).filter(Boolean),
    stylesheets: elements(html, 'link').filter(item => item.rel?.toLowerCase() === 'stylesheet').map(item => item.href),
  };
}

export function inspectPage(remote, local, {url, indexable, xRobotsTag = ''}) {
  const actual = htmlFacts(remote);
  const expected = htmlFacts(local);
  const robots = actual.robots.join(',');
  const checks = {
    title: actual.titles.length === 1 && Boolean(actual.titles[0]) && same(actual.titles, expected.titles),
    description: actual.descriptions.length === 1 && Boolean(actual.descriptions[0]) && same(actual.descriptions, expected.descriptions),
    canonical: actual.canonicals.length === 1 && actual.canonicals[0] === url,
    oneH1: actual.h1s.length === 1 && same(actual.h1s, expected.h1s),
    mainContent: actual.main.length === 1 && Boolean(actual.main[0]) && same(actual.main, expected.main),
    koreanLanguage: actual.lang === 'ko',
    indexPolicy: actual.robots.length === 1 && blocked(robots) === !indexable,
    publicPageAllowsFollowing: !indexable || !blockedFollow(robots),
    headerIndexPolicy: !indexable || (!blocked(xRobotsTag) && !blockedFollow(xRobotsTag)),
    jsonLd: actual.jsonLd.length > 0 && same(actual.jsonLd, expected.jsonLd),
    scriptsPresent: expected.scripts.every(src => actual.scripts.includes(src)),
    stylesheetsPresent: expected.stylesheets.every(href => actual.stylesheets.includes(href)),
  };
  const addedScripts = actual.scripts.filter(src => !expected.scripts.includes(src));
  const cloudflareMarkers = [
    /\/cdn-cgi\//i.test(remote) && 'cdn-cgi',
    /static\.cloudflareinsights\.com/i.test(remote) && 'cloudflare-insights',
    /data-cf-beacon/i.test(remote) && 'data-cf-beacon',
  ].filter(Boolean);
  return {checks, seo: {title: actual.titles[0], description: actual.descriptions[0], canonical: actual.canonicals[0], robots, expectedIndexable: indexable, jsonLdBlocks: actual.jsonLd.length}, transformations: {addedScripts, cloudflareMarkers}};
}

export function inspectSitemap(xml, pages) {
  const urls = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(match => decode(match[1].trim()));
  const expected = pages.filter(page => page.indexable).map(page => `${origin}${page.pathname}`).sort();
  return {sitemapHasUrlset: /<urlset\b/.test(xml), sitemapUniqueUrls: new Set(urls).size === urls.length, sitemapMatchesIndexablePages: same(urls.sort(), expected)};
}

export function inspectRobots(source, pages) {
  const groups = [];
  let group;
  const sitemaps = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.replace(/#.*$/, '').match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const [, rawKey, value] = match;
    const key = rawKey.toLowerCase();
    if (key === 'sitemap') sitemaps.push(value);
    if (key === 'user-agent') {
      if (!group || group.rules.length) { group = {agents: [], rules: []}; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && ['allow', 'disallow'].includes(key) && value) {
      group.rules.push({allow: key === 'allow', pattern: value});
    }
  }
  const checks = {robotsText: !/<html\b/i.test(source), sitemapDeclared: sitemaps.includes(`${origin}/sitemap.xml`)};
  for (const agent of ['*', 'googlebot', 'bingbot', 'yeti']) {
    const specificity = candidate => candidate.agents.reduce((max, value) => Math.max(max, value === '*' ? 0 : agent.includes(value) ? value.length : -1), -1);
    const longest = Math.max(-1, ...groups.map(specificity));
    const rules = longest < 0 ? [] : groups.filter(candidate => specificity(candidate) === longest).flatMap(candidate => candidate.rules);
    checks[`robotsAllowsPublicPages:${agent}`] = pages.filter(page => page.indexable).every(page => {
      const matches = rules.filter(rule => {
        const pattern = rule.pattern.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
        return new RegExp(`^${pattern}`).test(page.pathname);
      }).sort((a, b) => b.pattern.length - a.pattern.length || Number(b.allow) - Number(a.allow));
      return !matches.length || matches[0].allow;
    });
  }
  return checks;
}

const selectedHeaders = headers => Object.fromEntries(['content-type', 'cache-control', 'cf-cache-status', 'cf-ray', 'location', 'server', 'x-robots-tag', 'etag'].map(name => [name, headers.get(name)]).filter(([, value]) => value !== null));
const fetchOptions = () => ({redirect: 'manual', signal: AbortSignal.timeout(30000), headers: {'User-Agent': 'pcmadang-owner-production-health-check/1.0', 'Cache-Control': 'no-cache'}});

export async function checkLive({fetchImpl = fetch, root = projectRoot} = {}) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'artifacts/seo-production/build-manifest.json'), 'utf8'));
  if (manifest.origin !== origin || manifest.auditPreviewPages !== false) throw new Error('Build is not the production origin/index policy');
  const fileHashes = new Map(manifest.files.map(file => [file.path, file.sha256]));
  const pagesByPath = new Map(manifest.pages.map(page => [page.pathname, page]));
  const outputRoot = path.join(root, 'dist-production');
  const results = [];
  const localFile = file => fs.readFile(path.join(outputRoot, file));
  async function check(pathname, options = {}) {
    const url = new URL(pathname, origin).href;
    const result = {url, pathname, startedAt: new Date().toISOString(), checks: {}, errors: [], warnings: []};
    try {
      const response = await fetchImpl(url, fetchOptions());
      const bytes = Buffer.from(await response.arrayBuffer());
      Object.assign(result, {status: response.status, headers: selectedHeaders(response.headers), bytes: bytes.length, sha256: sha256(bytes)});
      result.checks.status = response.status === (options.status ?? 200);
      if (options.contentType) result.checks.contentType = options.contentType.test(response.headers.get('content-type') ?? '');
      if (options.location) result.checks.redirectTarget = response.headers.has('location') && new URL(response.headers.get('location'), url).href === new URL(options.location, origin).href;
      if (options.file) {
        const local = await localFile(options.file);
        result.expectedSha256 = sha256(local);
        result.checks.localMatchesManifest = fileHashes.get(options.file) === result.expectedSha256;
        result.exactLocalBuildBytes = result.sha256 === result.expectedSha256;
        if (options.exact) result.checks.exactLocalBuildBytes = result.exactLocalBuildBytes;
        else if (!result.exactLocalBuildBytes) result.warnings.push('Remote bytes differ from this build. Semantic checks below are separate; byte identity is not claimed.');
        if (options.page && response.status === 200) {
          const page = pagesByPath.get(pathname);
          if (!page) throw new Error('Page missing from build manifest');
          const inspected = inspectPage(bytes.toString('utf8'), local.toString('utf8'), {url, indexable: page.indexable, xRobotsTag: response.headers.get('x-robots-tag') ?? ''});
          Object.assign(result.checks, inspected.checks);
          Object.assign(result, {seo: {...inspected.seo, exclusionReason: page.reason}, transformations: inspected.transformations});
        }
      }
      if (options.robots) Object.assign(result.checks, inspectRobots(bytes.toString('utf8'), manifest.pages));
      if (options.sitemap) Object.assign(result.checks, inspectSitemap(bytes.toString('utf8'), manifest.pages));
    } catch (error) {
      result.checks.requestCompleted = false;
      result.errors.push(`${error.message}${error.cause ? `: ${error.cause.message ?? error.cause}` : ''}`);
    }
    for (const [name, pass] of Object.entries(result.checks)) if (!pass) result.errors.push(`Check failed: ${name}`);
    results.push(result);
  }

  const representativePages = ['/', '/stores/', '/stores/adult/', '/listing/store-001/', '/equipment/', '/community/', '/community/free/', '/saved/', '/support/', '/games/', '/games/page/2/', '/games/3-buzzing-wilds/'];
  for (const pathname of representativePages) await check(pathname, {page: true, file: `${pathname.slice(1)}index.html`, contentType: /text\/html/i});
  const home = (await localFile('index.html')).toString('utf8');
  const assets = new Set([
    ...elements(home, 'link').filter(item => item.rel === 'stylesheet').map(item => item.href),
    ...elements(home, 'script').map(item => item.src).filter(Boolean),
    '/favicon.svg', '/brand-social.png',
  ]);
  for (const pathname of assets) {
    if (!pathname.startsWith('/') || pathname.startsWith('//')) throw new Error('Unexpected non-local asset in check inventory');
    const contentType = pathname.endsWith('.css') ? /text\/css/i : pathname.endsWith('.js') ? /(?:text|application)\/javascript/i : /image\//i;
    await check(pathname, {file: pathname.slice(1), exact: true, contentType});
  }
  await check('/robots.txt', {file: 'robots.txt', robots: true, contentType: /text\/plain/i});
  await check('/sitemap.xml', {file: 'sitemap.xml', sitemap: true, contentType: /(?:application|text)\/xml/i});
  await check(`/__pcmadang_missing_${crypto.randomUUID()}__/`, {status: 404});
  // Workers Static Assets documents 307 for force-trailing-slash HTML handling.
  // https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
  await check('/games', {status: 307, location: '/games/'});

  for (const initial of ['http://pcmadang.com/games/?healthcheck=redirect', 'https://www.pcmadang.com/games/?healthcheck=redirect', 'http://www.pcmadang.com/games/?healthcheck=redirect']) {
    const expected = 'https://pcmadang.com/games/?healthcheck=redirect';
    const result = {url: initial, startedAt: new Date().toISOString(), checks: {}, chain: [], errors: [], warnings: []};
    try {
      let current = initial;
      for (let hop = 0; hop < 3; hop++) {
        const response = await fetchImpl(current, fetchOptions());
        const location = response.headers.get('location');
        result.chain.push({url: current, status: response.status, location});
        await response.body?.cancel();
        if (current === expected) { result.checks.finalStatus = response.status === 200; break; }
        if (![301, 308].includes(response.status) || !location) throw new Error('Expected a permanent canonical redirect');
        const next = new URL(location, current);
        if (next.protocol !== 'https:' || !['pcmadang.com', 'www.pcmadang.com'].includes(next.hostname) || next.pathname !== '/games/' || next.search !== '?healthcheck=redirect') throw new Error('Redirect changed the path/query, left the intended host, or did not upgrade HTTPS');
        current = next.href;
      }
      result.checks.canonicalReached = result.chain.at(-1)?.url === expected;
    } catch (error) { result.errors.push(`${error.message}${error.cause ? `: ${error.cause.message ?? error.cause}` : ''}`); }
    for (const [name, pass] of Object.entries(result.checks)) if (!pass) result.errors.push(`Check failed: ${name}`);
    results.push(result);
  }
  return {checkedAt: new Date().toISOString(), origin, productionBuiltAt: manifest.builtAt, productionFingerprint: manifest.fingerprint, revision: process.env.GITHUB_SHA ?? null, workflowRun: process.env.GITHUB_RUN_ID ?? null, kind: 'Representative normal-HTTPS and static HTML SEO checks; not Lighthouse and not a score for all pages', scope: {representativePages, totalPagesInBuild: manifest.pages.length, totalIndexablePagesInBuild: manifest.pages.filter(page => page.indexable).length}, pass: results.every(result => result.errors.length === 0), results};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let report;
  try {
    report = await checkLive();
    report.dns = await Promise.all(['pcmadang.com', 'www.pcmadang.com'].map(async hostname => {
      try { return {hostname, addresses: await lookup(hostname, {all: true})}; }
      catch (error) { return {hostname, error: error.message}; }
    }));
  } catch (error) {
    report = {checkedAt: new Date().toISOString(), origin, pass: false, kind: 'HTTP check initialization failure; no Lighthouse measurement', errors: [error.message]};
  }
  await fs.mkdir(path.dirname(reportPath), {recursive: true});
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({pass: report.pass, checks: report.results?.length ?? 0, failures: report.results?.filter(result => result.errors.length).map(({url, status, errors}) => ({url, status, errors})) ?? report.errors, warnings: report.results?.filter(result => result.warnings.length).map(({url, warnings, transformations}) => ({url, warnings, transformations})), report: 'artifacts/deployment/live-check-remote.json'}, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}
