import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const directory = path.join(root, 'artifacts', 'slots');
const catalogue = JSON.parse(await fs.readFile(path.join(directory, 'catalogue.json'), 'utf8'));
const resultsPath = path.join(directory, 'official-demos.json');
const failuresPath = path.join(directory, 'official-demo-failures.json');
const allowedDemoHosts = new Set(['demogamesfree.pragmaticplay.net', 'demogamesfree-asia.pragmaticplay.net']);
const exactDemoExceptions = new Set([
  'https://prelive-gs1.pragmaticplaylive.net/api/bigBassDemo',
  'https://prelive-gs1.pragmaticplaylive.net/api/spacemanDemo',
  'https://prelive-gs1.pragmaticplaylive.net/api/crashGamesDemo?operatorGameId=2201',
]);
const decodeEntities = value => value.replace(/&amp;|&#0*38;/g, '&').replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'");
const normalizeTitle = value => String(value)
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&[a-z]+;/gi, '')
  .normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const getLocations = xml => [...xml.matchAll(/<loc>(.*?)<\/loc>/gs)].map(match => decodeEntities(match[1]));
const results = await readJson(resultsPath, {});
const failures = await readJson(failuresPath, {});
let writeQueue = Promise.resolve();

async function readJson(filename, fallback) {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

function checkpoint() {
  const resultSnapshot = JSON.stringify(results, null, 2) + '\n';
  const failureSnapshot = JSON.stringify(failures, null, 2) + '\n';
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(resultsPath, resultSnapshot);
    await fs.writeFile(failuresPath, failureSnapshot);
  });
  return writeQueue;
}

function checkOfficial(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.pragmaticplay.com' || url.username || url.password || url.port) throw new Error('Not an approved official public URL');
  return url;
}

async function readOfficial(value, timeout = 18000) {
  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let url = checkOfficial(value);
      const signal = AbortSignal.timeout(timeout);
      for (let redirects = 0; redirects <= 3; redirects++) {
        const response = await fetch(url, { signal, redirect: 'manual' });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          await response.body?.cancel();
          if (!location) throw new Error('Redirect missing location');
          url = checkOfficial(new URL(location, url).href);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error('HTTP ' + response.status);
        }
        if (Number(response.headers.get('content-length') || 0) > 5 * 1024 * 1024) {
          await response.body?.cancel();
          throw new Error('Response exceeds 5 MiB');
        }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of response.body) {
          bytes += chunk.length;
          if (bytes > 5 * 1024 * 1024) throw new Error('Response exceeds 5 MiB');
          chunks.push(chunk);
        }
        return { html: Buffer.concat(chunks).toString('utf8'), sourcePage: url.href };
      }
      throw new Error('Too many redirects');
    } catch (failure) { error = failure; }
  }
  throw error;
}

async function parallel(items, limit, action) {
  let index = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (index < items.length) await action(items[index++]);
  }));
}

function extractDemo(html) {
  for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
    const attribute = match[0].match(/(?:data-game-src|src|data-src|data-lazy-src)=["']([^"']+)["']/i);
    if (!attribute) continue;
    let url;
    try { url = new URL(decodeEntities(attribute[1])); } catch { continue; }
    if (exactDemoExceptions.has(url.href)) return { demoUrl: url.href, gameSymbol: null, sourceAttribute: attribute[0], kind: 'official-crash-demo' };
    if (url.protocol !== 'https:' || !allowedDemoHosts.has(url.hostname) || url.username || url.password || url.pathname !== '/gs2c/openGame.do') continue;
    const gameSymbol = url.searchParams.get('gameSymbol');
    if (!gameSymbol || !/^[a-z0-9_-]+$/i.test(gameSymbol)) continue;
    return { demoUrl: url.href, gameSymbol, sourceAttribute: attribute[0] };
  }
  return null;
}

// This exact source and iframe URL were read successfully from the official page.
results['john-hunter-and-the-aztec-treasure-slot'] ??= {
  demoUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vs7776secrets&websiteUrl=https%3A%2F%2Fdemogamesfree.pragmaticplay.net&jurisdiction=99&lobby_url=https%3A%2F%2Fwww.pragmaticplay.com%2Fru%2F&lang=ru&cur=RUB',
  gameSymbol: 'vs7776secrets',
  sourcePage: 'https://www.pragmaticplay.com/ru/%D0%B8%D0%B3%D1%80%D1%8B/john-hunter-and-the-aztec-treasure-%D0%B8%D0%B3%D1%80%D0%BE%D0%B2%D0%BE%D0%B9-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%B0%D1%82/',
  evidence: 'HTTP 200 official HTML iframe data-game-src; verified in the source-research tool output on 2026-10-09',
  verifiedAt: '2026-10-09',
};
await checkpoint();

