import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const defaultEvidencePath = fileURLToPath(new URL('./artifacts/seo/lighthouse/evidence.json', import.meta.url));
export const evidenceAttestationNote = 'The sidecar is the audit producer’s attestation of the build fingerprint. Raw Lighthouse reports do not bind themselves to a build. File hashes detect changes to the supplied report bundle; they do not prove which build the browser served.';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const validHash = value => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);
const timestamp = value => typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
const within = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};
const detail = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 240) : '';

function failedSeoAudits(report) {
  const refs = Array.isArray(report.categories?.seo?.auditRefs) ? report.categories.seo.auditRefs : [];
  const seen = new Set();
  return refs.flatMap(ref => {
    if (!ref || typeof ref.id !== 'string' || seen.has(ref.id)) return [];
    seen.add(ref.id);
    const audit = report.audits?.[ref.id];
    if (!audit) return Number(ref.weight) > 0 ? [{ id: ref.id, title: ref.id, score: null, detail: 'Audit result is missing.' }] : [];
    const failed = typeof audit.score === 'number' && audit.score < 1;
    const weightedFailure = Number(ref.weight) > 0 && audit.score !== 1 && !(audit.score === null && audit.scoreDisplayMode === 'notApplicable');
    if (!failed && !weightedFailure && audit.scoreDisplayMode !== 'error' && !audit.errorMessage) return [];
    return [{
      id: ref.id,
      title: detail(audit.title) || ref.id,
      score: typeof audit.score === 'number' && Number.isFinite(audit.score) ? audit.score * 100 : null,
      detail: detail(audit.errorMessage) || detail(audit.explanation) || (weightedFailure ? 'Weighted audit must score 100 or explicitly be not applicable with a null score.' : ''),
    }];
  });
}

/**
 * Validate an offline Lighthouse bundle. This performs no browser or network work.
 * The caller must separately validate the shipped files against the manifest.
 * The build fingerprint in the sidecar is a producer attestation, not a property
 * independently measured by Lighthouse. See evidenceAttestationNote.
 */
