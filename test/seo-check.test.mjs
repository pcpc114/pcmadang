import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, writeFile, rm, lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {writeBuildManifest, validateBuiltSite} from '../seo-check.mjs';
import {structuredData, seoConfig} from '../seo.mjs';
import {resolveSeoPolicy, effectiveSeoPolicy} from '../seo-policy.mjs';

const origin = 'http://localhost:54633';
const publicPage = pathname => ({pathname, indexable: true, reason: null});
function html(pathname, indexable = true) {
  const title = pathname === '/' ? '성인PC마당 홈' : '매장 운영 안내';
  const description = pathname === '/' ? '점포와 장비를 살펴보는 홈입니다.' : '매장 운영 정보를 확인하는 안내 페이지입니다.';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="${indexable ? 'index' : 'noindex'}, follow"><link rel="canonical" href="${origin}${pathname}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${origin}${pathname}"><meta property="og:image" content="${origin}/cover.png"><meta property="og:image:alt" content="마당 브랜드"><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script><script type="application/ld+json">${structuredData({origin, pathname, title, description})}</script></head><body><main id="main"><h1>${title}</h1><p>${description}</p><a href="/">마당 홈</a><a href="/guide/#main">운영 안내 본문</a><img src="/cover.png" alt="마당"></main></body></html>`;
}
async function fixture(t, {excluded = false} = {}) {
  const base = fileURLToPath(new URL('../artifacts/seo/static-test-tmp/', import.meta.url));
  await mkdir(base, {recursive: true});
  const directory = await mkdtemp(path.join(base, 'static-'));
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(base));
  assert.match(path.basename(directory), /^static-/);
  assert.equal((await lstat(base)).isSymbolicLink(), false);
  assert.equal((await lstat(directory)).isSymbolicLink(), false);
  t.after(() => rm(directory, {recursive: true, force: true}));
  const root = path.join(directory, 'dist');
  const manifestPath = path.join(directory, 'manifest.json');
  const pages = [publicPage('/'), excluded ? {pathname: '/guide/', indexable: false, reason: '미리보기 안내'} : publicPage('/guide/')];
  await mkdir(path.join(root, 'guide'), {recursive: true});
  await writeFile(path.join(root, 'index.html'), html('/'));
  await writeFile(path.join(root, 'guide/index.html'), html('/guide/', !excluded));
  for (const file of ['style.css', 'app.js', 'cover.png']) await writeFile(path.join(root, file), 'fixture');
  await writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  await writeFile(path.join(root, 'sitemap.xml'), `<urlset>${pages.filter(page => page.indexable).map(page => `<url><loc>${origin}${page.pathname}</loc></url>`).join('')}</urlset>`);
  const options = {root, manifestPath, origin, pages};
  const rebuild = () => writeBuildManifest(options);
  await rebuild();
  return {
    ...options, rebuild,
    async edit(file, transform) {
      const target = path.join(root, file);
      await writeFile(target, transform(await readFile(target, 'utf8')));
    },
    check: () => validateBuiltSite({root, manifestPath})
  };
}

test('checks every page including excluded pages, without inventing a score', async t => {
  const f = await fixture(t, {excluded: true});
  const result = await f.check();
  assert.equal(result.pages, 2);
  assert.equal(result.indexable, 1);
  assert.equal(result.excluded[0].reason, '미리보기 안내');
  assert.equal(Object.hasOwn(result, 'score'), false);
  await f.edit('guide/index.html', text => text.replace(/<title>.*?<\/title>/, ''));
  await f.rebuild();
  await assert.rejects(f.check(), /expected one title/);
});

test('new generated routes are automatically required to pass metadata checks', async t => {
  const f = await fixture(t);
  f.pages.push(publicPage('/new/'));
  await mkdir(path.join(f.root, 'new'));
  await writeFile(path.join(f.root, 'new/index.html'), html('/new/').replace(/<meta name="description"[^>]+>/, ''));
  await f.rebuild();
  await assert.rejects(f.check(), /expected one description/);
});

test('rejects orphan output from a deleted route', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'forgotten.html'), '<h1>Old page</h1>');
  await f.rebuild();
  await assert.rejects(f.check(), /route inventory/);
});

test('rejects missing files declared as routes', async t => {
  const f = await fixture(t);
  f.pages.push(publicPage('/missing/'));
  await f.rebuild();
  await assert.rejects(f.check(), /route inventory/);
});

test('rejects duplicate page titles and descriptions', async t => {
  const f = await fixture(t);
  const original = await readFile(path.join(f.root, 'guide/index.html'), 'utf8');
  await f.edit('guide/index.html', text => text.replace('<title>매장 운영 안내</title>', '<title>성인PC마당 홈</title>'));
  await f.rebuild();
  await assert.rejects(f.check(), /duplicate title/);
  await writeFile(path.join(f.root, 'guide/index.html'), original.replace('name="description" content="매장 운영 정보를 확인하는 안내 페이지입니다."', 'name="description" content="점포와 장비를 살펴보는 홈입니다."'));
  await f.rebuild();
  await assert.rejects(f.check(), /duplicate description/);
});

for (const [name, from, to, error] of [
  ['relative links', 'href="/guide/#main"', 'href="./missing/"', /broken internal link/],
  ['same-origin absolute links', 'href="/guide/#main"', `href="${origin}/missing/"`, /broken internal link/],
  ['fragment links', 'href="/guide/#main"', 'href="/guide/#missing"', /missing link fragment/],
  ['image alt', 'alt="마당"', '', /image has no alt/],
  ['canonical URL', `rel="canonical" href="${origin}/"`, `rel="canonical" href="${origin}/wrong/"`, /canonical differs/],
  ['structured page URL', `"url":"${origin}/","name":"성인PC마당 홈"`, `"url":"${origin}/wrong/","name":"성인PC마당 홈"`, /WebPage metadata mismatch/]
]) test(`rejects broken ${name}`, async t => {
  const f = await fixture(t);
  await f.edit('index.html', text => { assert(text.includes(from)); return text.replace(from, to); });
  await f.rebuild();
  await assert.rejects(f.check(), error);
});

test('rejects sitemap that includes a noindex page', async t => {
  const f = await fixture(t, {excluded: true});
  await f.edit('sitemap.xml', text => text.replace('</urlset>', `<url><loc>${origin}/guide/</loc></url></urlset>`));
  await f.rebuild();
  await assert.rejects(f.check(), /sitemap must contain exactly/);
});

test('rejects a page that contradicts its declared indexability', async t => {
  const f = await fixture(t);
  await f.edit('index.html', text => text.replace('content="index, follow"', 'content="noindex, follow"'));
  await f.rebuild();
  await assert.rejects(f.check(), /robots conflicts/);
});

test('asset changes invalidate prior build; identical rebuild preserves audit timestamp', async t => {
  const f = await fixture(t);
  const before = await f.rebuild();
  const identical = await f.rebuild();
  assert.equal(identical.fingerprint, before.fingerprint);
  assert.equal(identical.builtAt, before.builtAt);
  await f.edit('style.css', text => text + '\nbody{color:red}');
  await assert.rejects(f.check(), /changed after manifest/);
  const changed = await f.rebuild();
  assert.notEqual(changed.fingerprint, before.fingerprint);
  assert.equal((await f.check()).ok, true);
});

test('validation uses built origin and policy rather than current environment', async t => {
  const f = await fixture(t);
  const previousOrigin = process.env.SITE_ORIGIN, previousIndexable = process.env.SITE_INDEXABLE;
  process.env.SITE_ORIGIN = 'https://example.com';
  process.env.SITE_INDEXABLE = 'false';
  try { assert.equal((await f.check()).indexable, 2); }
  finally {
    if (previousOrigin === undefined) delete process.env.SITE_ORIGIN; else process.env.SITE_ORIGIN = previousOrigin;
    if (previousIndexable === undefined) delete process.env.SITE_INDEXABLE; else process.env.SITE_INDEXABLE = previousIndexable;
  }
});

test('future templates require a policy, exclusions need reasons, real posts can opt in', () => {
  assert.throws(() => resolveSeoPolicy({page: 'new-template'}), /Unknown page type/);
  assert.throws(() => resolveSeoPolicy({page: 'new-template', seo: {visibility: 'exclude'}}), /needs an SEO reason/);
  assert.throws(() => resolveSeoPolicy({page: 'post', noindex: true, seo: {visibility: 'public'}}), /Conflicting/);
  assert.equal(resolveSeoPolicy({page: 'post'}).visibility, 'exclude');
  assert.equal(resolveSeoPolicy({page: 'post', seo: {visibility: 'public'}}).visibility, 'public');
  assert.equal(effectiveSeoPolicy({page: 'home'}, false).indexable, false);
  assert(effectiveSeoPolicy({page: 'home'}, false).reason);
});

test('hosted previews are noindex by default; public deployment needs explicit configuration', () => {
  const previousOrigin = process.env.SITE_ORIGIN, previousIndexable = process.env.SITE_INDEXABLE;
  process.env.SITE_ORIGIN = 'https://example.com';
  delete process.env.SITE_INDEXABLE;
  try {
    assert.equal(seoConfig().indexable, false);
    process.env.SITE_INDEXABLE = 'true';
    assert.equal(seoConfig().indexable, true);
  } finally {
    if (previousOrigin === undefined) delete process.env.SITE_ORIGIN; else process.env.SITE_ORIGIN = previousOrigin;
    if (previousIndexable === undefined) delete process.env.SITE_INDEXABLE; else process.env.SITE_INDEXABLE = previousIndexable;
  }
});
