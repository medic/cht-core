const chai = require('chai');
const sinon = require('sinon');

const controller = require('../../../src/controllers/purged-docs');
const authorization = require('../../../src/services/authorization');
const purgedDocs = require('../../../src/services/purged-docs');
const serverUtils = require('../../../src/server-utils');

let req;
let res;

describe('PurgedDocs controller', () => {
  beforeEach(() => {
    req = {
      userCtx: { name: 'user', roles: ['role1', 'role2'] },
      replicationId: 'localDbId',
      query: { limit: 77 }
    };
    res = { json : sinon.stub() };
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  describe('getPurgedDocs', () => {
    it('should throw authorization context errors', () => {
      sinon.stub(authorization, 'getAuthorizationContext').rejects({ some: 'error' });

      return controller.getPurgedDocs(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'error' }, req, res]);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([req.userCtx]);
      });
    });

    it('should throw allowed doc ids errors', () => {
      const authContext = {
        userCtx: req.userCtx,
        subjectIds: ['a']
      };
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getAllowedDocIds').rejects({ some: 'error' });

      return controller.getPurgedDocs(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'error' }, req, res]);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.args[0])
          .to.deep.equal([ authContext, { includeTombstones: false } ]);
      });
    });

    it('should throw getPurgedIdsSince errors', () => {
      sinon.stub(authorization, 'getAuthorizationContext').resolves({ userCtx: req.userCtx });
      sinon.stub(authorization, 'getAllowedDocIds').resolves(['a', 'b', 'c']);
      sinon.stub(purgedDocs, 'getPurgedIdsSince').rejects({ some: 'err' });

      return controller.getPurgedDocs(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
        chai.expect(purgedDocs.getPurgedIdsSince.callCount).to.equal(1);
        chai.expect(purgedDocs.getPurgedIdsSince.args[0]).to.deep.equal([
          ['role1', 'role2'],
          ['a', 'b', 'c'],
          { checkPointerId: 'localDbId', limit: 77 }
        ]);
      });
    });

    it('should not throw errors when no limit or checkpointer id is provided', () => {
      req = { userCtx: { name: 'a', roles: ['role1'] } };
      sinon.stub(authorization, 'getAuthorizationContext').resolves({ userCtx: req.userCtx });
      sinon.stub(authorization, 'getAllowedDocIds').resolves(['a', 'b', 'c']);
      sinon.stub(purgedDocs, 'getPurgedIdsSince').resolves({ purgedDocIds: [1, 2, 3], lastSeq: '123-seq' });

      return controller.getPurgedDocs(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
        chai.expect(purgedDocs.getPurgedIdsSince.callCount).to.equal(1);
        chai.expect(purgedDocs.getPurgedIdsSince.args[0]).to.deep.equal([
          ['role1'],
          ['a', 'b', 'c'],
          { checkPointerId: undefined, limit: undefined }
        ]);
        chai.expect(res.json.args[0]).to.deep.equal([{ purged_ids: [1, 2, 3], last_seq: '123-seq' }]);
      });
    });

    it('should respond with result from service', () => {
      req = { userCtx: { name: 'a', roles: ['role1'] }, replicationId: 'rep-a', query: { limit: 23 } };
      sinon.stub(authorization, 'getAuthorizationContext').resolves({ userCtx: req.userCtx });
      sinon.stub(authorization, 'getAllowedDocIds').resolves(['a', 'b', 'c', 'd']);
      sinon.stub(purgedDocs, 'getPurgedIdsSince').resolves({ purgedDocIds: [1, 2, 3, 4], lastSeq: '199-seq' });

      return controller.getPurgedDocs(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
        chai.expect(purgedDocs.getPurgedIdsSince.callCount).to.equal(1);
        chai.expect(purgedDocs.getPurgedIdsSince.args[0]).to.deep.equal([
          ['role1'],
          ['a', 'b', 'c', 'd'],
          { checkPointerId: 'rep-a', limit: 23 }
        ]);
        chai.expect(res.json.args[0]).to.deep.equal([{ purged_ids: [1, 2, 3, 4], last_seq: '199-seq' }]);
      });
    });
  });

  describe('checkpoint', () => {
    it('should throw an error when no provided replication id', () => {
      req = { userCtx: { name: 'a', roles: ['role1'] } };
      controller.checkpoint(req, res);
      chai.expect(res.json.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0])
        .to.deep.equal([{ code: 400, reason: 'Missing required header medic-replication-id' }, req, res]);
    });

    it('should throw an error when no provided seq', () => {
      req = { userCtx: { name: 'a', roles: ['role1'] }, replicationId: 'some random id' };
      controller.checkpoint(req, res);
      chai.expect(res.json.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0])
        .to.deep.equal([{ code: 400, reason: 'Missing required parameter seq' }, req, res]);
    });

    it('should throw writecheckpointer fails', () => {
      req.query.seq = 'some-since-seq';
      req.replicationId = 'anotherlocaldb';
      sinon.stub(purgedDocs, 'writeCheckPointer').rejects({ some: 'err' });

      return controller.checkpoint(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(purgedDocs.writeCheckPointer.callCount).to.equal(1);
        chai.expect(purgedDocs.writeCheckPointer.args[0]).to.deep.equal([
          ['role1', 'role2'],
          'anotherlocaldb',
          'some-since-seq'
        ]);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
      });
    });

    it('should write purge checkpointer', () => {
      req.query.seq = 'my-since-seq';
      sinon.stub(purgedDocs, 'writeCheckPointer').resolves();

      return controller.checkpoint(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ success: true }]);
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(purgedDocs.writeCheckPointer.callCount).to.equal(1);
        chai.expect(purgedDocs.writeCheckPointer.args[0]).to.deep.equal([
          ['role1', 'role2'],
          'localDbId',
          'my-since-seq'
        ]);
      });
    });
  });

  describe('info', () => {
    it('should throw info fails', () => {
      sinon.stub(purgedDocs, 'info').rejects({ some: 'err' });

      return controller.info(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(purgedDocs.info.callCount).to.equal(1);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
      });
    });

    it('should return info result', () => {
      sinon.stub(purgedDocs, 'info').resolves({ some: 'info' });
      return controller.info(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ some: 'info' }]);
        chai.expect(purgedDocs.info.callCount).to.equal(1);
        chai.expect(serverUtils.error.callCount).to.equal(0);
      });
    });
  });
});
