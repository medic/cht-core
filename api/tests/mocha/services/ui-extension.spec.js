const sinon = require('sinon');
const { expect } = require('chai');
const service = require('../../../src/services/ui-extension');
const db = require('../../../src/db');

describe('UI Extension service', () => {
  let dbGet;
  let allDocs;

  beforeEach(() => {
    dbGet = sinon.stub(db.medic, 'get');
    allDocs = sinon.stub(db.medic, 'allDocs');
  });

  afterEach(() => sinon.restore());

  describe('isExtensionChange', () => {
    it('is falsy for unrelated doc', () => {
      expect(service.isExtensionChange({ id: 'some-other-doc' })).to.be.false;
    });

    it('returns true for a ui-extension doc', () => {
      expect(service.isExtensionChange({ id: 'ui-extension:my-ext' })).to.be.true;
    });
  });

  describe('getScript', () => {
    it('handles 404', async () => {
      dbGet.rejects({ status: 404 });
      const actual = await service.getScript('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', { attachments: true });
    });

    it('throws anything else', async () => {
      dbGet.rejects({ status: 500 });
      try {
        await service.getScript('test');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e.status).to.equal(500);
        expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', { attachments: true });
      }
    });

    it('returns null when the doc is not a ui-extension', async () => {
      dbGet.resolves({
        type: 'something-else',
        _attachments: {
          'extension.js': { data: 'my-script' }
        }
      });
      const actual = await service.getScript('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', { attachments: true });
    });

    it('returns null when the doc has no extension.js attachment', async () => {
      dbGet.resolves({ type: 'ui-extension' });
      const actual = await service.getScript('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', { attachments: true });
    });

    it('returns attachment data', async () => {
      dbGet.resolves({
        type: 'ui-extension',
        _attachments: {
          'extension.js': { data: 'my-script' }
        }
      });
      const actual = await service.getScript('test');
      expect(actual.data).to.equal('my-script');
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', { attachments: true });
    });
  });

  describe('getScriptDigest', () => {
    it('handles 404', async () => {
      dbGet.rejects({ status: 404 });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', {});
    });

    it('throws anything else', async () => {
      dbGet.rejects({ status: 500 });
      try {
        await service.getScriptDigest('test');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e.status).to.equal(500);
        expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', {});
      }
    });

    it('returns null when the doc is not a ui-extension', async () => {
      dbGet.resolves({
        type: 'something-else',
        _attachments: {
          'extension.js': { digest: 'md5-abc' }
        }
      });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', {});
    });

    it('returns null when the doc has no extension.js attachment', async () => {
      dbGet.resolves({ type: 'ui-extension' });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', {});
    });

    it('returns the attachment digest without downloading the attachment', async () => {
      dbGet.resolves({
        type: 'ui-extension',
        _attachments: {
          'extension.js': { digest: 'md5-abc', stub: true }
        }
      });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.equal('md5-abc');
      expect(dbGet).to.have.been.calledOnceWithExactly('ui-extension:test', {});
    });
  });

  describe('getAllProperties', () => {
    it('removes CouchDB fields and maps id', async () => {
      allDocs.resolves({
        rows: [
          {
            doc: {
              _id: 'ui-extension:my-ext',
              _rev: '1-something',
              _attachments: {},
              type: 'ui-extension',
              name: 'My Extension',
              version: '1.0'
            }
          },
          {
            doc: {
              _id: 'ui-extension:another-ext',
              type: 'ui-extension',
            }
          }
        ]
      });

      const actual = await service.getAllProperties();
      expect(actual).to.deep.equal([
        {
          id: 'my-ext',
          name: 'My Extension',
          version: '1.0'
        },
        { id: 'another-ext' }
      ]);
      expect(allDocs).to.have.been.calledOnceWithExactly({
        startkey: 'ui-extension:',
        endkey: `ui-extension:\ufff0`,
        include_docs: true,
      });
    });

    it('filters out docs that are not ui-extensions', async () => {
      allDocs.resolves({
        rows: [
          {
            doc: {
              _id: 'ui-extension:my-ext',
              type: 'ui-extension',
              name: 'My Extension',
            }
          },
          {
            doc: {
              _id: 'ui-extension:not-an-ext',
              type: 'something-else',
              name: 'Not An Extension',
            }
          }
        ]
      });

      const actual = await service.getAllProperties();
      expect(actual).to.deep.equal([
        {
          id: 'my-ext',
          name: 'My Extension',
        }
      ]);
      expect(allDocs).to.have.been.calledOnceWithExactly({
        startkey: 'ui-extension:',
        endkey: `ui-extension:\ufff0`,
        include_docs: true,
      });
    });

    it('returns an empty array when no ui-extension docs exist', async () => {
      allDocs.resolves({ rows: [] });

      const actual = await service.getAllProperties();
      expect(actual).to.be.empty;
      expect(allDocs).to.have.been.calledOnceWithExactly({
        startkey: 'ui-extension:',
        endkey: `ui-extension:\ufff0`,
        include_docs: true,
      });
    });
  });
});
