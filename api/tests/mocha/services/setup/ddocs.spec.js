const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../../src/db');
const ddocsService = require('../../../../src/services/setup/ddocs');

describe('Upgrade ddocs library', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getDdocs', () => {
    it('should return ddocs', async () => {
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { id: 'ddoc1', key: 'ddoc1', value: { rev: 'rev1' }, doc: { _id: 'ddoc1', _rev: 'rev1', field: 'a' }  },
        { id: 'ddoc2', key: 'ddoc2', value: { rev: 'rev2' }, doc: { _id: 'ddoc2', _rev: 'rev2', field: 'b' }, },
      ] });

      const result = await ddocsService.getDdocs({ db: db.sentinel });

      expect(result).to.deep.equal([
        { _id: 'ddoc1', _rev: 'rev1', field: 'a' },
        { _id: 'ddoc2', _rev: 'rev2', field: 'b' },
      ]);
      expect(db.sentinel.allDocs.callCount).to.equal(1);
      expect(db.sentinel.allDocs.args[0]).to.deep.equal([{
        startkey: '_design/', endkey: `_design/\ufff0`, include_docs: true,
      }]);
    });

    it('should throw error on allDocs error', async () => {
      sinon.stub(db.medicLogs, 'allDocs').rejects({ the: 'err' });

      try {
        await ddocsService.getDdocs({ db: db.medicLogs });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'err' });
      }
    });
  });

  describe('getStagedDdocs', () => {
    it('should currently staged ddocs', async () => {
      sinon.stub(db.medicLogs, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:one', _rev: '1' } },
          { doc: { _id: '_design/:staged:two', _rev: '2' } },
          { doc: { _id: '_design/:staged:three', _rev: '3' } },
        ],
      });

      const result = await ddocsService.getStagedDdocs({ db: db.medicLogs });

      expect(db.medicLogs.allDocs.callCount).to.equal(1);
      expect(db.medicLogs.allDocs.args[0]).to.deep.equal([{
        startkey: '_design/:staged:',
        endkey: '_design/:staged:\ufff0',
        include_docs: true,
      }]);
      expect(result).to.deep.equal([
        { _id: '_design/:staged:one', _rev: '1' },
        { _id: '_design/:staged:two', _rev: '2' },
        { _id: '_design/:staged:three', _rev: '3' },
      ]);
    });

    it('should throw allDocs errors', async () => {
      sinon.stub(db.sentinel, 'allDocs').rejects({ this: 'error' });

      try {
        await ddocsService.getStagedDdocs({ db: db.sentinel });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ this: 'error' });
        expect(db.sentinel.allDocs.callCount).to.equal(1);
      }
    });
  });

  describe('compareDdocs', () => {
    it('should return empty lists when all bundled are uploaded', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];

      expect(ddocsService.compareDdocs(bundled, uploaded)).to.deep.equal({ missing: [], different: [] });
    });

    it('should return empty lists when all bundled are staged', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/:staged:two', version: '4.0.1-thing' },
        { _id: '_design/:staged:one', version: '4.0.1-thing' },
        { _id: '_design/:staged:three', version: '4.0.1-thing' },
      ];

      expect(ddocsService.compareDdocs(bundled, uploaded)).to.deep.equal({ missing: [], different: [] });
    });

    it('should return missing ddocs', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/:staged:two', version: '4.0.1-thing' },
        { _id: '_design/:staged:three', version: '4.0.1-thing' },
      ];

      expect(ddocsService.compareDdocs(bundled, uploaded)).to.deep.equal({ missing: ['_design/one'], different: [] });
    });

    it('should return different ddocs, comparing version', () => {
      const bundled = [
        { _id: '_design/one', version: '4.0.1-thing' },
        { _id: '_design/two', version: '4.0.1-thing' },
        { _id: '_design/three', version: '4.0.1-thing' },
      ];
      const uploaded = [
        { _id: '_design/:staged:two', version: '4.0.1-thing' },
        { _id: '_design/:staged:one', version: '4.0.2-thing' },
        { _id: '_design/:staged:three', version: '4.0.3-thing' },
      ];

      expect(ddocsService.compareDdocs(bundled, uploaded)).to.deep.equal({
        different: ['_design/one', '_design/three'],
        missing: [],
      });
    });
  });
});
