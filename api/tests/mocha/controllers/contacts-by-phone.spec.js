const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const controller = rewire('../../../src/controllers/contacts-by-phone');
const phoneNumber = require('@medic/phone-number');
const config = require('../../../src/config');
const serverUtils = require('../../../src/server-utils');
const db = require('../../../src/db');

let req;
let res;
let lineage;
let revertLineage;
let settings;

describe('contacts-by-phone controller', () => {
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
    sinon.stub(db.medic, 'query');
    sinon.stub(phoneNumber, 'normalize');

    settings = { the: 'settings' };
    sinon.stub(config, 'get').returns(settings);
  });

  afterEach(() => {
    sinon.restore();
    revertLineage();
  });

  describe('parameter validation', () => {
    it('should return an error when no doc_ids are passed', () => {
      return controller.request(req, res).then(() => {
        chai.expect(db.medic.query.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
        chai.expect(phoneNumber.normalize.callCount).to.equal(0);

        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { error: 'bad_request', reason: '`phone` parameter is required and must be a valid phone number' }
        ]);
      });
    });

    it('should return an error when query phone is not a valid number', () => {
      req.query = { phone: 'something' };
      phoneNumber.normalize.returns(false);

      return controller.request(req, res).then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0]).to.deep.equal([]);

        chai.expect(phoneNumber.normalize.callCount).to.equal(1);
        chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([settings, 'something']);

        chai.expect(db.medic.query.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);

        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { error: 'bad_request', reason: '`phone` parameter is required and must be a valid phone number' }
        ]);
      });
    });

    it('should return an error when body phone is not a valid number', () => {
      req.body = { phone: 'some_other_thing' };

      return controller.request(req, res).then(() => {
        chai.expect(phoneNumber.normalize.callCount).to.equal(1);
        chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([settings, 'some_other_thing']);

        chai.expect(db.medic.query.callCount).to.equal(0);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);

        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { error: 'bad_request', reason: '`phone` parameter is required and must be a valid phone number' }
        ]);
      });
    });

    it('should prioritize query over body', () => {
      req.query = { phone: 'aaa' };
      req.body = { phone: 'bbb' }; // yep, CouchDB _all_docs does this too!

      phoneNumber.normalize.returns('a_normalized');

      db.medic.query.resolves({ rows: [{ id: 'my_doc_id' }] });
      lineage.fetchHydratedDocs.resolves([{ _id: 'my_doc_id', hydrated: true }]);

      return controller.request(req, res).then(() => {
        chai.expect(phoneNumber.normalize.callCount).to.equal(1);
        chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([ settings, 'aaa' ]);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic-client/contacts_by_phone', { key: 'a_normalized' }]);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['my_doc_id']]);

        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([
          { ok: true, docs: [{ _id: 'my_doc_id', hydrated: true } ] }
        ]);
      });
    });
  });

  it('should work with a query', () => {
    req.query = { phone: 'the_phone' };
    phoneNumber.normalize.returns('normalized_phone');

    db.medic.query.resolves({ rows: [{ id: 'doc_id' }] });
    lineage.fetchHydratedDocs.resolves([{ _id: 'doc_id', hydrated: true }]);

    return controller.request(req, res).then(() => {
      chai.expect(phoneNumber.normalize.callCount).to.equal(1);
      chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([ settings, 'the_phone' ]);

      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.query.args[0]).to.deep.equal(
        ['medic-client/contacts_by_phone', { key: 'normalized_phone' }]
      );
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['doc_id']]);

      chai.expect(res.status.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0]).to.deep.equal([
        { ok: true, docs: [{ _id: 'doc_id', hydrated: true } ] }
      ]);
    });
  });

  it('should work with a body', () => {
    req.body = { phone: 'the_phone' };
    phoneNumber.normalize.returns('normalized_phone');

    db.medic.query.resolves({ rows: [{ id: 'doc_id' }] });
    lineage.fetchHydratedDocs.resolves([{ _id: 'doc_id', hydrated: true }]);

    return controller.request(req, res).then(() => {
      chai.expect(phoneNumber.normalize.callCount).to.equal(1);
      chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([ settings, 'the_phone' ]);

      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.query.args[0]).to.deep.equal(
        ['medic-client/contacts_by_phone', { key: 'normalized_phone' }]
      );
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['doc_id']]);

      chai.expect(res.status.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0]).to.deep.equal([
        { ok: true, docs: [{ _id: 'doc_id', hydrated: true } ] }
      ]);
    });
  });

  it('should hydrate and return all results', () => {
    req.query = { phone: 'phone' };
    phoneNumber.normalize.returns('norm');
    db.medic.query.resolves({ rows: [{ id: 'one' }, { id: 'two' }, { id: 'three' }] });
    lineage.fetchHydratedDocs.resolves([
      { _id: 'one', hydrated: true }, { _id: 'two', hydrated: true }, { _id: 'three', hydrated: true },
    ]);

    return controller.request(req, res).then(() => {
      chai.expect(phoneNumber.normalize.callCount).to.equal(1);
      chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([ settings, 'phone' ]);

      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.query.args[0]).to.deep.equal(['medic-client/contacts_by_phone', { key: 'norm' }]);
      chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
      chai.expect(lineage.fetchHydratedDocs.args[0]).to.deep.equal([['one', 'two', 'three']]);

      chai.expect(res.status.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0]).to.deep.equal([{
        ok: true,
        docs: [
          { _id: 'one', hydrated: true },
          { _id: 'two', hydrated: true },
          { _id: 'three', hydrated: true },
        ]
      }]);
    });
  });

  describe('error handling', () => {
    it('should return an error when no matching docs are found', () => {
      req.query = { phone: 'ph' };
      phoneNumber.normalize.returns('phn');
      db.medic.query.resolves({ rows: [] });

      return controller.request(req, res).then(() => {
        chai.expect(phoneNumber.normalize.callCount).to.equal(1);
        chai.expect(phoneNumber.normalize.args[0]).to.deep.equal([ settings, 'ph' ]);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(
          ['medic-client/contacts_by_phone', { key: 'phn' }]
        );
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);

        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([404]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([ { error: 'not_found', reason: 'no matches found' } ]);
      });
    });

    it('should catch db errors', () => {
      req.body = { phone: 'o' };
      phoneNumber.normalize.returns('oo');
      db.medic.query.rejects({ some: 'err' });
      sinon.stub(serverUtils, 'serverError');

      return controller.request(req, res).then(() => {
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(0);

        chai.expect(serverUtils.serverError.callCount).to.equal(1);
        chai.expect(serverUtils.serverError.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
      });
    });

    it('should catch hydration errors', () => {
      req.body = { phone: 'o' };
      phoneNumber.normalize.returns('oo');
      db.medic.query.resolves({ rows: [{ id: 'a' }] });
      lineage.fetchHydratedDocs.rejects({ other: 'err' });
      sinon.stub(serverUtils, 'serverError');

      return controller.request(req, res).then(() => {
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(lineage.fetchHydratedDocs.callCount).to.equal(1);
        chai.expect(res.status.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(0);

        chai.expect(serverUtils.serverError.callCount).to.equal(1);
        chai.expect(serverUtils.serverError.args[0]).to.deep.equal([{ other: 'err' }, req, res]);
      });
    });
  });
});
