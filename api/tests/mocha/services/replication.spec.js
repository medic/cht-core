const sinon = require('sinon');
const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;

const db = require('../../../src/db');
const authorization = require('../../../src/services/authorization');
const purgedDocs = require('../../../src/services/purged-docs');
const replication = require('../../../src/services/replication');
const replicationLimitLog = require('../../../src/services/replication-limit-log');

let userCtx;
let authContext;
let docsByReplicationKey;

describe('Initial Replication service', () => {
  beforeEach(() => {
    userCtx = Object.freeze({ roles: ['one'], name: 'john' });
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
      sinon.stub(replicationLimitLog, 'put');

      const result = await replication.getContext(userCtx);

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
        [authContext, docsByReplicationKey],
        [authContext, docsByReplicationKey, { includeTasks: false }],
      ]);
      expect(purgedDocs.getUnPurgedIds.args).to.deep.equal([[userCtx, [1, 2, 3, 'purged']]]);
      expect(db.medic.info.callCount).to.equal(1);
      expect(replicationLimitLog.put.args).to.deep.equal([[userCtx.name, 3]]);
    });

    it('should warn if there are too many allowed docs', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '222-bbb' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      const allDocsIds = Array.from({ length: 12000 }).map((_, i) => i);
      sinon.stub(authorization, 'filterAllowedDocIds').returns(allDocsIds);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(allDocsIds);
      sinon.stub(replicationLimitLog, 'put');

      const result = await replication.getContext(userCtx);

      expect(result).to.deep.equal({
        docIds: allDocsIds,
        warnDocIds: allDocsIds,
        warn: true,
        limit: 10000,
        lastSeq: '222-bbb',
      });

      expect(purgedDocs.getUnPurgedIds.args).to.deep.equal([[userCtx, allDocsIds]]);
      expect(replicationLimitLog.put.args).to.deep.equal([[userCtx.name, allDocsIds.length]]);
    });

    it('should only warn about unpurged docs', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '222-bbb' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      const allDocsIds = Array.from({ length: 12000 }).map((_, i) => i);
      const unpurgedDocsIDs = allDocsIds.filter(key => key % 2 === 0);
      sinon.stub(authorization, 'filterAllowedDocIds').returns(allDocsIds);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedDocsIDs);
      sinon.stub(replicationLimitLog, 'put');

      const result = await replication.getContext(userCtx);

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
      sinon.stub(replicationLimitLog, 'put');

      const result = await replication.getContext(userCtx);

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

      await expect(replication.getContext(userCtx)).to.be.rejectedWith(Error, 'omg');
    });

    it('should throw getAuthorizationContext errors', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').rejects(new Error('failed'));

      await expect(replication.getContext(userCtx)).to.be.rejectedWith(Error, 'failed');
    });

    it('should throw getDocsByReplicationKey errors', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').rejects(new Error('wrong'));

      await expect(replication.getContext(userCtx)).to.be.rejectedWith(Error, 'wrong');
    });

    it('should throw getUnPurgedIds errors', async () => {
      sinon.stub(db.medic, 'info').resolves({ update_seq: '333-ccc' });
      sinon.stub(authorization, 'getAuthorizationContext').resolves(authContext);
      sinon.stub(authorization, 'getDocsByReplicationKey').resolves(docsByReplicationKey);
      sinon.stub(authorization, 'filterAllowedDocIds').returns([1, 2, 3]);
      sinon.stub(purgedDocs, 'getUnPurgedIds').rejects(new Error('didnt work'));

      await expect(replication.getContext(userCtx)).to.be.rejectedWith(Error, 'didnt work');
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

      const response = await replication.getDocIdsRevPairs([1, 2, 3, 4, 5]);

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

      const response = await replication.getDocIdsRevPairs([1, 2, 3, 4, 5]);

      expect(response).to.deep.equal([
        { id: '1', rev: 1 },
        { id: '2', rev: 1 },
        { id: '3', rev: 2 },
      ]);
      expect(db.medic.allDocs.args).to.deep.equal([[{ keys: [1, 2, 3, 4, 5] }]]);
    });

    it('should throw allDocs errors', async () => {
      sinon.stub(db.medic, 'allDocs').rejects(new Error('boom'));
      await expect(replication.getDocIdsRevPairs([123])).to.be.rejectedWith(Error, 'boom');
    });
  });

  describe('getDocIdsToDelete', () => {
    const userCtx = { name: 'Boss' };

    it('should do nothing when no doc ids are passed', async () => {
      expect(await replication.getDocIdsToDelete({}, [])).to.deep.equal([]);
    });

    it('should return deleted docs', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { key: 'doc1', id: 'doc1', value: { rev: 1 } },
          { key: 'doc2', id: 'doc2', value: { deleted: true } },
          { key: 'doc3', error: 'deleted' },
        ]
      });

      sinon.stub(purgedDocs, 'getPurgedIds').resolves([]);

      const result = await replication.getDocIdsToDelete(userCtx, ['doc1', 'doc2', 'doc3']);
      expect(result).to.have.members(['doc2', 'doc3']);

      expect(db.medic.allDocs.args).to.deep.equal([[{ keys: ['doc1', 'doc2', 'doc3'] }]]);
      expect(purgedDocs.getPurgedIds.args).to.deep.equal([[userCtx, ['doc1', 'doc2', 'doc3'], false]]);
    });

    it('should return purged docs', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { key: 'doc1', id: 'doc1', value: { rev: 1 } },
          { key: 'doc2', id: 'doc2', value: { rev: 1 } },
          { key: 'doc3', id: 'doc3', value: { rev: 1 } },
        ]
      });

      sinon.stub(purgedDocs, 'getPurgedIds').resolves(['doc1', 'doc2']);

      const result = await replication.getDocIdsToDelete(userCtx, ['doc1', 'doc2', 'doc3']);
      expect(result).to.have.members(['doc1', 'doc2']);

      expect(db.medic.allDocs.args).to.deep.equal([[{ keys: ['doc1', 'doc2', 'doc3'] }]]);
      expect(purgedDocs.getPurgedIds.args).to.deep.equal([[userCtx, ['doc1', 'doc2', 'doc3'], false]]);
    });

    it('should return deleted and purged docs', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { key: 'doc1', id: 'doc1', value: { rev: 1 } },
          { key: 'doc2', error: 'deleted' },
          { key: 'doc3', id: 'doc3', value: { rev: 1 } },
          { key: 'doc4', id: 'doc3', value: { deleted: true } },
          { key: 'doc5', id: 'doc5', value: { rev: 1 } },
        ]
      });

      sinon.stub(purgedDocs, 'getPurgedIds').resolves(['doc1', 'doc5']);

      const result = await replication.getDocIdsToDelete(userCtx, ['doc1', 'doc2', 'doc3', 'doc4', 'doc5']);
      expect(result).to.have.members(['doc1', 'doc2', 'doc4', 'doc5']);

      expect(db.medic.allDocs.args).to.deep.equal([[{ keys: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'] }]]);
      expect(purgedDocs.getPurgedIds.args).to.deep.equal([[userCtx, ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'], false]]);
    });

    it('should throw error on db errors', async () => {
      sinon.stub(db.medic, 'allDocs').rejects(new Error('failed'));
      await expect(replication.getDocIdsToDelete(userCtx, [1])).to.be.rejectedWith(Error, 'failed');
    });

    it('should throw error on purgedDocs errors', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(purgedDocs, 'getPurgedIds').rejects(new Error('boom'));

      await expect(replication.getDocIdsToDelete(userCtx, [1])).to.be.rejectedWith(Error, 'boom');
    });
  });
});
