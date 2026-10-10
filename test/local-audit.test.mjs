import assert from 'node:assert/strict';
import test from 'node:test';
import {seoConfig} from '../seo.mjs';
import {effectiveSeoPolicy} from '../seo-policy.mjs';

const configKeys = ['SITE_ORIGIN', 'SITE_INDEXABLE', 'SITE_AUDIT_PREVIEWS'];
const sampleTypes = ['detail', 'post', 'board', 'empty-board'];

function withConfig(values, run) {
  const original = Object.fromEntries(configKeys.map(key => [key, process.env[key]]));
  try {
    for (const key of configKeys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    return run(seoConfig());
  } finally {
    for (const key of configKeys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

function effective(page, config, extras = {}) {
  return effectiveSeoPolicy({page, ...extras}, config.indexable, {
    auditPreviewPages: config.auditPreviewPages
  });
}

test('loopback origins enable template audits by default without changing saved-page privacy', () => {
  for (const origin of ['http://localhost:54633', 'http://127.0.0.1:54633', 'http://[::1]:54633']) {
    withConfig({SITE_ORIGIN: origin}, config => {
      assert.equal(config.indexable, true, origin);
      assert.equal(config.auditPreviewPages, true, origin);
      for (const page of sampleTypes) assert.equal(effective(page, config).indexable, true, `${origin} ${page}`);
      const saved = effective('saved', config);
      assert.equal(saved.indexable, false);
      assert.ok(saved.reason);
    });
  }
});

test('default local origin uses the same audit policy as explicit localhost', () => {
  withConfig({}, config => {
    assert.equal(config.origin, 'http://localhost:54633');
    assert.equal(config.auditPreviewPages, true);
    assert.equal(effective('detail', config).indexable, true);
  });
});

test('local audit opt-out preserves the preview exclusion policy', () => {
  withConfig({SITE_ORIGIN: 'http://localhost:54633', SITE_AUDIT_PREVIEWS: 'false'}, config => {
    assert.equal(config.indexable, true);
    assert.equal(config.auditPreviewPages, false);
    for (const page of sampleTypes) {
      const policy = effective(page, config);
      assert.equal(policy.indexable, false, page);
      assert.ok(policy.reason, page);
    }
    assert.equal(effective('home', config).indexable, true);
  });
});

test('site-wide noindex overrides local template audit preferences', () => {
  for (const auditPreference of [undefined, 'true', 'false']) {
    withConfig({SITE_ORIGIN: 'http://localhost:54633', SITE_INDEXABLE: 'false', SITE_AUDIT_PREVIEWS: auditPreference}, config => {
      assert.equal(config.indexable, false);
      assert.equal(config.auditPreviewPages, false);
      for (const page of ['home', ...sampleTypes, 'saved']) {
        const policy = effective(page, config);
        assert.equal(policy.indexable, false, `${page} ${auditPreference}`);
        assert.ok(policy.reason);
      }
    });
  }
});

test('hosted previews remain noindex by default and never implicitly enter template audit mode', () => {
  withConfig({SITE_ORIGIN: 'https://preview.example.com'}, config => {
    assert.equal(config.indexable, false);
    assert.equal(config.auditPreviewPages, false);
    for (const page of ['home', ...sampleTypes, 'saved']) assert.equal(effective(page, config).indexable, false, page);
  });
});

test('hosted indexing opt-in permits public pages but still excludes sample templates', () => {
  withConfig({SITE_ORIGIN: 'https://madang.example.com', SITE_INDEXABLE: 'true'}, config => {
    assert.equal(config.indexable, true);
    assert.equal(config.auditPreviewPages, false);
    assert.equal(effective('home', config).indexable, true);
    for (const page of [...sampleTypes, 'saved']) assert.equal(effective(page, config).indexable, false, page);
    assert.equal(effective('detail', config, {seo: {visibility: 'public'}}).indexable, true);
  });
});

test('template audit opt-in rejects external and lookalike localhost hostnames', () => {
  for (const origin of ['https://example.com', 'http://localhost.example.com', 'http://127.0.0.1.example.com']) {
    assert.throws(() => withConfig({SITE_ORIGIN: origin, SITE_INDEXABLE: 'true', SITE_AUDIT_PREVIEWS: 'true'}, () => {}), undefined, origin);
  }
});

test('an explicit page exclusion is never overridden by local template auditing', () => {
  withConfig({SITE_ORIGIN: 'http://localhost:54633'}, config => {
    const reason = '비공개 검토 중인 콘텐츠입니다.';
    for (const page of ['home', ...sampleTypes, 'saved']) {
      const policy = effective(page, config, {seo: {visibility: 'exclude', reason}});
      assert.equal(policy.indexable, false, page);
      assert.equal(policy.reason, reason, page);
    }
  });
});

test('existing sample-template noindex flags are auditable locally without enabling saved pages', () => {
  for (const page of sampleTypes) {
    assert.equal(effectiveSeoPolicy({page, noindex: true}, true, {auditPreviewPages: true}).indexable, true, page);
    assert.equal(effectiveSeoPolicy({page, noindex: true}, true).indexable, false, page);
  }
  assert.equal(effectiveSeoPolicy({page: 'saved', noindex: true}, true, {auditPreviewPages: true}).indexable, false);
});

test('policy calls without an explicit audit context keep preview exclusions', () => {
  for (const page of sampleTypes) assert.equal(effectiveSeoPolicy({page}, true).indexable, false, page);
  assert.equal(effectiveSeoPolicy({page: 'home'}, true).indexable, true);
});

test('audit mode still rejects unknown templates and conflicting explicit policies', () => {
  assert.throws(() => effectiveSeoPolicy({page: 'new-unknown-template'}, true, {auditPreviewPages: true}), /Unknown page type/);
  assert.throws(() => effectiveSeoPolicy({page: 'detail', noindex: true, seo: {visibility: 'public'}}, true, {auditPreviewPages: true}), /Conflicting/);
});
