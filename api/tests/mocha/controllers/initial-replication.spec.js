const { expect } = require('chai');
const sinon = require('sinon');
const controller = require('../../../src/controllers/replication');
const initialReplicationService = require('../../../src/services/initial-replication');
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
      sinon.stub(initialReplicationService, 'getContext').resolves({
        docIds: [1, 2, 3],
        warnDocIds: [2, 3],
        lastSeq: '123-gdhsjfs',
        warn: false,
        limit: 1000,
      });
      sinon.stub(initialReplicationService, 'getDocIdsRevPairs').resolves([
        { id: 1, rev: 1 },
        { id: 2, rev: 1 },
        { id: 3, rev: 1 },
      ]);

      await controller.getDocIds(req, res);

      expect(initialReplicationService.getContext.args).to.deep.equal([[req.userCtx]]);
      expect(initialReplicationService.getDocIdsRevPairs.args).to.deep.equal([[[1, 2, 3]]]);
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
      sinon.stub(initialReplicationService, 'getContext').resolves({
        docIds: [4, 5, 6],
        warnDocIds: [4, 5, 6],
        lastSeq: '222-ghfdjki',
        warn: true,
        limit: 2,
      });
      sinon.stub(initialReplicationService, 'getDocIdsRevPairs').resolves([
        { id: 4, rev: 1 },
        { id: 5, rev: 1 },
        { id: 6, rev: 1 },
      ]);

      await controller.getDocIds(req, res);

      expect(initialReplicationService.getContext.args).to.deep.equal([[req.userCtx]]);
      expect(initialReplicationService.getDocIdsRevPairs.args).to.deep.equal([[[4, 5, 6]]]);
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
      sinon.stub(initialReplicationService, 'getContext').rejects({ status: 500 });
      sinon.stub(serverUtils, 'serverError');

      await controller.getDocIds(req, res);

      expect(initialReplicationService.getContext.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[ { status: 500 }, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });

    it('should respond with error when getting id-revs pairs fails', async () => {
      sinon.stub(initialReplicationService, 'getContext').resolves({
        docIds: [4, 5, 6],
        warnDocIds: [4, 5, 6],
        lastSeq: '222-ghfdjki',
        warn: true,
        limit: 2,
      });
      sinon.stub(initialReplicationService, 'getDocIdsRevPairs').rejects({ status: 502 });
      sinon.stub(serverUtils, 'serverError');

      await controller.getDocIds(req, res);

      expect(initialReplicationService.getContext.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[ { status: 502 }, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });
  });
});
