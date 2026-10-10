import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifyLighthouseEvidence } from '../lighthouse-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  const fixtureRoot = fileURLToPath(new URL('../artifacts/seo/evidence-test-tmp/', import.meta.url));
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, 'madang-lighthouse-evidence-'));
  // Delete only this test's freshly created directory, never a computed parent.
  const safeRoot = path.resolve(fixtureRoot);
  const actualDirectory = path.resolve(directory);
  assert.equal(path.dirname(actualDirectory), safeRoot);
  assert.match(path.basename(actualDirectory), /^madang-lighthouse-evidence-/);
  assert.equal((await lstat(safeRoot)).isSymbolicLink(), false);
  assert.equal((await lstat(actualDirectory)).isSymbolicLink(), false);
  t.after(() => rm(actualDirectory, { recursive: true, force: true }));
  const manifest = {
    schemaVersion: 1,
    fingerprint: 'a'.repeat(64),
    builtAt: '2026-10-09T00:00:00.000Z',
    origin: 'http://localhost:54633',
    pages: [
      { pathname: '/', indexable: true, reason: null },
      { pathname: '/stores/', indexable: true, reason: null },
      { pathname: '/saved/', indexable: false, reason: 'Private saved listings.' },
    ],
  };
  const evidence = { schemaVersion: 1, buildFingerprint: manifest.fingerprint, capturedAt: '2026-10-09T00:02:00.000Z', reports: [] };
  for (const [i, page] of manifest.pages.filter(page => page.indexable).entries()) {
    const report = {
      lighthouseVersion: '13.5.0',
      fetchTime: '2026-10-09T00:01:00.000Z',
      requestedUrl: `${manifest.origin}${page.pathname}`,
      finalDisplayedUrl: `${manifest.origin}${page.pathname}`,
      categories: { seo: { score: 1, auditRefs: [{ id: 'document-title', weight: 1 }] } },
      audits: { 'document-title': { id: 'document-title', title: 'Document has a title', score: 1 } },
    };
    const file = `report-${i}.json`;
    const bytes = JSON.stringify(report);
    await writeFile(path.join(directory, file), bytes);
    evidence.reports.push({ pathname: page.pathname, file, sha256: hash(bytes) });
  }
  const evidencePath = path.join(directory, 'evidence.json');
  const save = () => writeFile(evidencePath, JSON.stringify(evidence));
  await save();
  return {
    manifest, evidence, evidencePath, directory, save,
    async editReport(i, edit, rehash = true) {
      const entry = evidence.reports[i];
      const filename = path.join(directory, entry.file);
      const report = JSON.parse(await readFile(filename, 'utf8'));
      edit(report);
      const bytes = JSON.stringify(report);
      await writeFile(filename, bytes);
      if (rehash) entry.sha256 = hash(bytes);
      await save();
    },
  };
}

test('accepts complete SEO 100 evidence and reports excluded pages honestly', async t => {
  const f = await fixture(t);
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, true);
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.scores.map(page => [page.pathname, page.score]), [['/', 100], ['/stores/', 100]]);
  assert.deepEqual(result.excluded, [{ pathname: '/saved/', reason: 'Private saved listings.' }]);
  assert.match(result.attestationNote, /do not prove/);
});

test('rejects a stale build fingerprint', async t => {
  const f = await fixture(t);
  f.evidence.buildFingerprint = 'b'.repeat(64);
  await f.save();
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /fingerprint does not match/);
});

test('rejects missing indexable route coverage', async t => {
  const f = await fixture(t);
  f.evidence.reports.pop();
  await f.save();
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Missing Lighthouse report: /stores/'));
});

test('retains the actual below-100 score and failed audit diagnosis', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => {
    report.categories.seo.score = 0.92;
    report.audits['document-title'].score = 0;
    report.audits['document-title'].explanation = 'No title element was found.';
  });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.equal(result.scores[0].score, 92);
  assert.equal(result.scores[0].failedAudits[0].id, 'document-title');
  assert.match(result.errors.join('\n'), /No title element was found/);
});

test('rejects modified reports whose hashes no longer match', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { report.categories.seo.score = 0.8; }, false);
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /SHA-256 does not match/);
  assert.equal(result.scores.some(page => page.pathname === '/'), false);
});

test('rejects a report requested or redirected to a different URL', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => {
    report.requestedUrl += '?audit=true';
    report.finalDisplayedUrl = `${f.manifest.origin}/stores/`;
  });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /requestedUrl does not match/);
  assert.match(result.errors.join('\n'), /final URL does not match/);
});

test('missing evidence is pending and cannot pass', async t => {
  const f = await fixture(t);
  const result = await verifyLighthouseEvidence({ manifest: f.manifest, evidencePath: path.join(f.directory, 'missing.json') });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'pending');
  assert.deepEqual(result.scores, []);
});

test('rejects duplicate and unexpected reports, including noindex pages', async t => {
  const f = await fixture(t);
  f.evidence.reports.push({ ...f.evidence.reports[0] }, { ...f.evidence.reports[0], pathname: '/saved/' });
  await f.save();
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Duplicate report route/);
  assert.match(result.errors.join('\n'), /Unexpected report route: \/saved\//);
});

test('rejects report paths escaping the bundle directory', async t => {
  const f = await fixture(t);
  f.evidence.reports[0].file = '../outside.json';
  await f.save();
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /escapes the evidence directory/);
});

test('rejects reports captured before the build and after capture completion', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { report.fetchTime = '2026-10-08T23:59:59.000Z'; });
  await f.editReport(1, report => { report.fetchTime = '2026-10-09T00:02:01.000Z'; });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.equal(result.errors.filter(error => error.includes('outside the build-to-capture interval')).length, 2);
});

test('rejects runtime errors even if the supplied score is 100', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { report.runtimeError = { code: 'NO_FCP', message: 'Page did not paint.' }; });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /runtimeError is present/);
});

test('rejects an empty indexable manifest rather than accepting zero reports', async t => {
  const f = await fixture(t);
  f.manifest.pages = f.manifest.pages.filter(page => !page.indexable);
  f.evidence.reports = [];
  await f.save();
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /no indexable pages/);
});

test('rejects a bare score without SEO audit references', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { delete report.categories.seo.auditRefs; });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.equal(result.scores[0].score, 100);
  assert.match(result.errors.join('\n'), /SEO auditRefs must be a nonempty array/);
});

test('rejects a missing weighted audit even when category score is 100', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { delete report.audits['document-title']; });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Audit result is missing/);
});

test('rejects a category containing only unweighted audit references', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { report.categories.seo.auditRefs[0].weight = 0; });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /no positively weighted audit/);
});

test('accepts a legitimate not-applicable weighted audit', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => {
    report.audits['document-title'].score = null;
    report.audits['document-title'].scoreDisplayMode = 'notApplicable';
  });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, true);
});

test('rejects an unexplained null weighted audit score', async t => {
  const f = await fixture(t);
  await f.editReport(0, report => { report.audits['document-title'].score = null; });
  const result = await verifyLighthouseEvidence(f);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Weighted audit must score 100/);
});
