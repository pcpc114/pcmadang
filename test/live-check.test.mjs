import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPage, inspectRobots, inspectSitemap} from '../check-live.mjs';

const url = 'https://pcmadang.com/';
const page = `<html lang="ko"><head><title>마당 홈</title><meta name="description" content="PC방 거래 안내"><meta name="robots" content="index, follow"><link rel="canonical" href="${url}"><script type="application/ld+json">{"@type":"WebPage","url":"${url}"}</script></head><body><main><h1>마당 홈</h1><p>PC방 거래 안내</p></main></body></html>`;
const inspect = (remote, extra = {}) => inspectPage(remote, page, {url, indexable: true, ...extra});

test('reports Cloudflare script injection separately from unchanged page semantics', () => {
  const remote = page.replace('</body>', '<script src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{}"></script></body>');
  const result = inspect(remote);
  assert.ok(Object.values(result.checks).every(Boolean));
  assert.deepEqual(result.transformations.cloudflareMarkers, ['cloudflare-insights', 'data-cf-beacon']);
  assert.equal(result.transformations.addedScripts.length, 1);
  assert.equal(Object.hasOwn(result, 'score'), false);
});

test('rejects stale main content or metadata even when the response is valid HTML', () => {
  assert.equal(inspect(page.replace('<p>PC방 거래 안내</p>', '<p>이전 홈페이지</p>')).checks.mainContent, false);
  assert.equal(inspect(page.replace('<title>마당 홈</title>', '<title>다른 사이트</title>')).checks.title, false);
  assert.equal(inspect(page.replace(`href="${url}"`, 'href="https://example.com/"')).checks.canonical, false);
});

test('detects meta/header indexing blocks while permitting intentional exclusions', () => {
  assert.equal(inspect(page.replace('index, follow', 'none')).checks.indexPolicy, false);
  assert.equal(inspect(page, {xRobotsTag: 'googlebot: noindex'}).checks.headerIndexPolicy, false);
  assert.equal(inspect(page, {xRobotsTag: 'nofollow'}).checks.headerIndexPolicy, false);
  assert.equal(inspect(page.replace('index, follow', 'noindex, follow'), {indexable: false}).checks.indexPolicy, true);
});

test('robots inspection distinguishes public crawler blocking from unrelated bot policies', () => {
  const pages = [{pathname: '/', indexable: true}, {pathname: '/games/', indexable: true}];
  const valid = `User-agent: *\nAllow: /\nSitemap: ${url}sitemap.xml\nUser-agent: GPTBot\nDisallow: /\n`;
  assert.ok(Object.values(inspectRobots(valid, pages)).every(Boolean));
  const bad = `${valid}User-agent: Googlebot\nDisallow: /games/\n`;
  assert.equal(inspectRobots(bad, pages)['robotsAllowsPublicPages:googlebot'], false);
});

test('sitemap rejects missing public pages, duplicates and excluded pages', () => {
  const pages = [{pathname: '/', indexable: true}, {pathname: '/saved/', indexable: false}];
  const sitemap = `<urlset><url><loc>${url}</loc></url></urlset>`;
  assert.ok(Object.values(inspectSitemap(sitemap, pages)).every(Boolean));
  assert.equal(inspectSitemap(sitemap.replace('</urlset>', `<url><loc>${url}saved/</loc></url></urlset>`), pages).sitemapMatchesIndexablePages, false);
  assert.equal(inspectSitemap(sitemap.replace('</urlset>', `<url><loc>${url}</loc></url></urlset>`), pages).sitemapUniqueUrls, false);
});
