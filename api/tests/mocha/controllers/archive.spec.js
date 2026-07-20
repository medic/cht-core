const chai = require('chai');
chai.use(require('chai-exclude'));
const sinon = require('sinon');
const { Readable } = require('stream');
const constants = require('@medic/constants');

const controller = require('../../../src/controllers/archive');
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

const NOW = new Date('2026-05-18T00:00:00.000Z').getTime();

const expectedJob = (ids) => ({
  date: NOW,
  total: ids.length,
  cursor: 0,
  _attachments: {
    ids: {
      content_type: 'text/plain',
      data: Buffer.from(ids.join('\n'), 'utf8'),
    },
  },
});

describe('Archive controller', () => {
  beforeEach(() => {
    // fake only Date — faking timers/setImmediate stalls the request streams
    sinon.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });

  afterEach(() => sinon.restore());

  describe('create', () => {
    it('responds with a PermissionError when caller is not a db admin', async () => {
      sinon.stub(auth, 'assertDbAdmin').rejects(new errors.PermissionError('User is not an admin'));
      sinon.stub(serverUtils, 'error').returns();
      sinon.stub(db.sentinel, 'put');

      const req = newReq(['a', 'b']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(auth.assertDbAdmin.callCount).to.equal(1);
      chai.expect(auth.assertDbAdmin.args[0][0]).to.equal(req);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      const err = serverUtils.error.args[0][0];
      chai.expect(err).to.be.an.instanceOf(errors.PermissionError);
      chai.expect(err.code).to.equal(403);
      chai.expect(err.message).to.equal('User is not an admin');
      chai.expect(db.sentinel.put.callCount).to.equal(0);
    });

    it('writes one job containing every doc id from the body', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['doc-1', 'doc-2', 'doc-3']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(1);
      const doc = db.sentinel.put.args[0][0];
      chai.expect(doc._id).to.match(/^archive:/);
      chai.expect(doc).excluding('_id').to.deep.equal(expectedJob(['doc-1', 'doc-2', 'doc-3']));
      chai.expect(res.status.calledWith(201)).to.equal(true);
      chai.expect(res.json.args).to.deep.equal([[{ jobs: [{ id: doc._id, count: 3 }] }]]);
    });

    it('strips surrounding quotes and skips blank lines', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['', '"doc-1"', '  doc-2  ', '']);
      const res = newRes();
      await controller.create(req, res);

      const doc = db.sentinel.put.args[0][0];
      chai.expect(doc).excluding('_id').to.deep.equal(expectedJob(['doc-1', 'doc-2']));
    });

    it('splits ids into multiple job docs at MAX_IDS_PER_JOB', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const MAX_IDS_PER_JOB = 100 * 1000; // mirrors the controller's per-job cap
      const allIds = Array.from({ length: MAX_IDS_PER_JOB * 2 + 1 }, (_, i) => `doc-${i}`);
      const lines = function* () {
        for (let i = 0; i < allIds.length; i += 10000) {
          yield allIds.slice(i, i + 10000).join('\n') + '\n';
        }
      };
      const req = Readable.from(lines());
      req.headers = { 'content-type': 'text/csv' };
      req.is = () => 'text/csv';
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(3);
      const docs = db.sentinel.put.args.map(([doc]) => doc);
      const expectedSlices = [
        allIds.slice(0, MAX_IDS_PER_JOB),
        allIds.slice(MAX_IDS_PER_JOB, MAX_IDS_PER_JOB * 2),
        allIds.slice(MAX_IDS_PER_JOB * 2),
      ];
      docs.forEach((doc, i) => {
        chai.expect(doc).excluding(['_id', '_attachments']).to.deep.equal({
          date: NOW,
          total: expectedSlices[i].length,
          cursor: 0,
        });
        chai.expect(doc._attachments.ids.content_type).to.equal('text/plain');
        chai.expect(doc._attachments.ids.data.toString('utf8')).to.equal(expectedSlices[i].join('\n'));
      });
      const ids = docs.map(doc => doc._id);
      chai.expect(res.json.args).to.deep.equal([[{
        jobs: [
          { id: ids[0], count: MAX_IDS_PER_JOB },
          { id: ids[1], count: MAX_IDS_PER_JOB },
          { id: ids[2], count: 1 },
        ],
      }]]);
    });

    it('rejects requests with a non-text/csv content-type with 415', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
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
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['doc-1'], { contentType: 'text/csv; charset=utf-8' });
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(1);
      chai.expect(res.status.calledWith(201)).to.equal(true);
    });

    it('rejects an empty body with 400', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
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
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const req = newReq(['', '   ', '']);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(400);
    });

    it('rejects a streamed body that exceeds the size limit with 413, even without newlines', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const megabyte = 'a'.repeat(1024 * 1024);
      const chunks = function* () {
        for (let sent = 0; sent <= constants.MAX_REQUEST_SIZE; sent += megabyte.length) {
          yield megabyte;
        }
      };
      const req = Readable.from(chunks());
      req.headers = { 'content-type': 'text/csv' };
      req.is = () => 'text/csv';
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      const err = serverUtils.error.args[0][0];
      chai.expect(err).to.be.an.instanceOf(errors.PayloadTooLargeError);
      chai.expect(err.code).to.equal(413);
    });

    it('rejects an oversized declared Content-Length with 413 before reading the body', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put');
      sinon.stub(serverUtils, 'error').returns();

      const req = newReq(['doc-1']);
      req.headers['content-length'] = String(constants.MAX_REQUEST_SIZE + 1);
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(0);
      // processPayload was never entered: no readline/byte-counter listeners were attached.
      chai.expect(req.listenerCount('data')).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      const err = serverUtils.error.args[0][0];
      chai.expect(err).to.be.an.instanceOf(errors.PayloadTooLargeError);
      chai.expect(err.code).to.equal(413);
    });

    it('accepts an honest Content-Length within the limit', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
      sinon.stub(db.sentinel, 'put').resolves({ id: 'x', rev: '1-a' });

      const req = newReq(['doc-1']);
      req.headers['content-length'] = '6';
      const res = newRes();
      await controller.create(req, res);

      chai.expect(db.sentinel.put.callCount).to.equal(1);
      chai.expect(res.status.calledWith(201)).to.equal(true);
    });

    it('surfaces errors emitted by the request stream', async () => {
      sinon.stub(auth, 'assertDbAdmin').resolves({});
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
      sinon.stub(auth, 'assertDbAdmin').resolves({});
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
