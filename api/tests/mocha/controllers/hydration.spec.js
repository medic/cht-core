const chai = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const rewire = require('rewire');
const controller = rewire('../../../src/controllers/hydration');
const serverUtils = require('../../../src/server-utils');

let req;
let res;
let lineage;
let revertLineage;

describe('hydration controller', () => {
  beforeEach(() => {
    req = {};
    res = {
      status: sinon.stub(),
      json: sinon.stub().resolves(), // just a trick so we always return a promise!
    };
    lineage = {
      fetchHydratedDoc: sinon.stub(),
      hydrateDocs: sinon.stub(),
    };
    sinon.stub(db.medic, 'allDocs');
    revertLineage = controller.__set__('lineage', lineage);
  });

  afterEach(() => {
    sinon.restore();
    revertLineage();
  });

  describe('parameter validation', () => {
    it('should return an error when no doc_ids are passed', () => {
      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { error: 'bad_request', reason: '`doc_ids` parameter must be a json array.' }
        ]);
      });
    });

    it('should return an error when query doc_ids is not an array', () => {
      req.query = { doc_ids: 'something' };

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { error: 'bad_request', reason: '`doc_ids` parameter must be a json array.' }
        ]);
      });
    });

    it('should return an error when body doc_ids is not an array', () => {
      req.body = { doc_ids: 'some_other_thing' };

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { error: 'bad_request', reason: '`doc_ids` parameter must be a json array.' }
        ]);
      });
    });

    it('should prioritize query over body', () => {
      req.query = { doc_ids: ['my_doc_id'] };
      req.body = { doc_ids: 'not_even_an_array' }; // yep, CouchDB _all_docs does this too!
      lineage.fetchHydratedDoc.resolves({ _id: 'my_doc_id', hydrated: true });

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['my_doc_id']);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [{ id: 'my_doc_id', doc: { _id: 'my_doc_id', hydrated: true } }]
        ]);
      });
    });
  });

  describe('single doc id optimization', () => {
    it('should optimize for single requested id', () => {
      req.body = { doc_ids: ['my_doc'] };
      lineage.fetchHydratedDoc.resolves({ _id: 'my_doc', im_hydrated: 'yes' });

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['my_doc']);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [{ id: 'my_doc', doc: { _id: 'my_doc', im_hydrated: 'yes' } }]
        ]);
      });
    });

    it('should return correct formatted response when single requested id is not found', () => {
      req.query = { doc_ids: ['docId'] };
      lineage.fetchHydratedDoc.rejects({ status: 404 });

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['docId']);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [{ id: 'docId', error: 'not_found' }]
        ]);
      });
    });

    it('should catch fetchHydratedDoc errors that are not 404s ', () => {
      req.query = { doc_ids: ['docId'] };
      lineage.fetchHydratedDoc.rejects({ no: 'status' });
      sinon.stub(serverUtils, 'serverError');

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(0);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDoc.args[0]).to.deep.equal(['docId']);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.serverError.callCount).to.equal(1);
        chai.expect(serverUtils.serverError.args[0]).to.deep.equal([{ no: 'status' }, req, res]);
      });
    });
  });

  describe('multiple doc_ids', () => {
    it('should work with a query', () => {
      req.query = { doc_ids: ['a', 'b', 'c', 'd', 'e'] };
      db.medic.allDocs.resolves({
        rows: [
          { id: 'a', doc: { _id: 'a', hydrated: 'no' } },
          { id: 'b', doc: { _id: 'b', hydrated: 'no' } },
          { id: 'c', doc: { _id: 'c', hydrated: 'no' } },
          { id: 'd', doc: { _id: 'd', hydrated: 'no' } },
          { id: 'e', doc: { _id: 'e', hydrated: 'no' } },
        ]
      });

      lineage.hydrateDocs.resolves([
        { _id: 'a', hydrated: 'yes' },
        { _id: 'b', hydrated: 'yes' },
        { _id: 'c', hydrated: 'yes' },
        { _id: 'd', hydrated: 'yes' },
        { _id: 'e', hydrated: 'yes' },
      ]);

      return controller.hydrate(req, res).then(() => {
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['a', 'b', 'c', 'd', 'e'], include_docs: true }]);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(1);
        chai.expect(lineage.hydrateDocs.args[0]).to.deep.equal([[
          { _id: 'a', hydrated: 'no' },
          { _id: 'b', hydrated: 'no' },
          { _id: 'c', hydrated: 'no' },
          { _id: 'd', hydrated: 'no' },
          { _id: 'e', hydrated: 'no' },
        ]]);

        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [
            { id: 'a', doc: { _id: 'a', hydrated: 'yes' } },
            { id: 'b', doc: { _id: 'b', hydrated: 'yes' } },
            { id: 'c', doc: { _id: 'c', hydrated: 'yes' } },
            { id: 'd', doc: { _id: 'd', hydrated: 'yes' } },
            { id: 'e', doc: { _id: 'e', hydrated: 'yes' } },
          ]
        ]);
      });
    });

    it('should work with a body', () => {
      req.query = { doc_ids: ['one', 'two', 'three'] };
      db.medic.allDocs.resolves({
        rows: [
          { id: 'one', doc: { _id: 'one', not_hydrated: 'yes' } },
          { id: 'two', doc: { _id: 'two', not_hydrated: 'yes' } },
          { id: 'three', doc: { _id: 'three', not_hydrated: 'yes' } },
        ]
      });

      lineage.hydrateDocs.resolves([
        { _id: 'one', not_hydrated: 'no' },
        { _id: 'two', not_hydrated: 'no' },
        { _id: 'three', not_hydrated: 'no' },
      ]);

      return controller.hydrate(req, res).then(() => {
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['one', 'two', 'three'], include_docs: true }]);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(1);
        chai.expect(lineage.hydrateDocs.args[0]).to.deep.equal([[
          { _id: 'one', not_hydrated: 'yes' },
          { _id: 'two', not_hydrated: 'yes' },
          { _id: 'three', not_hydrated: 'yes' },
        ]]);

        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [
            { id: 'one', doc: { _id: 'one', not_hydrated: 'no' } },
            { id: 'two', doc: { _id: 'two', not_hydrated: 'no' } },
            { id: 'three', doc: { _id: 'three', not_hydrated: 'no' } },
          ]
        ]);
      });
    });

    it('should treat not found docs', () => {
      req.query = { doc_ids: ['a', 'b', 'c', 'd', 'e'] };
      db.medic.allDocs.resolves({
        rows: [
          { id: 'a', doc: { _id: 'a', simple: 'yes' } },
          { id: 'b', error: 'not_found' },
          { id: 'c', doc: { _id: 'c', simple: 'yes' } },
          { id: 'd', error: 'deleted' },
          { id: 'e', doc: { _id: 'e', simple: 'yes' } },
        ]
      });

      lineage.hydrateDocs.resolves([
        { _id: 'a', complex: 'yes' },
        { _id: 'c', complex: 'yes' },
        { _id: 'e', complex: 'yes' },
      ]);

      return controller.hydrate(req, res).then(() => {
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['a', 'b', 'c', 'd', 'e'], include_docs: true }]);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(1);
        chai.expect(lineage.hydrateDocs.args[0]).to.deep.equal([[
          { _id: 'a', simple: 'yes' },
          { _id: 'c', simple: 'yes' },
          { _id: 'e', simple: 'yes' },
        ]]);

        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [
            { id: 'a', doc: { _id: 'a', complex: 'yes' } },
            { id: 'b', error: 'not_found' },
            { id: 'c', doc: { _id: 'c', complex: 'yes' } },
            { id: 'd', error: 'not_found' },
            { id: 'e', doc: { _id: 'e', complex: 'yes' } },
          ]
        ]);
      });
    });

    it('should optimize when none of the docs is found', () => {
      req.query = { doc_ids: ['a', 'b', 'c', 'd', 'e'] };
      db.medic.allDocs.resolves({
        rows: [
          { id: 'a', error: 'not_found' },
          { id: 'b', key: 'b', value: { rev: 'whatever', deleted: true }, doc: null },
          { id: 'c', error: 'not_found' },
          { id: 'd', key: 'd', value: { rev: 'the_rev', deleted: true }, doc: null },
        ]
      });

      return controller.hydrate(req, res).then(() => {
        chai.expect(lineage.fetchHydratedDoc.callCount).to.equal(0);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['a', 'b', 'c', 'd', 'e'], include_docs: true }]);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [
            { id: 'a', error: 'not_found' },
            { id: 'b', error: 'not_found' },
            { id: 'c', error: 'not_found' },
            { id: 'd', error: 'not_found' },
            { id: 'e', error: 'not_found' },
          ]
        ]);
      });
    });

    it('should catch db.medic.allDocs errors', () => {
      req.query = { doc_ids: ['a', 'b'] };
      db.medic.allDocs.rejects({ some: 'err' });
      sinon.stub(serverUtils, 'serverError');

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['a', 'b'], include_docs: true }]);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.serverError.callCount).to.deep.equal(1);
        chai.expect(serverUtils.serverError.args[0]).to.deep.equal([ { some: 'err' }, req, res ]);
      });
    });

    it('should catch lineage.hydrateDocs errors', () => {
      req.body = { doc_ids: ['a', 'b'] };
      db.medic.allDocs.resolves({ rows: [{ doc: { _id: 'a' }}, { doc: { _id: 'b' }}] });
      lineage.hydrateDocs.rejects({ new: 'error' });
      sinon.stub(serverUtils, 'serverError');

      return controller.hydrate(req, res).then(() => {
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['a', 'b'], include_docs: true }]);
        chai.expect(lineage.hydrateDocs.callCount).to.equal(1);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.serverError.callCount).to.deep.equal(1);
        chai.expect(serverUtils.serverError.args[0]).to.deep.equal([ { new: 'error' }, req, res ]);
      });
    });
  });

});
