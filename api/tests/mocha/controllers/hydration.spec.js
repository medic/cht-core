const chai = require('chai');
const sinon = require('sinon');
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
      fetchHydratedDocs: sinon.stub(),
    };
    revertLineage = controller.__set__('lineage', lineage);
  });

  afterEach(() => {
    sinon.restore();
    revertLineage();
  });

  describe('parameter validation', () => {
    it('should return an error when no doc_ids are passed', () => {
      return controller.hydrate(req, res).then(() => {
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
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
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
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
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
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
      lineage.fetchHydratedDocs.resolves([{ _id: 'my_doc_id', hydrated: true }]);

      return controller.hydrate(req, res).then(() => {
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['my_doc_id']]);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          [{ id: 'my_doc_id', doc: { _id: 'my_doc_id', hydrated: true } }]
        ]);
      });
    });
  });

  it('should work with a query', () => {
    req.query = { doc_ids: ['a', 'b', 'c', 'd', 'e'] };

    lineage.fetchHydratedDocs.resolves([
      { _id: 'a', hydrated: 'yes' },
      { _id: 'b', hydrated: 'yes' },
      { _id: 'c', hydrated: 'yes' },
      { _id: 'd', hydrated: 'yes' },
      { _id: 'e', hydrated: 'yes' },
    ]);

    return controller.hydrate(req, res).then(() => {
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['a', 'b', 'c', 'd', 'e']]);

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

    lineage.fetchHydratedDocs.resolves([
      { _id: 'one', not_hydrated: 'no' },
      { _id: 'two', not_hydrated: 'no' },
      { _id: 'three', not_hydrated: 'no' },
    ]);

    return controller.hydrate(req, res).then(() => {
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['one', 'two', 'three']]);

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

    lineage.fetchHydratedDocs.resolves([
      { _id: 'a', complex: 'yes' },
      { _id: 'c', complex: 'yes' },
      { _id: 'e', complex: 'yes' },
    ]);

    return controller.hydrate(req, res).then(() => {
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['a', 'b', 'c', 'd', 'e']]);

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

  it('should catch lineage.fetchHydratedDocs errors', () => {
    req.body = { doc_ids: ['a', 'b'] };
    lineage.fetchHydratedDocs.rejects({ new: 'error' });
    sinon.stub(serverUtils, 'serverError');

    return controller.hydrate(req, res).then(() => {
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(res.status.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(0);
      chai.expect(serverUtils.serverError.callCount).to.deep.equal(1);
      chai.expect(serverUtils.serverError.args[0]).to.deep.equal([ { new: 'error' }, req, res ]);
    });
  });
});
