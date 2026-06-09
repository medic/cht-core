const sinon = require('sinon');
const { expect } = require('chai');
const service = require('../../../src/services/ui-extension');
const db = require('../../../src/db');
const { PREFIXES, DOC_TYPES } = require('@medic/constants');

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
      expect(service.isExtensionChange({ id: `${PREFIXES.UI_EXTENSION}my-ext` })).to.be.true;
    });
  });

  describe('getScript', () => {
    it('handles 404', async () => {
      dbGet.rejects({ status: 404 });
      const actual = await service.getScript('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, { attachments: true });
    });

    it('throws anything else', async () => {
      dbGet.rejects({ status: 500 });
      try {
        await service.getScript('test');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e.status).to.equal(500);
        expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, { attachments: true });
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
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, { attachments: true });
    });

    it('returns null when the doc has no extension.js attachment', async () => {
      dbGet.resolves({ type: DOC_TYPES.UI_EXTENSION });
      const actual = await service.getScript('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, { attachments: true });
    });

    it('returns attachment data', async () => {
      dbGet.resolves({
        type: DOC_TYPES.UI_EXTENSION,
        _attachments: {
          'extension.js': { data: 'my-script' }
        }
      });
      const actual = await service.getScript('test');
      expect(actual.data).to.equal('my-script');
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, { attachments: true });
    });
  });

  describe('getScriptDigest', () => {
    it('handles 404', async () => {
      dbGet.rejects({ status: 404 });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, {});
    });

    it('throws anything else', async () => {
      dbGet.rejects({ status: 500 });
      try {
        await service.getScriptDigest('test');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e.status).to.equal(500);
        expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, {});
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
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, {});
    });

    it('returns null when the doc has no extension.js attachment', async () => {
      dbGet.resolves({ type: DOC_TYPES.UI_EXTENSION });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.be.null;
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, {});
    });

    it('returns the attachment digest without downloading the attachment', async () => {
      dbGet.resolves({
        type: DOC_TYPES.UI_EXTENSION,
        _attachments: {
          'extension.js': { digest: 'md5-abc', stub: true }
        }
      });
      const actual = await service.getScriptDigest('test');
      expect(actual).to.equal('md5-abc');
      expect(dbGet).to.have.been.calledOnceWithExactly(`${PREFIXES.UI_EXTENSION}test`, {});
    });
  });

  describe('getAllProperties', () => {
    it('removes CouchDB fields and maps id', async () => {
      allDocs.resolves({
        rows: [
          {
            doc: {
              _id: `${PREFIXES.UI_EXTENSION}my-ext`,
              _rev: '1-something',
              _attachments: {},
              type: DOC_TYPES.UI_EXTENSION,
              name: 'My Extension',
              version: '1.0'
            }
          },
          {
            doc: {
              _id: `${PREFIXES.UI_EXTENSION}another-ext`,
              type: DOC_TYPES.UI_EXTENSION,
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
        startkey: PREFIXES.UI_EXTENSION,
        endkey: `${PREFIXES.UI_EXTENSION}\ufff0`,
        include_docs: true,
      });
    });

    it('filters out docs that are not ui-extensions', async () => {
      allDocs.resolves({
        rows: [
          {
            doc: {
              _id: `${PREFIXES.UI_EXTENSION}my-ext`,
              type: DOC_TYPES.UI_EXTENSION,
              name: 'My Extension',
            }
          },
          {
            doc: {
              _id: `${PREFIXES.UI_EXTENSION}not-an-ext`,
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
        startkey: PREFIXES.UI_EXTENSION,
        endkey: `${PREFIXES.UI_EXTENSION}\ufff0`,
        include_docs: true,
      });
    });

    it('returns an empty array when no ui-extension docs exist', async () => {
      allDocs.resolves({ rows: [] });

      const actual = await service.getAllProperties();
      expect(actual).to.be.empty;
      expect(allDocs).to.have.been.calledOnceWithExactly({
        startkey: PREFIXES.UI_EXTENSION,
        endkey: `${PREFIXES.UI_EXTENSION}\ufff0`,
        include_docs: true,
      });
    });
  });
});
