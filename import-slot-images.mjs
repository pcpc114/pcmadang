import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(root, 'assets', 'slots');
const manifestPath = path.join(root, 'artifacts', 'slots', 'images.json');
const catalogue = JSON.parse(await fs.readFile(path.join(root, 'artifacts', 'slots', 'catalogue.json'), 'utf8'));
const maximumBytes = 5 * 1024 * 1024;
const workers = 4;
const timeoutMs = 8000;
const limitArg = process.argv.find(argument => argument.startsWith('--limit='));
const games = limitArg ? catalogue.games.slice(0, Number(limitArg.slice(8))) : catalogue.games;
let previous = {};
try { previous = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const images = {};
await fs.mkdir(outputDirectory, { recursive: true });

function checkedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.pragmaticplay.com' || url.username || url.password || url.port) {
    throw new Error('Image URL is outside the approved public image host');
  }
  return url;
}

function imageExtension(buffer) {
  if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  throw new Error('Response is not a supported PNG, JPEG, or WebP image');
}

async function download(value, signal) {
  let url = checkedUrl(value);
  let response;
  for (let redirects = 0; redirects <= 3; redirects++) {
    response = await fetch(url, { signal, redirect: 'manual', headers: { Accept: 'image/png,image/jpeg,image/webp' } });
    if (response.status >= 300 && response.status < 400) {
      const target = response.headers.get('location');
      await response.body?.cancel();
      if (!target) throw new Error('Redirect has no location');
      url = checkedUrl(new URL(target, url).href);
      continue;
    }
    break;
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('HTTP ' + response.status);
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > maximumBytes) {
    await response.body?.cancel();
    throw new Error('Image exceeds 5 MiB');
  }
  if (!/^image\/(png|jpeg|webp)(?:;|$)/i.test(response.headers.get('content-type') || '')) {
    await response.body?.cancel();
    throw new Error('Unsupported image content type: ' + response.headers.get('content-type'));
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    size += chunk.length;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new Error('Image exceeds 5 MiB');
    }
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks, size);
  return { bytes, extension: imageExtension(bytes) };
}

async function reusable(game) {
  const record = previous[game.slug];
  if (record && record.sourceImage !== game.thumbnail) return null;
  const candidates = record?.sourceImage === game.thumbnail && record.status !== 'fallback'
    ? [record.image, ...['png', 'jpg', 'webp'].map(extension => '/assets/slots/' + game.slug + '.' + extension)]
    : ['png', 'jpg', 'webp'].map(extension => '/assets/slots/' + game.slug + '.' + extension);
  for (const candidate of new Set(candidates)) {
    if (!candidate || !candidate.startsWith('/assets/slots/') || candidate.includes('..')) continue;
    try {
      const bytes = await fs.readFile(path.join(root, candidate));
      const extension = imageExtension(bytes);
      if (bytes.length > maximumBytes || !candidate.endsWith('.' + extension)) continue;
      return { image: candidate, sourceImage: game.thumbnail, status: 'reused', bytes: bytes.length };
    } catch (error) { if (error.code && error.code !== 'ENOENT') throw error; }
  }
  return null;
}

async function processGame(game) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(game.slug)) throw new Error('Invalid game slug: ' + game.slug);
  checkedUrl(game.thumbnail);
  const existing = await reusable(game);
  if (existing) return existing;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { bytes, extension } = await download(game.thumbnail, AbortSignal.timeout(timeoutMs));
      const image = '/assets/slots/' + game.slug + '.' + extension;
      await fs.writeFile(path.join(root, image), bytes);
      return { image, sourceImage: game.thumbnail, status: 'downloaded', bytes: bytes.length };
    } catch (error) { lastError = error; }
  }
  return { image: '/assets/slots/fallback.svg', sourceImage: game.thumbnail, status: 'fallback', error: String(lastError?.message || lastError) };
}

await fs.writeFile(path.join(outputDirectory, 'fallback.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="339" height="180" viewBox="0 0 339 180"><rect width="339" height="180" fill="#edeae4"/><rect x="139" y="42" width="60" height="45" rx="3" fill="none" stroke="#a74732" stroke-width="4"/><path d="M155 96h28m-14-10v10" fill="none" stroke="#a74732" stroke-width="4"/><text x="169.5" y="131" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#605b54">게임 이미지 준비 중</text></svg>\n');

let index = 0;
let completed = 0;
let saveQueue = Promise.resolve();
const checkpoint = () => {
  const snapshot = JSON.stringify(images, null, 2) + '\n';
  saveQueue = saveQueue.then(() => fs.writeFile(manifestPath, snapshot));
  return saveQueue;
};
await Promise.all(Array.from({ length: workers }, async () => {
  while (index < games.length) {
    const game = games[index++];
    try { images[game.slug] = await processGame(game); }
    catch (error) { images[game.slug] = { image: '/assets/slots/fallback.svg', sourceImage: game.thumbnail, status: 'fallback', error: String(error.message) }; }
    completed++;
    if (completed % 20 === 0 || completed === games.length) {
      await checkpoint();
      const failed = Object.values(images).filter(item => item.status === 'fallback').length;
      console.log(JSON.stringify({ completed, total: games.length, failed }));
    }
  }
}));
await checkpoint();
const counts = Object.values(images).reduce((summary, item) => {
  summary[item.status] = (summary[item.status] || 0) + 1;
  summary.bytes += item.bytes || 0;
  return summary;
}, { bytes: 0 });
const sourceLines = [
  '# 슬롯 썸네일 출처',
  '',
  '확인일: 2026-10-09',
  '',
  '게임 목록 출처: ' + catalogue.source,
  '',
  '사용자가 요청한 참고 사이트의 게임 목록에서 확인한 Pragmatic Play 공식 이미지 URL을 사용합니다. 초기 24개는 사용자 제공 브라우저 탭의 이미지 다운로드 결과를 재사용했고, 나머지는 확인된 https://www.pragmaticplay.com 이미지 주소에서 직접 내려받았습니다. 목록과 실행 결과는 artifacts/slots/catalogue.json 및 artifacts/slots/images.json에 기록합니다.',
  '',
  '이미지는 로컬 시제품용 제3자 자료입니다. 이 기록은 이미지·상표의 소유권이나 이용 허락을 주장하지 않습니다. 별도의 이용 라이선스나 제휴 승인은 확인하지 않았습니다. 게임 실행 연동 여부는 이미지 출처와 별개입니다. fallback.svg는 이미지가 없을 때 표시하는 자체 제작 안내 그림입니다.',
  '',
  '| 게임 | 로컬 이미지 | 원본 이미지 | 결과 |',
  '| --- | --- | --- | --- |',
  ...games.map(game => `| ${game.slug} | ${images[game.slug].image} | ${game.thumbnail} | ${images[game.slug].status} |`),
  '',
];
await fs.writeFile(path.join(outputDirectory, 'SOURCES.md'), sourceLines.join('\n'));
console.log(JSON.stringify({ finished: true, total: games.length, ...counts, manifest: manifestPath }));
