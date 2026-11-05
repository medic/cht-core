const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const MB = 1024 * 1024;

describe('form media', () => {
  let formMedia;
  let cache;
  let remoteDb;
  let localDb;
  let originalWindow;
  let originalCaches;
  let originalFetch;
  let originalResponse;

  const key = digest => `https://cht.test/form-media/${encodeURIComponent(digest)}`;
  const stub = (length, digest = 'md5-a', content_type = 'video/mp4') => ({ content_type, digest, length, stub: true });

  beforeEach(() => {
    originalWindow = global.window;
    originalCaches = global.caches;
    originalFetch = global.fetch;
    originalResponse = global.Response;
    cache = {
      keys: sinon.stub().resolves([]),
      put: sinon.stub().resolves(),
      match: sinon.stub(),
      delete: sinon.stub().resolves(true),
    };
    const cacheStorage = { open: sinon.stub().resolves(cache), delete: sinon.stub().resolves(true) };
    global.window = { caches: cacheStorage, location: { origin: 'https://cht.test' } };
    global.caches = cacheStorage;
    global.fetch = sinon.stub();
    global.Response = sinon.stub().callsFake((body, init) => ({ body, init }));
    remoteDb = { get: sinon.stub(), getAttachment: sinon.stub() };
    localDb = { bulkDocs: sinon.stub().resolves([]), allDocs: sinon.stub() };
    formMedia = rewire('../../../src/js/bootstrapper/form-media');
  });

  afterEach(() => {
    sinon.restore();
    global.window = originalWindow;
    global.caches = originalCaches;
    global.fetch = originalFetch;
    global.Response = originalResponse;
  });

  describe('isFormId', () => {
    it('should only match form docs', () => {
      expect(formMedia.isFormId('form:delivery')).to.equal(true);
      expect(formMedia.isFormId('settings')).to.equal(false);
    });
  });

  describe('replicateFormDoc', () => {
    it('should store all attachments in the local db when media is small', async () => {
      remoteDb.get.resolves({
        _id: 'form:a',
        _rev: '2-x',
        _attachments: { xml: stub(10), 'img.png': stub(MB) },
      });
      remoteDb.getAttachment.callsFake((id, name) => Promise.resolve(`blob-${name}`));

      await formMedia.replicateFormDoc(remoteDb, localDb, { id: 'form:a', rev: '2-x' });

      expect(remoteDb.get.args).to.deep.equal([['form:a', { rev: '2-x', revs: true }]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [{
          _id: 'form:a',
          _rev: '2-x',
          _attachments: {
            xml: { content_type: 'video/mp4', data: 'blob-xml' },
            'img.png': { content_type: 'video/mp4', data: 'blob-img.png' },
          },
        }],
        { new_edits: false },
      ]]);
    });

    it('should keep the form definition and record large media separately', async () => {
      remoteDb.get.resolves({
        _id: 'form:a',
        _rev: '2-x',
        _attachments: {
          xml: stub(10, 'md5-x', 'application/xml'),
          'form.html': stub(10, 'md5-h', 'text/html'),
          'model.xml': stub(10, 'md5-m', 'text/xml'),
          'video/a.mp4': stub(8 * MB, 'md5-1'),
          'video/b.mp4': stub(8 * MB, 'md5-2'),
        },
      });
      remoteDb.getAttachment.callsFake((id, name) => Promise.resolve(`blob-${name}`));

      const doc = await formMedia.replicateFormDoc(remoteDb, localDb, { id: 'form:a', rev: '2-x' });

      expect(Object.keys(doc._attachments)).to.have.members(['xml', 'form.html', 'model.xml']);
      expect(remoteDb.getAttachment.callCount).to.equal(3);
      expect(doc.form_media).to.deep.equal({
        'video/a.mp4': { content_type: 'video/mp4', digest: 'md5-1', length: 8 * MB },
        'video/b.mp4': { content_type: 'video/mp4', digest: 'md5-2', length: 8 * MB },
      });
    });

    it('should store large media in the local db when the cache api is not available', async () => {
      delete global.window.caches;
      remoteDb.get.resolves({ _id: 'form:a', _rev: '2-x', _attachments: { 'a.mp4': stub(20 * MB) } });
      remoteDb.getAttachment.resolves('blob');

      const doc = await formMedia.replicateFormDoc(remoteDb, localDb, { id: 'form:a', rev: '2-x' });

      expect(doc.form_media).to.equal(undefined);
      expect(doc._attachments['a.mp4'].data).to.equal('blob');
    });

    it('should support forms without attachments', async () => {
      remoteDb.get.resolves({ _id: 'form:a', _rev: '2-x' });
      const doc = await formMedia.replicateFormDoc(remoteDb, localDb, { id: 'form:a', rev: '2-x' });
      expect(doc._attachments).to.deep.equal({});
      expect(localDb.bulkDocs.callCount).to.equal(1);
    });

    it('should throw when the local write reports an error', async () => {
      remoteDb.get.resolves({ _id: 'form:a', _rev: '2-x' });
      localDb.bulkDocs.resolves([{ error: 'quota', reason: 'quota exceeded' }]);
      try {
        await formMedia.replicateFormDoc(remoteDb, localDb, { id: 'form:a', rev: '2-x' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Failed to save form [form:a]: quota exceeded');
      }
    });
  });

  describe('syncMedia', () => {
    const form = (id, rev, form_media) => ({ doc: { _id: id, _rev: rev, form_media } });
    const media = (digest, length = 5) => ({ content_type: 'video/mp4', digest, length });

    it('should do nothing when the cache api is not available', async () => {
      delete global.window.caches;
      await formMedia.syncMedia(localDb);
      expect(localDb.allDocs.callCount).to.equal(0);
    });

    it('should download missing media, report progress and skip what is already stored', async () => {
      localDb.allDocs.resolves({ rows: [
        form('form:a', '1-a', { 'video/my clip.mp4': media('md5-new') }),
        form('form:b', '1-b', { 'old.mp4': media('md5-old') }),
        form('form:c', '1-c'),
      ] });
      cache.keys.resolves([{ url: key('md5-old') }]);
      global.fetch.resolves({ ok: true, body: 'stream' });
      cache.match.resolves({ blob: sinon.stub().resolves({ size: 5 }) });
      const progress = sinon.stub();

      await formMedia.syncMedia(localDb, progress);

      expect(localDb.allDocs.args).to.deep.equal([[
        { startkey: 'form:', endkey: 'form:￰', include_docs: true },
      ]]);
      expect(global.fetch.args).to.deep.equal([[
        '/medic/form%3Aa/video/my%20clip.mp4?rev=1-a',
        { credentials: 'same-origin' },
      ]]);
      expect(cache.put.callCount).to.equal(1);
      expect(cache.put.args[0][0]).to.equal(key('md5-new'));
      expect(cache.put.args[0][1]).to.deep.equal({
        body: 'stream',
        init: { headers: { 'Content-Type': 'video/mp4' } },
      });
      expect(progress.args).to.deep.equal([[{ count: 0, total: 1 }]]);
      expect(cache.delete.callCount).to.equal(0);
    });

    it('should only download media shared between forms once', async () => {
      localDb.allDocs.resolves({ rows: [
        form('form:a', '1-a', { 'x.mp4': media('md5-same') }),
        form('form:b', '1-b', { 'y.mp4': media('md5-same') }),
      ] });
      global.fetch.resolves({ ok: true, body: 'stream' });
      cache.match.resolves({ blob: sinon.stub().resolves({ size: 5 }) });

      await formMedia.syncMedia(localDb);

      expect(global.fetch.callCount).to.equal(1);
    });

    it('should delete media no form needs before downloading', async () => {
      localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-new') })] });
      cache.keys.resolves([{ url: key('md5-gone') }]);
      global.fetch.resolves({ ok: true, body: 'stream' });
      cache.match.resolves({ blob: sinon.stub().resolves({ size: 5 }) });

      await formMedia.syncMedia(localDb);

      expect(cache.delete.args).to.deep.equal([[key('md5-gone')]]);
      expect(cache.delete.calledBefore(global.fetch)).to.equal(true);
    });

    it('should delete truncated downloads and report them', async () => {
      localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100) })] });
      global.fetch.resolves({ ok: true, body: 'stream' });
      cache.match.resolves({ blob: sinon.stub().resolves({ size: 5 }) });

      try {
        await formMedia.syncMedia(localDb);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Incomplete download of [x.mp4] of form [form:a]: 5 of 100 bytes');
      }
      expect(cache.delete.args).to.deep.equal([[key('md5-a')]]);
    });

    it('should keep downloading other media after a failure and then throw with the status', async () => {
      localDb.allDocs.resolves({ rows: [
        form('form:a', '1-a', { 'x.mp4': media('md5-a') }),
        form('form:b', '1-b', { 'y.mp4': media('md5-b') }),
      ] });
      global.fetch.onCall(0).resolves({ ok: false, status: 401 });
      global.fetch.onCall(1).resolves({ ok: true, body: 'stream' });
      cache.match.resolves({ blob: sinon.stub().resolves({ size: 5 }) });

      try {
        await formMedia.syncMedia(localDb);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(401);
      }
      expect(cache.put.callCount).to.equal(1);
    });

    it('should not run concurrently and should allow a new run afterwards', async () => {
      localDb.allDocs.resolves({ rows: [] });
      await Promise.all([formMedia.syncMedia(localDb), formMedia.syncMedia(localDb)]);
      expect(localDb.allDocs.callCount).to.equal(1);
      await formMedia.syncMedia(localDb);
      expect(localDb.allDocs.callCount).to.equal(2);
    });
  });

  describe('getMedia', () => {
    const formDoc = {
      _id: 'form:a',
      _rev: '1-a',
      form_media: { 'x.mp4': { content_type: 'video/mp4', digest: 'md5-a', length: 5 } },
    };

    it('should return nothing for attachments stored in the local db', async () => {
      expect(await formMedia.getMedia({ _id: 'form:a' }, 'x.mp4')).to.equal(undefined);
      expect(await formMedia.getMedia(formDoc, 'other.mp4')).to.equal(undefined);
      expect(await formMedia.getMedia(undefined, 'x.mp4')).to.equal(undefined);
    });

    it('should return the cached blob', async () => {
      cache.match.resolves({ blob: sinon.stub().resolves('cached') });
      expect(await formMedia.getMedia(formDoc, 'x.mp4')).to.equal('cached');
      expect(cache.match.args).to.deep.equal([[key('md5-a')]]);
      expect(global.fetch.callCount).to.equal(0);
    });

    it('should fall back to the server when the media is not cached', async () => {
      cache.match.resolves(undefined);
      global.fetch.resolves({ ok: true, blob: sinon.stub().resolves('remote') });
      expect(await formMedia.getMedia(formDoc, 'x.mp4')).to.equal('remote');
      expect(global.fetch.args[0][0]).to.equal('/medic/form%3Aa/x.mp4?rev=1-a');
    });

    it('should throw when the media is not cached and cannot be fetched', async () => {
      cache.match.resolves(undefined);
      global.fetch.resolves({ ok: false, status: 404 });
      try {
        await formMedia.getMedia(formDoc, 'x.mp4');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(404);
      }
    });
  });

  describe('clear', () => {
    it('should delete the cache', async () => {
      await formMedia.clear();
      expect(global.window.caches.delete.args).to.deep.equal([['cht-form-media']]);
    });

    it('should do nothing when the cache api is not available', async () => {
      delete global.window.caches;
      expect(await formMedia.clear()).to.equal(false);
    });
  });
});
