const assert = require('chai').assert,
      sinon = require('sinon');

const utils = require('../../../../../../tests/utils');

describe('Protractor utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('deleteAllDocs', () => {
    it('Deletes all docs except some core ones', () => {
      const request = sinon.stub(utils, 'request');
      request.onFirstCall().returns(Promise.resolve({rows: [
        {id: '_design/cats', doc: {_id: '_design/cats'}},
        {id: 'appcache', doc: {_id: 'appcache'}},
        {id: 'migration-log', doc: {_id: 'migration-log'}},
        {id: 'resources', doc: {_id: 'resources'}},
        {id: '001', doc: {type: 'translations'}},
        {id: '002', doc: {type: 'translations-backup'}},
        {id: '003', doc: {type: 'user-settings'}},
        {id: '004', doc: {type: 'info'}},
        {id: 'ME', doc: {_id: 'ME'}}
      ]}));
      request.onSecondCall().returns(Promise.resolve());

      return utils.deleteAllDocs()
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path.includes('_bulk_docs'), true);
          assert.deepEqual(JSON.parse(deleteOptions.body), {docs: [{_id: 'ME', _deleted: true, type: 'tombstone'}]});
        });
    });
    it('Supports extra strings as exceptions', () => {
      const request = sinon.stub(utils, 'request');
      request.onFirstCall().returns(Promise.resolve({rows: [
        {id: 'ME', doc: {_id: 'ME'}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]}));
      request.onSecondCall().returns(Promise.resolve());

      return utils.deleteAllDocs(['YOU'])
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path.includes('_bulk_docs'), true);
          assert.deepEqual(JSON.parse(deleteOptions.body), {docs: [{_id: 'ME', _deleted: true, type: 'tombstone'}]});
        });
    });
    it('Supports extra regex as exceptions', () => {
      const request = sinon.stub(utils, 'request');
      request.onFirstCall().returns(Promise.resolve({rows: [
        {id: 'ME', doc: {_id: 'ME'}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]}));
      request.onSecondCall().returns(Promise.resolve());

      return utils.deleteAllDocs([/^YOU$/])
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path.includes('_bulk_docs'), true);
          assert.deepEqual(JSON.parse(deleteOptions.body), {docs: [{_id: 'ME', _deleted: true, type: 'tombstone'}]});
        });
    });
    it('Supports extra functions as exceptions', () => {
      const request = sinon.stub(utils, 'request');
      request.onFirstCall().returns(Promise.resolve({rows: [
        {id: 'ME', doc: {_id: 'ME'}},
        {id: 'YOU', doc: {_id: 'YOU'}}
      ]}));
      request.onSecondCall().returns(Promise.resolve());

      return utils.deleteAllDocs([doc => doc._id === 'YOU'])
        .then(() => {
          const deleteOptions = request.args[1][0];
          assert.equal(deleteOptions.path.includes('_bulk_docs'), true);
          assert.deepEqual(JSON.parse(deleteOptions.body), {docs: [{_id: 'ME', _deleted: true, type: 'tombstone'}]});
        });
    });
  });
});
