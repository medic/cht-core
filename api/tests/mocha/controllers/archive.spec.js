const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const { Readable } = require('stream');

const db = require('../../../src/db');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const errors = require('../../../src/errors');

const newReq = (lines = [], { contentType = 'text/csv' } = {}) => {
  const body = lines.length ? lines.join('\n') + '\n' : '';
  const stream = Readable.from([body]);
  stream.params = {};
  stream.headers = { 'content-type': contentType };
  stream.is = type => {
    const main = (contentType || '').split(';')[0].trim().toLowerCase();
    return main === type ? type : false;
  };
  return stream;
};

const newRes = () => ({
  json: sinon.stub(),
  status: sinon.stub().returnsThis(),
});

describe('Archive controller', () => {
  let controller;

  beforeEach(() => {
    controller = rewire('../../../src/controllers/archive');
  });

  afterEach(() => sinon.restore());

  describe('create', () => {
    it('responds with an AuthenticationError when caller is not a db admin', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({ roles: [] });
      sinon.stub(auth, 'isDbAdmin').returns(false);
      sinon.stub(serverUtils, 'error').returns();
      sinon.stub(db.sentinel, 'put');

      const req = newReq(['a', 'b']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(serverUtils.error.callCount).to.equal(1);
      const err = serverUtils.error.args[0][0];
      chai.expect(err).to.be.an.instanceOf(errors.AuthenticationError);
      chai.expect(err.code).to.equal(401);
      chai.expect(err.message).to.equal('User is not an admin');
      chai.expect(db.sentinel.put.callCount).to.equal(0);
    });

    it('writes one job containing every doc id from the body', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['doc-1', 'doc-2', 'doc-3']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(1);
      const doc = db.sentinel.put.args[0][0];
      chai.expect(doc).to.include({ type: 'archive:', total: 3, cursor: 0 });
      chai.expect(doc).to.not.have.property('status');
      chai.expect(doc._id).to.match(/^archive:/);
      chai.expect(doc._attachments.ids.content_type).to.equal('text/plain');
      chai.expect(doc._attachments.ids.data.toString('utf8')).to.equal('doc-1\ndoc-2\ndoc-3');
      chai.expect(res.status.calledWith(201)).to.equal(true);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0].jobs).to.have.length(1);
      chai.expect(res.json.args[0][0].jobs[0]).to.deep.equal({ id: doc._id, count: 3 });
    });

    it('strips surrounding quotes and skips blank lines', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['', '"doc-1"', '  doc-2  ', '']);
      const res = newRes();
      await controller.create(req, res);

      const doc = db.sentinel.put.args[0][0];
      chai.expect(doc.total).to.equal(2);
      chai.expect(doc._attachments.ids.data.toString('utf8')).to.equal('doc-1\ndoc-2');
    });

    it('splits ids into multiple job docs at MAX_IDS_PER_JOB', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });
      controller.__set__('MAX_IDS_PER_JOB', 3);

      const req = newReq(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(3);
      chai.expect(db.sentinel.put.args[0][0].total).to.equal(3);
      chai.expect(db.sentinel.put.args[1][0].total).to.equal(3);
      chai.expect(db.sentinel.put.args[2][0].total).to.equal(1);
      chai.expect(db.sentinel.put.args[0][0]._attachments.ids.data.toString('utf8')).to.equal('a\nb\nc');
      chai.expect(db.sentinel.put.args[2][0]._attachments.ids.data.toString('utf8')).to.equal('g');
      chai.expect(res.json.args[0][0].jobs.map(j => j.count)).to.deep.equal([3, 3, 1]);
    });

    it('rejects requests with a non-text/csv content-type with 415', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const req = newReq(['doc-1'], { contentType: 'application/json' });
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      const err = serverUtils.error.args[0][0];
      chai.expect(err).to.be.an.instanceOf(errors.ContentTypeError);
      chai.expect(err.code).to.equal(415);
      chai.expect(err.message).to.equal('Content-Type must be text/csv');
    });

    it('accepts text/csv with charset parameters', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['doc-1'], { contentType: 'text/csv; charset=utf-8' });
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(1);
      chai.expect(res.status.calledWith(201)).to.equal(true);
    });

    it('rejects an empty body with 400', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const req = newReq([]);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      const err = serverUtils.error.args[0][0];
      chai.expect(err).to.be.an.instanceOf(errors.BadRequestError);
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('No valid doc IDs found in request body');
    });

    it('rejects a body of only blank lines with 400', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const req = newReq(['', '   ', '']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(400);
    });

    it('surfaces errors emitted by the request stream', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const aborted = async function* () {
        yield 'doc-1\n';
        throw new Error('client aborted');
      };
      const req = Readable.from(aborted());
      req.headers = { 'content-type': 'text/csv' };
      req.is = () => 'text/csv';
      const res = newRes();
      await controller.create(req, res);

      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].message).to.equal('client aborted');
    });

    it('surfaces db errors via serverUtils.error', async () => {
      sinon.stub(auth, 'getUserCtx').resolves({});
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(db.sentinel, 'put').rejects({ status: 500, message: 'boom' });
      sinon.stub(serverUtils, 'error').returns();

      const req = newReq(['a']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0]).to.deep.include({ status: 500 });
    });
  });

});
