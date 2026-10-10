import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const env = {...process.env,
  SITE_ORIGIN: 'https://pcmadang.com',
  SITE_INDEXABLE: 'true',
  SITE_AUDIT_PREVIEWS: 'false',
  SITE_OUT_DIR: 'dist-production',
  SEO_ARTIFACT_DIR: 'artifacts/seo-production',
};
const tasks = {
  build: [['build.mjs']],
  check: [['check-site.mjs']],
  verify: [['check-lighthouse.mjs']],
  release: [['build.mjs'], ['check-lighthouse.mjs']],
  deploy: [['build.mjs'], ['check-lighthouse.mjs'], ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'wrangler.jsonc']],
};

async function run(args) {
  const child = spawn(process.execPath, args, {cwd, env, stdio: 'inherit', shell: false});
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${args[0]} failed (${signal || code}).`)));
  });
}

try {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !Object.hasOwn(tasks, mode)) throw new Error('Usage: node production.mjs build|check|verify|release|deploy');
  for (const args of tasks[mode]) await run(args);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
