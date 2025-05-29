require('../../../../../../tests/aliases');
const expect = require('chai').expect;
const sinon = require('sinon');
const { glob } = require('glob');
const path = require('path');

const utils = require('../../../../../../tests/utils');
const sentinelUtils = require('../../../../../../tests/utils/sentinel');
const { suites } = require('../../../../../../tests/e2e/default/suites');

describe('Test utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('deleteAllDocs', () => {
    it('Deletes all docs and infodocs except some core ones', async () => {
      sinon.stub(sentinelUtils, 'skipToSeq');
      sinon.stub(utils.db, 'allDocs').resolves({rows: [
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
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [
          { id: 'me-info', value: { rev: '1-abc' } },
          { id: 'reminder:formx:123', value: { rev: '1-abc' } },
        ]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();
      
      await utils.deleteAllDocs();
      
      expect(utils.db.bulkDocs.calledOnce).to.equal(true);
      expect(utils.db.bulkDocs.args[0][0]).to.deep.equal([{ _id: 'ME', _deleted: true, _rev: 1 }]);
      expect(utils.sentinelDb.bulkDocs.calledOnce).to.equal(true);
      expect(utils.sentinelDb.bulkDocs.args[0][0]).to.deep.equal([
        { _id: 'me-info', _rev: '1-abc', _deleted: true },
        { _id: 'reminder:formx:123', _rev: '1-abc', _deleted: true },
      ]);
    });
    
    it('Supports extra strings as exceptions', async () => {
      sinon.stub(sentinelUtils, 'skipToSeq');
      sinon.stub(utils.db, 'allDocs').resolves({rows: [
        {id: 'ME', doc: {_id: 'ME', _rev: 1}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]});
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [
          { id: 'ME-info', value: { rev: '1-abc' } },
          { id: 'YOU-info', value: { rev: '1-abc' } }
        ]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();

      await utils.deleteAllDocs(['YOU']);
      
      expect(utils.db.bulkDocs.calledOnce).to.equal(true);
      expect(utils.db.bulkDocs.args[0][0]).to.deep.equal([{_id: 'ME', _deleted: true, _rev: 1}]);
      expect(utils.sentinelDb.bulkDocs.calledOnce).to.equal(true);
      expect(utils.sentinelDb.bulkDocs.args[0][0]).to.deep.equal([ {_id: 'ME-info', _rev: '1-abc', _deleted: true} ]);
    });
    
    it('Supports extra regex as exceptions', async () => {
      sinon.stub(sentinelUtils, 'skipToSeq');
      sinon.stub(utils.db, 'allDocs').resolves({rows: [
        {id: 'ME', doc: {_id: 'ME', _rev: 1}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]});
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [
          { id: 'ME-info', value: { rev: '1-abc' } },
          { id: 'YOU-info', value: { rev: '1-abc' } }
        ]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();

      await utils.deleteAllDocs([/^YOU$/]);
      expect(utils.db.bulkDocs.args[0][0]).to.deep.equal([{_id: 'ME', _deleted: true, _rev: 1}]);
      expect(utils.sentinelDb.bulkDocs.args[0][0]).to.deep.equal([ {_id: 'ME-info', _rev: '1-abc', _deleted: true} ]);
    });
    
    it('Supports extra functions as exceptions', async () => {
      sinon.stub(sentinelUtils, 'skipToSeq');
      sinon.stub(utils.db, 'allDocs').resolves({rows: 
          [ 
            {id: 'ME', doc: {_id: 'ME', _rev: 1}}, 
            {id: 'YOU', doc: {_id: 'YOU'}} 
          ]
      });
      sinon.stub(utils.db, 'bulkDocs').resolves();

      sinon.stub(utils.sentinelDb, 'allDocs').resolves({
        rows: [
          { id: 'ME-info', value: { rev: '1-abc' } },
          { id: 'YOU-info', value: { rev: '1-abc' } }
        ]
      });
      sinon.stub(utils.sentinelDb, 'bulkDocs').resolves();


      await utils.deleteAllDocs([doc => doc._id === 'YOU']);

      expect(utils.db.bulkDocs.args[0][0]).to.deep.equal([{_id: 'ME', _deleted: true, _rev: 1}]);
      expect(utils.sentinelDb.bulkDocs.args[0][0]).to.deep.equal([ {_id: 'ME-info', _rev: '1-abc', _deleted: true} ]);
    });
  });

  it('Check that all test specs belong to a test suites', async () => {
    const pathToDefaultTesting = path.resolve(__dirname, '../../../../../../tests/e2e/default');
    sinon.stub(sentinelUtils, 'skipToSeq');
    const suiteSpecs = [];

    for (const relativePaths of Object.values(suites)) {
      for (const relativePath of relativePaths) {
        const resolvedPath = path.resolve(pathToDefaultTesting, relativePath);
        suiteSpecs.push(await glob(resolvedPath));
      }
    }

    const allSpecs = await glob(path.join(pathToDefaultTesting, '/**/*.wdio-spec.js'));
    expect(allSpecs).to.have.same.members(suiteSpecs.flat());
  });
});