export async function verifyLighthouseEvidence({ manifest, evidencePath = defaultEvidencePath } = {}) {
  const result = {
    ok: false,
    status: 'invalid',
    errors: [],
    scores: [],
    excluded: [],
    fingerprint: manifest?.fingerprint ?? null,
    evidencePath: typeof evidencePath === 'string' ? path.resolve(evidencePath) : null,
    attestationNote: evidenceAttestationNote,
  };
  const fail = message => result.errors.push(message);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    fail('Build manifest is missing or invalid.');
    return result;
  }
  if (manifest.schemaVersion !== 1) fail('Unsupported build manifest schemaVersion.');
  if (!validHash(manifest.fingerprint)) fail('Build manifest fingerprint must be a SHA-256 hash.');
  const builtAt = timestamp(manifest.builtAt);
  if (!Number.isFinite(builtAt)) fail('Build manifest builtAt is invalid.');
  try {
    const origin = new URL(manifest.origin);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== manifest.origin) throw new Error();
  } catch {
    fail('Build manifest origin must be an HTTP(S) origin without a path.');
  }
  if (!Array.isArray(manifest.pages)) fail('Build manifest pages must be an array.');
  const indexable = new Set();
  const allRoutes = new Set();
  for (const page of Array.isArray(manifest.pages) ? manifest.pages : []) {
    const route = page?.pathname;
    if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || /[?#\\]/.test(route)) {
      fail('Build manifest contains an invalid pathname.');
      continue;
    }
    if (allRoutes.has(route)) fail(`Build manifest has a duplicate route: ${route}`);
    allRoutes.add(route);
    if (typeof page.indexable !== 'boolean') fail(`Build manifest has no boolean indexable value: ${route}`);
    if (page.indexable === true) indexable.add(route);
    else if (page.indexable === false) result.excluded.push({ pathname: route, reason: page.reason || 'Marked noindex in the build manifest.' });
  }
  if (indexable.size === 0) fail('Build manifest has no indexable pages to audit.');
  if (!result.evidencePath) fail('Evidence path must be a file path string.');
  if (result.errors.length) return result;

  let evidence;
  try {
    evidence = JSON.parse(await readFile(result.evidencePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      result.status = 'pending';
      fail('Lighthouse evidence is missing; SEO 100 is not verified.');
    } else fail('Lighthouse evidence cannot be read as JSON.');
    return result;
  }
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    fail('Lighthouse evidence must be an object.');
    return result;
  }
  if (evidence.schemaVersion !== 1) fail('Unsupported Lighthouse evidence schemaVersion.');
  if (evidence.buildFingerprint !== manifest.fingerprint) fail('Lighthouse evidence fingerprint does not match this build.');
  const capturedAt = timestamp(evidence.capturedAt);
  if (!Number.isFinite(capturedAt)) fail('Lighthouse evidence capturedAt is invalid.');
  else if (capturedAt < builtAt) fail('Lighthouse evidence was captured before this build.');
  if (!Array.isArray(evidence.reports)) {
    fail('Lighthouse evidence reports must be an array.');
    return result;
  }

  const evidenceDirectory = path.dirname(result.evidencePath);
  // Reject links/junctions instead of following them. fs.realpath is unavailable
  // in some Windows sandboxes even for readable, explicitly allowed files.
  try {
    const directoryStat = await lstat(evidenceDirectory);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      fail('Evidence directory must be a real directory, not a link or junction.');
      return result;
    }
  } catch {
    fail('Evidence directory is unreadable.');
    return result;
  }
  const seen = new Set();
  for (const entry of evidence.reports) {
    const route = entry?.pathname;
    if (typeof route !== 'string' || !indexable.has(route)) {
      fail(`Unexpected report route: ${typeof route === 'string' ? route : '(invalid)'}`);
      continue;
    }
    if (seen.has(route)) {
      fail(`Duplicate report route: ${route}`);
      continue;
    }
    seen.add(route);
    const file = entry.file;
    if (typeof file !== 'string' || !file.trim() || file.includes('\0') || path.isAbsolute(file) || path.win32.isAbsolute(file) || /^[a-z]:/i.test(file)) {
      fail(`${route}: report file must be relative to the evidence directory.`);
      continue;
    }
    const reportPath = path.resolve(evidenceDirectory, file.replace(/\\/g, '/'));
    if (!within(evidenceDirectory, reportPath)) {
      fail(`${route}: report file escapes the evidence directory.`);
      continue;
    }
    let bytes;
    try {
      let componentPath = evidenceDirectory;
      let unsafeLink = false;
      for (const component of path.relative(evidenceDirectory, reportPath).split(path.sep)) {
        componentPath = path.join(componentPath, component);
        if ((await lstat(componentPath)).isSymbolicLink()) {
          unsafeLink = true;
          break;
        }
      }
      if (unsafeLink) {
        fail(`${route}: report path contains a link or junction.`);
        continue;
      }
      bytes = await readFile(reportPath);
    } catch {
      fail(`${route}: report file is missing or unreadable.`);
      continue;
    }
    if (!validHash(entry.sha256) || sha256(bytes) !== entry.sha256.toLowerCase()) {
      fail(`${route}: report SHA-256 does not match.`);
      continue;
    }
    let report;
    try {
      report = JSON.parse(bytes.toString('utf8'));
    } catch {
      fail(`${route}: report is not valid JSON.`);
      continue;
    }
    if (!report || typeof report !== 'object' || Array.isArray(report)) {
      fail(`${route}: report must be a Lighthouse result object.`);
      continue;
    }
    const expectedUrl = `${manifest.origin}${route}`;
    if (report.requestedUrl !== expectedUrl) fail(`${route}: requestedUrl does not match the exact route URL.`);
    if ((report.finalDisplayedUrl || report.finalUrl) !== expectedUrl) fail(`${route}: final URL does not match the exact route URL.`);
    if (typeof report.lighthouseVersion !== 'string' || !report.lighthouseVersion.trim()) fail(`${route}: lighthouseVersion is missing.`);
    if (Object.hasOwn(report, 'runtimeError')) fail(`${route}: Lighthouse runtimeError is present.`);
    const fetchTime = timestamp(report.fetchTime);
    if (!Number.isFinite(fetchTime)) fail(`${route}: fetchTime is invalid.`);
    else if (fetchTime < builtAt || fetchTime > capturedAt) fail(`${route}: fetchTime is outside the build-to-capture interval.`);
    const rawScore = report.categories?.seo?.score;
    const numeric = typeof rawScore === 'number' && Number.isFinite(rawScore);
    const refs = report.categories?.seo?.auditRefs;
    if (!Array.isArray(refs) || refs.length === 0) fail(`${route}: SEO auditRefs must be a nonempty array.`);
    else {
      const ids = new Set();
      for (const ref of refs) {
        if (!ref || typeof ref.id !== 'string' || !ref.id.trim() || typeof ref.weight !== 'number' || !Number.isFinite(ref.weight) || ref.weight < 0) {
          fail(`${route}: SEO auditRefs contains an invalid audit reference.`);
          continue;
        }
        if (ids.has(ref.id)) fail(`${route}: duplicate SEO audit reference ${ref.id}.`);
        ids.add(ref.id);
      }
      if (!refs.some(ref => typeof ref?.weight === 'number' && Number.isFinite(ref.weight) && ref.weight > 0)) fail(`${route}: SEO auditRefs has no positively weighted audit.`);
    }
    if (!report.audits || typeof report.audits !== 'object' || Array.isArray(report.audits)) fail(`${route}: Lighthouse audits object is missing or invalid.`);
    const failedAudits = failedSeoAudits(report);
    result.scores.push({ pathname: route, score: numeric ? rawScore * 100 : null, lighthouseScore: numeric ? rawScore : null, failedAudits });
    if (rawScore !== 1) fail(`${route}: SEO score is ${numeric ? rawScore * 100 : 'unavailable'}; required 100.`);
    for (const audit of failedAudits) fail(`${route}: failed SEO audit ${audit.id}${audit.detail ? ` — ${audit.detail}` : ''}`);
  }
  for (const route of indexable) if (!seen.has(route)) fail(`Missing Lighthouse report: ${route}`);
  result.ok = result.errors.length === 0;
  result.status = result.ok ? 'verified' : 'invalid';
  return result;
}
