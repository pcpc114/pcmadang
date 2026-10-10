import {lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultProjectRoot = fileURLToPath(new URL('./', import.meta.url));
const contains = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
};

async function directoryPath(projectRoot, value, label) {
  // Relative directories keep environment-specific builds inside this checkout.
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()
    || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)
    || /[\x00-\x1f<>:"|?*]/.test(value)) {
    throw new Error(`${label} must be a relative directory inside the project.`);
  }
  const segments = value.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!segments.length || segments.some(segment => segment === '.' || segment === '..' || segment.startsWith('.') || /[. ]$/.test(segment))) {
    throw new Error(`${label} must not contain root, parent, or hidden directory segments.`);
  }
  const target = path.resolve(projectRoot, ...segments);
  if (target === projectRoot || !contains(projectRoot, target)) throw new Error(`${label} escapes the project directory.`);
  let current = projectRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    let entry;
    try { entry = await lstat(current); }
    catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
    if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error(`${label} must contain only real directories: ${current}`);
  }
  return target;
}

export async function resolveBuildPaths({projectRoot = defaultProjectRoot, env = process.env} = {}) {
  projectRoot = path.resolve(projectRoot);
  const root = await directoryPath(projectRoot, env.SITE_OUT_DIR ?? 'dist', 'SITE_OUT_DIR');
  const artifactDir = await directoryPath(projectRoot, env.SEO_ARTIFACT_DIR ?? 'artifacts/seo', 'SEO_ARTIFACT_DIR');
  if (contains(root, artifactDir) || contains(artifactDir, root)) {
    throw new Error('SITE_OUT_DIR and SEO_ARTIFACT_DIR must be separate, non-overlapping directories.');
  }
  return {
    root,
    artifactDir,
    manifestPath: path.join(artifactDir, 'build-manifest.json'),
    evidencePath: path.join(artifactDir, 'lighthouse', 'evidence.json'),
  };
}
