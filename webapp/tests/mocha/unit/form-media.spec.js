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
  let storage;
  let localStorage;

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
    storage = { estimate: sinon.stub().resolves({ quota: 10000 * MB, usage: 100 * MB }) };
    localStorage = { getItem: sinon.stub().returns(null), setItem: sinon.stub() };
    global.window = {
      caches: cacheStorage,
      location: { origin: 'https://cht.test' },
      navigator: { storage },
      localStorage,
    };
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

    it('should download missing media, report progress and skip what is already stored', async () => {
      localDb.allDocs.resolves({ rows: [
        form('form:a', '1-a', { 'video/my clip.mp4': media('md5-new') }),
        form('form:b', '1-b', { 'old.mp4': media('md5-old') }),
        form('form:c', '1-c'),
      ] });
      cache.keys.resolves([{ url: key('md5-old') }]);
      cache.keys.withArgs(key('md5-new')).resolves([]);
      const response = { ok: true, body: 'stream' };
      global.fetch.resolves(response);
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
      expect(cache.put.args[0][1]).to.equal(response);
      expect(progress.args).to.deep.equal([[{ count: 0, total: 1 }], [{ count: 1, total: 1 }]]);
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

    it('should not download media stored since the sync started', async () => {
      localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a') })] });
      cache.keys.withArgs(key('md5-a')).resolves([{ url: key('md5-a') }]);

      await formMedia.syncMedia(localDb);

      expect(global.fetch.callCount).to.equal(0);
    });

    describe('repeated download failures', () => {
      const DAY = 24 * 60 * 60 * 1000;
      const MINUTE = 60 * 1000;
      const FAILURES_KEY = 'cht-form-media-download-failures';
      let failures;

      beforeEach(() => {
        failures = {};
        localStorage.getItem.withArgs(FAILURES_KEY).callsFake(() => JSON.stringify(failures));
        localStorage.setItem.withArgs(FAILURES_KEY).callsFake((storageKey, value) => failures = JSON.parse(value));
        localDb.allDocs.resolves({ rows: [
          form('form:a', '1-a', { 'x.mp4': media('md5-a') }),
          form('form:b', '1-b', { 'y.mp4': media('md5-b') }),
        ] });
        global.fetch.resolves({ ok: true, body: 'stream' });
        cache.match.resolves({ blob: sinon.stub().resolves({ size: 5 }) });
      });

      const expectFailure = async (message) => {
        let error;
        await formMedia.syncMedia(localDb).catch(err => error = err);
        expect(error && error.message).to.equal(message);
      };

      const SKIPPED = 'Skipping download of [x.mp4] of form [form:a] after repeated failures';

      it('should pause only the failing media after three failures', async () => {
        cache.put.withArgs(key('md5-a')).rejects(Object.assign(new Error('blob limit'), { name: 'NetworkError' }));

        await expectFailure('blob limit');
        await expectFailure('blob limit');
        await expectFailure('blob limit');
        await expectFailure(SKIPPED);

        expect(cache.put.withArgs(key('md5-a')).callCount).to.equal(3);
        expect(cache.put.withArgs(key('md5-b')).callCount).to.equal(4);
        expect(Object.keys(failures)).to.deep.equal([key('md5-a')]);
        expect(failures[key('md5-a')].count).to.equal(3);
      });

      it('should count incomplete downloads', async () => {
        cache.match.withArgs(key('md5-a')).resolves({ blob: sinon.stub().resolves({ size: 1 }) });

        await expectFailure('Incomplete download of [x.mp4] of form [form:a]: 1 of 5 bytes');

        expect(failures[key('md5-a')].count).to.equal(1);
      });

      it('should not count failures to reach the server or storage running out', async () => {
        global.fetch.onCall(0).rejects(new Error('offline'));
        global.fetch.onCall(1).resolves({ ok: false, status: 500 });
        await expectFailure('offline');

        cache.put.rejects(Object.assign(new Error('full'), { name: 'QuotaExceededError' }));
        await expectFailure('Storage full while saving [x.mp4] of form [form:a]');

        expect(failures).to.deep.equal({});
      });

      it('should try once more after a day and pause again when that fails', async () => {
        failures = { [key('md5-a')]: { count: 3, time: Date.now() - DAY - MINUTE } };
        cache.put.withArgs(key('md5-a')).rejects(new Error('blob limit'));

        await expectFailure('blob limit');
        await expectFailure(SKIPPED);

        expect(cache.put.withArgs(key('md5-a')).callCount).to.equal(1);
      });

      it('should not pause when the failure time is in the future', async () => {
        failures = { [key('md5-a')]: { count: 3, time: Date.now() + DAY } };

        await formMedia.syncMedia(localDb);

        expect(cache.put.withArgs(key('md5-a')).callCount).to.equal(1);
      });

      it('should forget failures after a successful download', async () => {
        failures = { [key('md5-a')]: { count: 2, time: Date.now() } };

        await formMedia.syncMedia(localDb);

        expect(failures).to.deep.equal({});
      });

      it('should forget failures of media no form needs', async () => {
        failures = { [key('md5-gone')]: { count: 3, time: Date.now() } };

        await formMedia.syncMedia(localDb);

        expect(failures).to.deep.equal({});
      });
    });

    describe('low storage', () => {
      const DAY = 24 * 60 * 60 * 1000;
      const MINUTE = 60 * 1000;

      beforeEach(() => {
        global.fetch.resolves({ ok: true, body: 'stream' });
        cache.match.resolves({ blob: sinon.stub().resolves({ size: 100 * MB }) });
      });

      const expectLowStorage = async () => {
        try {
          await formMedia.syncMedia(localDb);
          expect.fail('should have thrown');
        } catch (err) {
          expect(err.code).to.equal(formMedia.LOW_STORAGE);
          return err;
        }
      };

      it('should not download media that would leave less than 500MB free', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        storage.estimate.resolves({ quota: 1000 * MB, usage: 401 * MB });

        await expectLowStorage();

        expect(global.fetch.callCount).to.equal(0);
        expect(cache.put.callCount).to.equal(0);
      });

      it('should skip only the media that would not fit and not pause downloads', async () => {
        localDb.allDocs.resolves({ rows: [
          form('form:a', '1-a', { 'big.mp4': media('md5-a', 400 * MB) }),
          form('form:b', '1-b', { 'small.mp4': media('md5-b', 100 * MB) }),
        ] });
        storage.estimate.resolves({ quota: 1000 * MB, usage: 300 * MB });

        const err = await expectLowStorage();

        expect(err.storageFull).to.equal(false);
        expect(cache.put.args.map(([cacheKey]) => cacheKey)).to.deep.equal([key('md5-b')]);
        expect(localStorage.setItem.args).to.deep.equal([['cht-form-media-quota-failure', '0']]);
      });

      it('should use the free space reported by the android app when it is lower', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        global.window.medicmobile_android = {
          getDeviceInfo: sinon.stub().returns(JSON.stringify({ storage: { free: 550 * MB, total: 16000 * MB } })),
        };

        await expectLowStorage();

        expect(global.fetch.callCount).to.equal(0);
      });

      it('should fall back to the browser estimate when the android app cannot report free space', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        global.window.medicmobile_android = { getDeviceInfo: sinon.stub().returns('{"error":true}') };

        await formMedia.syncMedia(localDb);

        expect(global.fetch.callCount).to.equal(1);
      });

      it('should stop downloading and record the time when storage runs out', async () => {
        localDb.allDocs.resolves({ rows: [
          form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) }),
          form('form:b', '1-b', { 'y.mp4': media('md5-b', 100 * MB) }),
        ] });
        cache.put.rejects(Object.assign(new Error('full'), { name: 'QuotaExceededError' }));

        const err = await expectLowStorage();

        expect(err.storageFull).to.equal(true);
        expect(global.fetch.callCount).to.equal(1);
        const [storageKey, failedAt] = localStorage.setItem.lastCall.args;
        expect(storageKey).to.equal('cht-form-media-quota-failure');
        expect(Date.now() - Number(failedAt)).to.be.within(0, MINUTE);
      });

      it('should not download for a day after storage ran out', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        localStorage.getItem.returns(String(Date.now() - DAY + MINUTE));

        await expectLowStorage();

        expect(global.fetch.callCount).to.equal(0);
      });

      it('should try again a day after storage ran out', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        localStorage.getItem.returns(String(Date.now() - DAY - MINUTE));

        await formMedia.syncMedia(localDb);

        expect(global.fetch.callCount).to.equal(1);
        expect(localStorage.setItem.args).to.deep.equal([['cht-form-media-quota-failure', '0']]);
      });

      it('should not pause when the time storage ran out is in the future', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        localStorage.getItem.withArgs('cht-form-media-quota-failure').returns(String(Date.now() + 30 * DAY));

        await formMedia.syncMedia(localDb);

        expect(global.fetch.callCount).to.equal(1);
      });

      it('should still clean up unused media while storage is full', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        cache.keys.resolves([{ url: key('md5-gone') }]);
        localStorage.getItem.returns(String(Date.now()));

        await expectLowStorage();

        expect(cache.delete.args).to.deep.equal([[key('md5-gone')]]);
      });

      it('should not check storage when nothing needs downloading', async () => {
        localDb.allDocs.resolves({ rows: [form('form:a', '1-a', { 'x.mp4': media('md5-a', 100 * MB) })] });
        cache.keys.resolves([{ url: key('md5-a') }]);
        localStorage.getItem.returns(String(Date.now()));

        await formMedia.syncMedia(localDb);

        expect(storage.estimate.callCount).to.equal(0);
      });
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
      const blob = { size: 5 };
      global.fetch.resolves({ ok: true, blob: sinon.stub().resolves(blob) });
      expect(await formMedia.getMedia(formDoc, 'x.mp4')).to.equal(blob);
      expect(global.fetch.args[0][0]).to.equal('/medic/form%3Aa/x.mp4?rev=1-a');
    });

    describe('storing media fetched from the server', () => {
      const blob = { size: 5 };
      const flush = () => new Promise(resolve => setTimeout(resolve));

      beforeEach(() => {
        cache.match.resolves(undefined);
        global.fetch.resolves({ ok: true, blob: sinon.stub().resolves(blob) });
        sinon.stub(console, 'warn');
      });

      it('should store the media', async () => {
        await formMedia.getMedia(formDoc, 'x.mp4');
        await flush();

        expect(cache.put.args).to.deep.equal([[
          key('md5-a'),
          { body: blob, init: { headers: { 'Content-Type': 'video/mp4' } } },
        ]]);
      });

      it('should share one download between concurrent requests and forget it afterwards', async () => {
        const blobs = await Promise.all([formMedia.getMedia(formDoc, 'x.mp4'), formMedia.getMedia(formDoc, 'x.mp4')]);
        expect(blobs).to.deep.equal([blob, blob]);
        expect(global.fetch.callCount).to.equal(1);

        await flush();
        await formMedia.getMedia(formDoc, 'x.mp4');
        expect(global.fetch.callCount).to.equal(2);
      });

      it('should not share failed downloads with later requests', async () => {
        global.fetch.onCall(0).rejects(new Error('offline'));
        let error;
        await formMedia.getMedia(formDoc, 'x.mp4').catch(err => error = err);
        expect(error.message).to.equal('offline');

        await flush();
        expect(await formMedia.getMedia(formDoc, 'x.mp4')).to.equal(blob);
      });

      it('should not store media when there is not enough space', async () => {
        storage.estimate.resolves({ quota: 500 * MB, usage: 0 });
        expect(await formMedia.getMedia(formDoc, 'x.mp4')).to.equal(blob);
        await flush();
        expect(cache.put.callCount).to.equal(0);
      });

      it('should not store incomplete media', async () => {
        global.fetch.resolves({ ok: true, blob: sinon.stub().resolves({ size: 1 }) });
        await formMedia.getMedia(formDoc, 'x.mp4');
        await flush();
        expect(cache.put.callCount).to.equal(0);
      });

      it('should return the media without pausing downloads when it cannot be stored', async () => {
        cache.put.rejects(Object.assign(new Error('full'), { name: 'QuotaExceededError' }));
        expect(await formMedia.getMedia(formDoc, 'x.mp4')).to.equal(blob);
        await flush();
        expect(console.warn.callCount).to.equal(1);
        expect(localStorage.setItem.callCount).to.equal(0);
      });
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
  });

  describe('isFormMedia', () => {
    it('should only match media stored outside the local db', () => {
      const formDoc = { form_media: { 'x.mp4': {} } };
      expect(formMedia.isFormMedia(formDoc, 'x.mp4')).to.equal(true);
      expect(formMedia.isFormMedia(formDoc, 'y.mp4')).to.equal(false);
      expect(formMedia.isFormMedia({}, 'x.mp4')).to.equal(false);
      expect(formMedia.isFormMedia(undefined, 'x.mp4')).to.equal(false);
    });
  });
});
