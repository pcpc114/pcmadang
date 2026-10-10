import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rmdir,symlink,unlink,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {resolveBuildPaths} from '../build-paths.mjs';
import {writeBuildManifest} from '../seo-check.mjs';

async function fixture(t) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(),'pcmadang-build-paths-'));
  const directories = [projectRoot], files = [];
  t.after(async () => {
    for (const file of files.reverse()) await unlink(file);
    for (const directory of directories.reverse()) await rmdir(directory);
  });
  return {
    projectRoot,
    resolve: env => resolveBuildPaths({projectRoot,env}),
    async directory(relative) {
      const target = path.join(projectRoot,relative);
      await mkdir(target);
      directories.push(target);
      return target;
    },
    async file(relative, contents) {
      const target = path.join(projectRoot,relative);
      await writeFile(target,contents);
      files.push(target);
      return target;
    },
    trackFile: file => files.push(file),
  };
}

test('default output and SEO evidence paths remain unchanged',async t => {
  const f = await fixture(t);
  const paths = await f.resolve({});
  assert.equal(paths.root,path.join(f.projectRoot,'dist'));
  assert.equal(paths.artifactDir,path.join(f.projectRoot,'artifacts/seo'));
  assert.equal(paths.manifestPath,path.join(f.projectRoot,'artifacts/seo/build-manifest.json'));
  assert.equal(paths.evidencePath,path.join(f.projectRoot,'artifacts/seo/lighthouse/evidence.json'));
});

test('production output, manifests, and evidence do not overwrite localhost files',async t => {
  const f = await fixture(t);
  for (const directory of ['dist','dist-production','artifacts','artifacts/seo','artifacts/seo-production']) await f.directory(directory);
  await f.file('dist/index.html','localhost preview');
  await f.file('dist-production/index.html','production build');
  const local = await f.resolve({});
  const production = await f.resolve({SITE_OUT_DIR:'dist-production',SEO_ARTIFACT_DIR:'artifacts/seo-production'});
  const pages = [{pathname:'/',indexable:true,reason:null}];
  await writeBuildManifest({...local,origin:'http://localhost:54633',pages,auditPreviewPages:true});
  f.trackFile(local.manifestPath);
  const before = await readFile(local.manifestPath,'utf8');
  await writeBuildManifest({...production,origin:'https://pcmadang.com',pages});
  f.trackFile(production.manifestPath);
  assert.equal(await readFile(local.manifestPath,'utf8'),before);
  assert.equal(await readFile(path.join(local.root,'index.html'),'utf8'),'localhost preview');
  const published = JSON.parse(await readFile(production.manifestPath,'utf8'));
  assert.equal(published.origin,'https://pcmadang.com');
  assert.equal(published.auditPreviewPages,false);
  assert.notEqual(published.fingerprint,JSON.parse(before).fingerprint);
  assert.equal(production.evidencePath,path.join(f.projectRoot,'artifacts/seo-production/lighthouse/evidence.json'));
});

test('rejects rooted paths, traversal, hidden directories, and empty overrides',async t => {
  const f = await fixture(t);
  for (const value of ['', ' ', '.', '..', '../outside', 'nested/../../outside', 'nested\\..\\outside', '/outside', 'C:\\outside', 'C:outside', '\\\\server\\share', '.git', 'nested/.private', 'dist.']) {
    for (const key of ['SITE_OUT_DIR','SEO_ARTIFACT_DIR']) {
      await assert.rejects(f.resolve({[key]:value}),new RegExp(key),`${key}=${value}`);
    }
  }
});

test('rejects overlapping output and evidence trees',async t => {
  const f = await fixture(t);
  for (const env of [
    {SITE_OUT_DIR:'release',SEO_ARTIFACT_DIR:'release'},
    {SITE_OUT_DIR:'release',SEO_ARTIFACT_DIR:'release/seo'},
    {SITE_OUT_DIR:'release/public',SEO_ARTIFACT_DIR:'release'},
  ]) await assert.rejects(f.resolve(env),/non-overlapping/);
});

test('rejects existing non-directory path components',async t => {
  const f = await fixture(t);
  await f.file('blocked','not a directory');
  await assert.rejects(f.resolve({SITE_OUT_DIR:'blocked/nested'}),/real directories/);
  await assert.rejects(f.resolve({SEO_ARTIFACT_DIR:'blocked'}),/real directories/);
});

test('rejects symlink or junction path components before writing',async t => {
  const f = await fixture(t);
  const actual = await f.directory('actual');
  const linked = path.join(f.projectRoot,'linked');
  try { await symlink(actual,linked,process.platform==='win32'?'junction':'dir'); }
  catch (error) {
    if (['EPERM','EACCES','ENOSYS'].includes(error.code)) {
      t.skip(`Environment does not allow symlink fixtures: ${error.code}`);
      return;
    }
    throw error;
  }
  f.trackFile(linked);
  await assert.rejects(f.resolve({SITE_OUT_DIR:'linked/nested'}),/real directories/);
  await assert.rejects(f.resolve({SEO_ARTIFACT_DIR:'linked'}),/real directories/);
});
