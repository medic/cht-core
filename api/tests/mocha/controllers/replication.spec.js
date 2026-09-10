const { expect } = require('chai');
const sinon = require('sinon');
const controller = require('../../../src/controllers/replication');
const replicationService = require('../../../src/services/replication/replication');
const serverUtils = require('../../../src/server-utils');
const auth = require('../../../src/auth');
const dataBundle = require('../../../src/services/offline-data-bundle/data-bundle');

let req;
let res;

describe('Initial Replication controller', () => {
  beforeEach(() => {
    req = Object.freeze({ userCtx: { name: 'michael' } });
    res = { json: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getDocIds', () => {
    it('should respond with list of docs', async () => {
      sinon.stub(replicationService, 'getContext').resolves({
        docIds: [1, 2, 3],
        warnDocIds: [2, 3],
        lastSeq: '123-gdhsjfs',
        warn: false,
        limit: 1000,
      });
      sinon.stub(replicationService, 'getDocIdsRevPairs').resolves([
        { id: 1, rev: 1 },
        { id: 2, rev: 1 },
        { id: 3, rev: 1 },
      ]);

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.args).to.deep.equal([[req.userCtx, res]]);
      expect(replicationService.getDocIdsRevPairs.args).to.deep.equal([[[1, 2, 3]]]);
      expect(res.json.args).to.deep.equal([[{
        doc_ids_revs: [
          { id: 1, rev: 1 },
          { id: 2, rev: 1 },
          { id: 3, rev: 1 },
        ],
        warn_docs: 2,
        last_seq: '123-gdhsjfs',
        warn: false,
        limit: 1000,
      }]]);
    });

    it('should forward doc count warning', async () => {
      sinon.stub(replicationService, 'getContext').resolves({
        docIds: [4, 5, 6],
        warnDocIds: [4, 5, 6],
        lastSeq: '222-ghfdjki',
        warn: true,
        limit: 2,
      });
      sinon.stub(replicationService, 'getDocIdsRevPairs').resolves([
        { id: 4, rev: 1 },
        { id: 5, rev: 1 },
        { id: 6, rev: 1 },
      ]);

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.args).to.deep.equal([[req.userCtx, res]]);
      expect(replicationService.getDocIdsRevPairs.args).to.deep.equal([[[4, 5, 6]]]);
      expect(res.json.args).to.deep.equal([[{
        doc_ids_revs: [
          { id: 4, rev: 1 },
          { id: 5, rev: 1 },
          { id: 6, rev: 1 },
        ],
        warn_docs: 3,
        last_seq: '222-ghfdjki',
        warn: true,
        limit: 2,
      }]]);
    });

    it('should respond with error when getting context fails', async () => {
      sinon.stub(replicationService, 'getContext').rejects({ status: 500 });
      sinon.stub(serverUtils, 'serverError');

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[ { status: 500 }, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });

    it('should respond with error when getting id-revs pairs fails', async () => {
      sinon.stub(replicationService, 'getContext').resolves({
        docIds: [4, 5, 6],
        warnDocIds: [4, 5, 6],
        lastSeq: '222-ghfdjki',
        warn: true,
        limit: 2,
      });
      sinon.stub(replicationService, 'getDocIdsRevPairs').rejects({ status: 502 });
      sinon.stub(serverUtils, 'serverError');

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[ { status: 502 }, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });
  });

  describe('dataBundle', () => {
    const ENVELOPE = { user: 'chw1', device_id: 'device-a', bundle_seq: 1, start_seq: 0, end_seq: 5 };
    const RESULT = { ...ENVELOPE, accepted: 3, rejected: 0, checkpoint: 'c2VhbGVk' };

    const bundleReq = (headers = {}) => ({
      id: 'req-1',
      userCtx: { name: 'supervisor' },
      get: (name) => headers[name],
    });

    const encodeEnvelope = (envelope) => Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');

    it('should ingest the bundle and respond with the result', async () => {
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(dataBundle, 'process').resolves(RESULT);
      const req = bundleReq({
        'X-Medic-Bundle-Envelope': encodeEnvelope(ENVELOPE),
        'X-Medic-Bundle-Signature': 'the-signature',
      });

      await controller.dataBundle(req, res);

      expect(auth.assertPermissions.args).to.deep.equal([[ req, { hasAny: ['can_relay_offline_data_bundle'] } ]]);
      expect(dataBundle.process.args).to.deep.equal([[ ENVELOPE, 'the-signature', req ]]);
      expect(res.json.args).to.deep.equal([[ RESULT ]]);
    });

    it('should pass the raw request through as the payload stream', async () => {
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(dataBundle, 'process').resolves(RESULT);
      const req = bundleReq({ 'X-Medic-Bundle-Envelope': encodeEnvelope(ENVELOPE) });

      await controller.dataBundle(req, res);

      // the body is never buffered by the controller, the service reads it off the request
      expect(dataBundle.process.args[0][2]).to.equal(req);
    });

    it('should pass a null envelope on when the header is missing', async () => {
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(dataBundle, 'process').resolves(RESULT);

      await controller.dataBundle(bundleReq(), res);

      expect(dataBundle.process.args[0][0]).to.be.null;
    });

    it('should pass a null envelope on when the header is not valid base64 json', async () => {
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(dataBundle, 'process').resolves(RESULT);

      await controller.dataBundle(bundleReq({ 'X-Medic-Bundle-Envelope': 'bm90LWpzb24=' }), res);

      expect(dataBundle.process.args[0][0]).to.be.null;
    });

    it('should respond with the error when the relaying user lacks the permission', async () => {
      const error = { code: 403, message: 'Insufficient privileges' };
      sinon.stub(auth, 'assertPermissions').rejects(error);
      sinon.stub(dataBundle, 'process');
      sinon.stub(serverUtils, 'error');
      const req = bundleReq();

      await controller.dataBundle(req, res);

      expect(dataBundle.process.callCount).to.equal(0);
      expect(serverUtils.error.args).to.deep.equal([[ error, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });

    it('should respond with the error when the bundle is rejected', async () => {
      const error = { code: 400, message: 'Payload does not match the envelope.' };
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(dataBundle, 'process').rejects(error);
      sinon.stub(serverUtils, 'error');
      const req = bundleReq({ 'X-Medic-Bundle-Envelope': encodeEnvelope(ENVELOPE) });

      await controller.dataBundle(req, res);

      expect(serverUtils.error.args).to.deep.equal([[ error, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });
  });
});
