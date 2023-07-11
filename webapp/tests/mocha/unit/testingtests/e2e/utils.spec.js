require('../../../../../../tests/aliases');
const assert = require('chai').assert;
const sinon = require('sinon');
const glob = require('glob');

const utils = require('../../../../../../tests/utils');
const suites = require('../../../../../../tests/constants');

describe('Test utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('deleteAllDocs', () => {
    it('Deletes all docs and infodocs except some core ones', () => {
      const request = sinon.stub(utils, 'requestOnTestDb');
      request.onFirstCall().resolves({rows: [
        {id: '_design/cats', doc: {_id: '_design/cats'}},
        {id: 'service-worker-meta', doc: {_id: 'service-worker-meta'}},
        {id: 'migration-log', doc: {_id: 'migration-log'}},
        {id: 'resources', doc: {_id: 'resources'}},
        {id: 'branding', doc: {_id: 'branding'}},
        {id: 'partners', doc: {_id: 'partners'}},
        {id: '001', doc: {type: 'translations'}},
        {id: '002', doc: {type: 'translations-backup'}},
        {id: '003', doc: {type: 'user-settings'}},
        {id: '004', doc: {type: 'info'}},
        {id: 'ME', doc: {_id: 'ME', _rev: 1}}
      ]});
      request.onSecondCall().resolves();

      const sentinelAllDocs = sinon.stub(utils.sentinelDb, 'allDocs');
      sentinelAllDocs.resolves({
        rows: [{
          id: 'me-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      const sentinelBulkDocs = sinon.stub(utils.sentinelDb, 'bulkDocs');
      sentinelBulkDocs.resolves();

      return utils.deleteAllDocs()
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path, '/_bulk_docs');
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, type: 'tombstone', _rev: 1}]});
          assert.deepEqual(sentinelBulkDocs.args[0][0], [{_id: 'me-info', _rev: '1-abc', _deleted: true}]);
        });
    });
    it('Supports extra strings as exceptions', () => {
      const request = sinon.stub(utils, 'requestOnTestDb');
      request.onFirstCall().resolves({rows: [
        {id: 'ME', doc: {_id: 'ME', _rev: 1}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]});
      request.onSecondCall().resolves();

      const sentinelAllDocs = sinon.stub(utils.sentinelDb, 'allDocs');
      sentinelAllDocs.resolves({
        rows: [{
          id: 'ME-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      const sentinelBulkDocs = sinon.stub(utils.sentinelDb, 'bulkDocs');
      sentinelBulkDocs.resolves();

      return utils.deleteAllDocs(['YOU'])
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.deepEqual(sentinelBulkDocs.args[0][0], [{_id: 'ME-info', _rev: '1-abc', _deleted: true}]);
          assert.equal(deleteOptions.path, '/_bulk_docs');
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, type: 'tombstone', _rev: 1}]});
        });
    });
    it('Supports extra regex as exceptions', () => {
      const request = sinon.stub(utils, 'requestOnTestDb');
      request.onFirstCall().resolves({rows: [
        {id: 'ME', doc: {_id: 'ME', _rev: 1}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]});
      request.onSecondCall().resolves();

      const sentinelAllDocs = sinon.stub(utils.sentinelDb, 'allDocs');
      sentinelAllDocs.resolves({
        rows: [{
          id: 'ME-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      const sentinelBulkDocs = sinon.stub(utils.sentinelDb, 'bulkDocs');
      sentinelBulkDocs.resolves();

      return utils.deleteAllDocs([/^YOU$/])
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path, '/_bulk_docs');
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, type: 'tombstone', _rev: 1}]});
        });
    });
    it('Supports extra functions as exceptions', () => {
      const request = sinon.stub(utils, 'requestOnTestDb');
      request.onFirstCall().resolves({rows: [
        {id: 'ME', doc: {_id: 'ME', _rev: 1}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]});
      request.onSecondCall().resolves();

      const sentinelAllDocs = sinon.stub(utils.sentinelDb, 'allDocs');
      sentinelAllDocs.resolves({
        rows: [{
          id: 'ME-info',
          value: {
            rev: '1-abc'
          }
        }]
      });
      const sentinelBulkDocs = sinon.stub(utils.sentinelDb, 'bulkDocs');
      sentinelBulkDocs.resolves();


      return utils.deleteAllDocs([doc => doc._id === 'YOU'])
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path, '/_bulk_docs');
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, type: 'tombstone', _rev: 1}]});
        });
    });
  });
  
  it('Check that all test specs belong to a test suites', () => {
    const testFolders = [];
    for (const [, value] of Object.entries(suites)) {
      value.forEach(path => testFolders.push(path.split('/')[1]));
    }
    const getDirectories =   (src, callback) => {
      glob(src, callback);
    };
    //get all spec files in tests/e2e/default
    getDirectories('../../../../../../tests/e2e/default/**/*.wdio-spec.js', (err, res)  => {
      if (err) {
        console.log('Error', err);
      } else {
        res.forEach( spec => {
          assert(testFolders.includes(spec.split('/')[3]), spec + ' does not belong to a folder' );
        }); 
      }
    });
  });
});
