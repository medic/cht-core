const { expect } = require('chai');
const sinon = require('sinon');
const controller = require('../../../src/controllers/replication');
const replicationService = require('../../../src/services/replication');
const serverUtils = require('../../../src/server-utils');

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

      expect(replicationService.getContext.args).to.deep.equal([[req.userCtx]]);
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

      expect(replicationService.getContext.args).to.deep.equal([[req.userCtx]]);
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

  describe('pushDocs', () => {
    it('should return 400 when docs is missing', async () => {
      const pushReq = { userCtx: { name: 'michael' }, body: {} };
      const pushRes = { json: sinon.stub(), status: sinon.stub().returnsThis() };

      await controller.pushDocs(pushReq, pushRes);

      expect(pushRes.status.args).to.deep.equal([[400]]);
      expect(pushRes.json.args[0][0].error).to.equal('bad_request');
    });

    it('should return 400 when docs is not an array', async () => {
      const pushReq = { userCtx: { name: 'michael' }, body: { docs: 'not-array' } };
      const pushRes = { json: sinon.stub(), status: sinon.stub().returnsThis() };

      await controller.pushDocs(pushReq, pushRes);

      expect(pushRes.status.args).to.deep.equal([[400]]);
    });

    it('should delegate to service and return results', async () => {
      const docs = [{ _id: 'doc1', type: 'report' }];
      const results = [{ ok: true, id: 'doc1', rev: '2-abc' }];
      sinon.stub(replicationService, 'pushDocs').resolves(results);
      const pushReq = { userCtx: { name: 'michael' }, body: { docs } };

      await controller.pushDocs(pushReq, res);

      expect(replicationService.pushDocs.args).to.deep.equal([[{ name: 'michael' }, docs]]);
      expect(res.json.args).to.deep.equal([[{ results }]]);
    });

    it('should handle service errors', async () => {
      sinon.stub(replicationService, 'pushDocs').rejects({ status: 500 });
      sinon.stub(serverUtils, 'serverError');
      const pushReq = { userCtx: { name: 'michael' }, body: { docs: [] } };

      await controller.pushDocs(pushReq, res);

      expect(serverUtils.serverError.callCount).to.equal(1);
    });
  });
});
