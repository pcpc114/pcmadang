import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateBuiltSite } from './seo-check.mjs';
import { verifyLighthouseEvidence } from './lighthouse-evidence.mjs';
import { resolveBuildPaths } from './build-paths.mjs';

// Offline only. A trusted audit producer supplies raw LHR files and the sidecar.
// Missing evidence deliberately fails this gate; static checks are not a score.
async function main() {
  if (process.argv.length > 3) throw new Error('Usage: node check-lighthouse.mjs [evidence.json]');
  const {root,manifestPath,evidencePath: defaultEvidencePath} = await resolveBuildPaths();
  const staticReport = await validateBuiltSite({ root, manifestPath });
  if (staticReport?.ok === false || staticReport?.errors?.length) {
    throw new Error(`Static SEO validation failed${staticReport.errors?.length ? `: ${staticReport.errors.join('; ')}` : '.'}`);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.auditPreviewPages) console.log('Mode: local template audit with sample content; not a published-content audit.');
  const evidencePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultEvidencePath;
  const result = await verifyLighthouseEvidence({ manifest, evidencePath });
  console.log(`Lighthouse evidence: ${result.status.toUpperCase()}`);
  for (const page of result.scores) console.log(`${page.pathname} — SEO ${page.score ?? 'unavailable'}`);
  for (const page of result.excluded) console.log(`${page.pathname} — excluded: ${page.reason}`);
  for (const error of result.errors) console.error(`- ${error}`);
  console.log(result.attestationNote);
  if (result.ok) console.log(`All ${result.scores.length} indexable pages have valid supplied SEO 100 reports.`);
  process.exitCode = result.ok ? 0 : 1;
}

main().catch(error => {
  console.error(`Lighthouse evidence check failed: ${error.message}`);
  process.exitCode = 1;
});
