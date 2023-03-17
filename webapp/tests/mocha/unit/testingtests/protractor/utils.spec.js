const assert = require('chai').assert;
const sinon = require('sinon');

const utils = require('../../../../../../tests/utils');
const sentinelUtils = require('../../../../../../tests/utils/sentinel');

describe('Protractor utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('deleteAllDocs', () => {
    it('Deletes all docs and infodocs except some core ones', () => {
      sinon.stub(sentinelUtils, 'skipToSeq');
      sinon.stub(utils.db, 'allDocs').resolves({ rows: [
        { id: '_design/cats', value: { rev: 1 } },
        { id: 'service-worker-meta', value: { rev: 1 } },
        { id: 'migration-log', value: { rev: 1 } },
        { id: 'resources', value: { rev: 1 } },
        { id: 'branding', value: { rev: 1 } },
        { id: 'partners', value: { rev: 1 } },
        { id: 'messages-001', value: { rev: 1 } },
        { id: 'org.couchdb.user:003', value: { rev: 1 } },
        { id: 'ME', value: { rev: 1 } }
      ]});
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [{
          id: 'me-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();

      return utils
        .deleteAllDocs()
        .then(() => {
          assert.deepEqual(utils.db.bulkDocs.args[0][0], [{ _id: 'ME', _deleted: true, _rev: 1 }]);
          assert.deepEqual(utils.sentinelDb.bulkDocs.args[0][0], [{_id: 'me-info', _rev: '1-abc', _deleted: true}]);
        });
    });
    it('Supports extra strings as exceptions', () => {
      sinon.stub(sentinelUtils, 'skipToSeq');

      sinon.stub(utils.db, 'allDocs').resolves({ rows: [
        { id: 'ME', value: { rev: 'MEred'} },
        { id: 'YOU', value: { rev: 'YOU' } },
      ]});
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [{
          id: 'ME-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();

      return utils.deleteAllDocs(['YOU'])
        .then(() => {
          assert.deepEqual(utils.sentinelDb.bulkDocs.args[0][0], [{ _id: 'ME-info', _rev: '1-abc', _deleted: true}]);
          assert.deepEqual(utils.db.bulkDocs.args[0][0], [{ _id: 'ME', _deleted: true, _rev: 'MEred'}]);
        });
    });
    it('Supports extra regex as exceptions', () => {
      sinon.stub(sentinelUtils, 'skipToSeq');

      sinon.stub(utils.db, 'allDocs').resolves({ rows: [
        { id: 'ME', value: { rev: 'MEred'} },
        { id: 'YOU', value: { rev: 'YOU' } },
      ]});
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [{
          id: 'ME-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();

      return utils
        .deleteAllDocs([/^YOU$/])
        .then(() => {
          assert.deepEqual(utils.db.bulkDocs.args[0][0], [{ _id: 'ME', _deleted: true, _rev: 'MEred'}]);
        });
    });

    it('Supports extra functions as exceptions', () => {
      sinon.stub(sentinelUtils, 'skipToSeq');

      sinon.stub(utils.db, 'allDocs').resolves({ rows: [
        { id: 'ME', value: { rev: 'MEred'} },
        { id: 'YOU', value: { rev: 'YOU' } },
      ]});
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [{
          id: 'ME-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();

      return utils
        .deleteAllDocs([id => id === 'YOU'])
        .then(() => {
          assert.deepEqual(utils.db.bulkDocs.args[0][0], [{ _id: 'ME', _deleted: true, _rev: 'MEred'}]);
        });
    });
  });
});