const sitemapIndex = await fs.readFile(path.join(directory, 'official-sitemap-index.xml'), 'utf8');
const sitemapUrls = getLocations(sitemapIndex).filter(value => /^https:\/\/www\.pragmaticplay\.com\/games-sitemap\d*\.xml$/.test(value));
if (!sitemapUrls.length) throw new Error('No official games sitemaps found in saved source index');
const officialPages = {};
let sitemapsRead = 0;
await parallel(sitemapUrls, 3, async url => {
  const filename = path.join(directory, 'official-' + new URL(url).pathname.slice(1));
  let xml;
  try { xml = await fs.readFile(filename, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!xml?.includes('<urlset')) {
    const response = await readOfficial(url, 22000);
    xml = response.html;
    if (!xml.includes('<urlset')) throw new Error('Invalid games sitemap: ' + url);
    await fs.writeFile(filename, xml);
  }
  for (const value of getLocations(xml)) {
    const parsed = checkOfficial(value);
    const match = parsed.pathname.match(/^\/en\/games\/([^/]+)\/$/);
    if (match) officialPages[decodeURIComponent(match[1])] = value;
  }
  sitemapsRead++;
  console.log(JSON.stringify({ stage: 'sitemaps', completed: sitemapsRead, total: sitemapUrls.length, englishPages: Object.keys(officialPages).length }));
});
await fs.writeFile(path.join(directory, 'official-game-pages.json'), JSON.stringify(officialPages, null, 2) + '\n');

const selectedSlugs = process.argv.filter(value => value.startsWith('--slug=')).map(value => value.slice(7));
const games = selectedSlugs.length ? catalogue.games.filter(game => selectedSlugs.includes(game.slug)) : catalogue.games;
let completed = 0;
let skipped = 0;
await parallel(games, 4, async game => {
  if (results[game.slug]) { completed++; skipped++; return; }
  let detail;
  try { detail = await readJson(path.join(directory, 'details', game.slug + '.json'), {}); }
  catch (error) { if (error instanceof SyntaxError) detail = {}; else throw error; }
  if (detail.demoUrl) { completed++; skipped++; return; }
  let sourcePage = officialPages[game.slug];
  try {
    if (!sourcePage) {
      // The query shape is taken verbatim from the gallery's public main.min.js.
      const search = new URL('https://www.pragmaticplay.com/en/games/');
      search.search = new URLSearchParams({ ajax: '1', cats: 'undefined', lang: 'en', cur: 'USD', studio: 'all', device: 'undefined', search: game.name, page: '1' });
      const found = await readOfficial(search.href);
      const hrefs = [...found.html.matchAll(/href=["']([^"']+)["']/g)].map(match => decodeEntities(match[1]));
      sourcePage = hrefs.find(href => {
        try { return checkOfficial(href).pathname === '/en/games/' + game.slug + '/'; } catch { return false; }
      });
      if (!sourcePage) throw new Error('No exact matching official game link in sitemaps or official search');
    }
    const { html, sourcePage: actualPage } = await readOfficial(sourcePage);
    if (new URL(actualPage).pathname !== '/en/games/' + game.slug + '/') throw new Error('Official game page redirected to a different path: ' + actualPage);
    const demo = extractDemo(html);
    if (!demo) throw new Error('No approved public demo iframe found in official HTML');
    const title = decodeEntities(html.match(/<title>(.*?)<\/title>/is)?.[1] || '');
    const titleReviewRequired = !normalizeTitle(title).includes(normalizeTitle(game.name));
    results[game.slug] = { ...demo, sourcePage: actualPage, title, titleReviewRequired, verifiedAt: new Date().toISOString(), sourceHtmlSha256: createHash('sha256').update(html).digest('hex') };
    delete failures[game.slug];
  } catch (error) {
    failures[game.slug] = { sourcePage: sourcePage || null, message: String(error.message), attemptedAt: new Date().toISOString() };
  }
  completed++;
  if (completed % 10 === 0 || completed === games.length) {
    await checkpoint();
    console.log(JSON.stringify({ stage: 'demos', completed, total: games.length, recovered: Object.keys(results).length, failed: Object.keys(failures).length, skipped }));
  }
});
await checkpoint();
console.log(JSON.stringify({ finished: true, total: games.length, recovered: Object.keys(results).length, failed: Object.keys(failures).length, skipped, output: resultsPath }));
