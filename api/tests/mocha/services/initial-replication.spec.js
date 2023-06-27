const sinon = require('sinon');
const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;

const db = require('../../../src/db');
const authorization = require('../../../src/services/authorization');
const purgedDocs = require('../../../src/services/purged-docs');
const initialReplication = require('../../../src/services/initial-replication');

let userCtx;
let authContext;
let docsByReplicationKey;

describe('Initial Replication service', () => {
  beforeEach(() => {
    userCtx = Object.freeze({ roles: ['one'] });
    authContext = Object.freeze({ auth: 'context' });
    docsByReplicationKey = Object.freeze({ docs: 'by replication key' });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getContext', () => {
    it('should return initial replication context', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '123-aaa' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      sinon.stub(authorization, 'filterAllowedDocIds').returns([1, 2, 3, 'purged']);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves([1, 2, 3]);

      const result = await initialReplication.getContext(userCtx);

      expect(result).to.deep.equal({
        docIds: [1, 2, 3],
        warnDocIds: [1, 2, 3],
        warn: false,
        limit: 10000,
        lastSeq: '123-aaa',
      });

      expect(authorization.getAuthorizationContext.args).to.deep.equal([[userCtx]]);
      expect(authorization.getDocsByReplicationKey.args).to.deep.equal([[authContext]]);
      expect(authorization.filterAllowedDocIds.args).to.deep.equal([
        [authContext, docsByReplicationKey, { includeTombstones: false }],
        [authContext, docsByReplicationKey, { includeTombstones: false, includeTasks: false }],
      ]);
      expect(purgedDocs.getUnPurgedIds.args).to.deep.equal([[userCtx.roles, [1, 2, 3, 'purged']]]);
      expect(db.medic.info.callCount).to.equal(1);
    });

    it('should warn if there are too many allowed docs', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '222-bbb' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      const allDocsIds = Array.from({ length: 12000 }).map((_, i) => i);
      sinon.stub(authorization, 'filterAllowedDocIds').returns(allDocsIds);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(allDocsIds);

      const result = await initialReplication.getContext(userCtx);

      expect(result).to.deep.equal({
        docIds: allDocsIds,
        warnDocIds: allDocsIds,
        warn: true,
        limit: 10000,
        lastSeq: '222-bbb',
      });

      expect(purgedDocs.getUnPurgedIds.args).to.deep.equal([[userCtx.roles, allDocsIds]]);
    });

    it('should only warn about unpurged docs', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '222-bbb' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      const allDocsIds = Array.from({ length: 12000 }).map((_, i) => i);
      const unpurgedDocsIDs = allDocsIds.filter(key => key % 2 === 0);
      sinon.stub(authorization, 'filterAllowedDocIds').returns(allDocsIds);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedDocsIDs);

      const result = await initialReplication.getContext(userCtx);

      expect(result).to.deep.equal({
        docIds: unpurgedDocsIDs,
        warnDocIds: unpurgedDocsIDs,
        warn: false,
        limit: 10000,
        lastSeq: '222-bbb',
      });
    });

    it('should not count tasks as warning docs', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      const allDocsIds = Array.from({ length: 12000 }).map((_, i) => i);
      const notTasks = allDocsIds.filter(key => key % 2 === 1);
      sinon.stub(authorization, 'filterAllowedDocIds')
        .onCall(0).returns(allDocsIds)
        .onCall(1).returns(notTasks);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(allDocsIds);

      const result = await initialReplication.getContext(userCtx);

      expect(result).to.deep.equal({
        docIds: allDocsIds,
        warnDocIds: notTasks,
        warn: false,
        limit: 10000,
        lastSeq: '333-ccc',
      });
    });

    it('should throw db info errors', async () => {
      sinon.stub(db.medic, 'info').rejects(new Error('omg'));

      await expect(initialReplication.getContext(userCtx)).to.be.rejectedWith(Error, 'omg');
    });

    it('should throw getAuthorizationContext errors', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').rejects(new Error('failed'));

      await expect(initialReplication.getContext(userCtx)).to.be.rejectedWith(Error, 'failed');
    });

    it('should throw getDocsByReplicationKey errors', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').rejects(new Error('wrong'));

      await expect(initialReplication.getContext(userCtx)).to.be.rejectedWith(Error, 'wrong');
    });

    it('should throw getUnPurgedIds errors', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      sinon.stub(authorization, 'filterAllowedDocIds').returns([1, 2, 3]);
      sinon.stub(purgedDocs, 'getUnPurgedIds').rejects(new Error('didnt work'));

      await expect(initialReplication.getContext(userCtx)).to.be.rejectedWith(Error, 'didnt work');
    });
  });

  describe('getDocIdsRevPairs', () => {
    it('should return list of pairs of ids and revs', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: '1', value: { rev: 1 } },
          { id: '2', value: { rev: 1 } },
          { id: '3', value: { rev: 2 } },
          { id: '4', value: { rev: 1 } },
          { id: '5', value: { rev: 3 } },
        ]
      });

      const response = await initialReplication.getDocIdsRevPairs([1, 2, 3, 4, 5]);

      expect(response).to.deep.equal([
        { id: '1', rev: 1 },
        { id: '2', rev: 1 },
        { id: '3', rev: 2 },
        { id: '4', rev: 1 },
        { id: '5', rev: 3 },
      ]);
      expect(db.medic.allDocs.args).to.deep.equal([[{ keys: [1, 2, 3, 4, 5] }]]);
    });

    it('should exclude rows without revs', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: '1', value: { rev: 1 } },
          { id: '2', value: { rev: 1 } },
          { id: '3', value: { rev: 2 } },
          { id: '4', value: {} },
          { id: '5', error: 'missing' },
        ]
      });

      const response = await initialReplication.getDocIdsRevPairs([1, 2, 3, 4, 5]);

      expect(response).to.deep.equal([
        { id: '1', rev: 1 },
        { id: '2', rev: 1 },
        { id: '3', rev: 2 },
      ]);
      expect(db.medic.allDocs.args).to.deep.equal([[{ keys: [1, 2, 3, 4, 5] }]]);
    });

    it('should throw allDocs errors', async () => {
      sinon.stub(db.medic, 'allDocs').rejects(new Error('boom'));
      await expect(initialReplication.getDocIdsRevPairs([123])).to.be.rejectedWith(Error, 'boom');
    });
  });
});
