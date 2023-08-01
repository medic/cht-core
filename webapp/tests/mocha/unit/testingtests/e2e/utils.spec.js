require('../../../../../../tests/aliases');
const assert = require('chai').assert;
const sinon = require('sinon');
const glob = require('glob');
const path = require('path');

const utils = require('../../../../../../tests/utils');
const { suites } = require('../../../../../../tests/e2e/default/suites');

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
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, _rev: 1}]});
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
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, _rev: 1}]});
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
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, _rev: 1}]});
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
          assert.deepEqual(deleteOptions.body, {docs: [{_id: 'ME', _deleted: true, _rev: 1}]});
        });
    });
  });
  
  it('Check that all test specs belong to a test suites', async () => {
    const pathToDefaultTesting = path.resolve(__dirname, '../../../../../../tests/e2e/default');
    const suiteSpecs = [];
    const getDirectories = (src) =>
      new Promise((resolve, reject) => glob(src, (err, res) => err ? reject(err) : resolve(res)));

    for (const relativePaths of Object.values(suites)) {
      for (const relativePath of relativePaths) {
        const resolvedPath = path.resolve(pathToDefaultTesting, relativePath);
        suiteSpecs.push(...await getDirectories(resolvedPath));
      }
    }

    const allSpecs = await getDirectories(path.join(pathToDefaultTesting, '/**/*.wdio-spec.js'));
    assert.sameMembers(allSpecs, suiteSpecs);
  }); 
});
