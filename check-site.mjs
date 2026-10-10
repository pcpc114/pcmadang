import {validateBuiltSite} from './seo-check.mjs';
import {resolveBuildPaths} from './build-paths.mjs';

try {
  const {root,manifestPath} = await resolveBuildPaths();
  const report = await validateBuiltSite({root,manifestPath});
  console.log(JSON.stringify({...report, excluded: report.excluded.length, check: 'static HTML; not a Lighthouse score'}, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
