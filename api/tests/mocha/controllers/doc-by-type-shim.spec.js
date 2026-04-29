const chai = require('chai');
const sinon = require('sinon');
const controller = require('../../../src/controllers/doc-by-type-shim');
const db = require('../../../src/db');
const serverUtils = require('../../../src/server-utils');

const FORM_PREFIX_RANGE = { start_key: 'form:', end_key: 'form:￰' };
const USER_PREFIX_RANGE = { start_key: 'org.couchdb.user:', end_key: 'org.couchdb.user:￰' };
const TRANSLATION_PREFIX_RANGE = { start_key: 'messages-', end_key: 'messages-￰' };

describe('doc-by-type-shim controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {}, body: {} };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().resolves(),
    };
    sinon.stub(db.medic, 'allDocs');
  });

  afterEach(() => sinon.restore());

  it('returns empty rows when no key is provided', async () => {
    await controller.request(req, res);
    chai.expect(db.medic.allDocs.callCount).to.equal(0);
    chai.expect(res.json.args[0][0]).to.deep.equal({ total_rows: 0, offset: 0, rows: [] });
  });

  it('translates key=["form"] into a form: prefix scan', async () => {
    req.query = { key: '["form"]' };
    db.medic.allDocs.resolves({ rows: [
      { id: 'form:registration', doc: { _id: 'form:registration', type: 'form' } },
      { id: 'form:visit', doc: { _id: 'form:visit', type: 'form' } },
    ] });

    await controller.request(req, res);

    chai.expect(db.medic.allDocs.callCount).to.equal(1);
    chai.expect(db.medic.allDocs.args[0][0]).to.deep.include(FORM_PREFIX_RANGE);
    chai.expect(db.medic.allDocs.args[0][0].include_docs).to.equal(false);
    chai.expect(res.json.args[0][0]).to.deep.equal({
      total_rows: 2,
      offset: 0,
      rows: [
        { id: 'form:registration', key: ['form'], value: null },
        { id: 'form:visit', key: ['form'], value: null },
      ],
    });
  });

  it('includes docs when include_docs=true', async () => {
    req.query = { key: '["form"]', include_docs: 'true' };
    db.medic.allDocs.resolves({ rows: [
      { id: 'form:registration', doc: { _id: 'form:registration', type: 'form', internalId: 'reg' } },
    ] });

    await controller.request(req, res);

    chai.expect(db.medic.allDocs.args[0][0].include_docs).to.equal(true);
    chai.expect(res.json.args[0][0].rows[0]).to.deep.equal({
      id: 'form:registration',
      key: ['form'],
      value: null,
      doc: { _id: 'form:registration', type: 'form', internalId: 'reg' },
    });
  });

  it('handles user-settings type', async () => {
    req.query = { key: '["user-settings"]' };
    db.medic.allDocs.resolves({ rows: [
      { id: 'org.couchdb.user:alice', doc: { _id: 'org.couchdb.user:alice' } },
    ] });

    await controller.request(req, res);

    chai.expect(db.medic.allDocs.args[0][0]).to.deep.include(USER_PREFIX_RANGE);
    chai.expect(res.json.args[0][0].rows[0].key).to.deep.equal(['user-settings']);
  });

  it('handles translations type', async () => {
    req.query = { key: '["translations"]' };
    db.medic.allDocs.resolves({ rows: [{ id: 'messages-en', doc: { _id: 'messages-en' } }] });

    await controller.request(req, res);

    chai.expect(db.medic.allDocs.args[0][0]).to.deep.include(TRANSLATION_PREFIX_RANGE);
    chai.expect(res.json.args[0][0].rows[0].key).to.deep.equal(['translations']);
  });

  it('returns empty rows for unsupported types', async () => {
    req.query = { key: '["meta"]' };
    await controller.request(req, res);
    chai.expect(db.medic.allDocs.callCount).to.equal(0);
    chai.expect(res.json.args[0][0]).to.deep.equal({ total_rows: 0, offset: 0, rows: [] });
  });

  it('merges results when keys=[["form"], ["translations"]]', async () => {
    req.query = { keys: '[["form"], ["translations"]]' };
    db.medic.allDocs
      .withArgs(sinon.match(FORM_PREFIX_RANGE))
      .resolves({ rows: [{ id: 'form:reg' }] });
    db.medic.allDocs
      .withArgs(sinon.match(TRANSLATION_PREFIX_RANGE))
      .resolves({ rows: [{ id: 'messages-en' }] });

    await controller.request(req, res);

    chai.expect(db.medic.allDocs.callCount).to.equal(2);
    chai.expect(res.json.args[0][0].rows).to.deep.equal([
      { id: 'form:reg', key: ['form'], value: null },
      { id: 'messages-en', key: ['translations'], value: null },
    ]);
  });

  it('accepts already-parsed key/keys from req.body', async () => {
    req.body = { key: ['form'] };
    db.medic.allDocs.resolves({ rows: [{ id: 'form:reg' }] });

    await controller.request(req, res);

    chai.expect(db.medic.allDocs.args[0][0]).to.deep.include(FORM_PREFIX_RANGE);
  });

  it('delegates to serverUtils on db error', async () => {
    req.query = { key: '["form"]' };
    db.medic.allDocs.rejects(new Error('boom'));
    sinon.stub(serverUtils, 'serverError');

    await controller.request(req, res);

    chai.expect(serverUtils.serverError.callCount).to.equal(1);
    chai.expect(serverUtils.serverError.args[0][0].message).to.equal('boom');
  });
});
