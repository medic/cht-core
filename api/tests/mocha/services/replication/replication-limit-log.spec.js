const chai = require('chai');
const sinon = require('sinon');
const replicationLimitLogService = require('../../../../src/services/replication/replication-limit-log');
const db = require('../../../../src/db');
const logger = require('@medic/logger');

describe('Replication Limit Log service', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('put()', () => {
    it('should log error in console, if parameters are missing', async () => {
      const getStub = sinon.stub(db.medicLogs, 'get');
      const putStub = sinon.stub(db.medicLogs, 'put');
      const errorStub = sinon.stub(logger, 'error');
      const expectedMessage = 'Error on Log Replication Limit';

      await replicationLimitLogService.put();

      chai.expect(getStub.called).to.be.false;
      chai.expect(putStub.called).to.be.false;
      chai.expect(errorStub.called).to.be.true;
      chai.expect(errorStub.args[0][0]).to.include(expectedMessage);
    });

    it('should persist log with all docs count', async () => {
      const getStub = sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });
      const putStub = sinon.stub(db.medicLogs, 'put').resolves();
      const logType = replicationLimitLogService.LOG_TYPE;

      const expectedDoc = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        count: 100,
        all_docs_count: 500
      };

      await replicationLimitLogService.put('userXYZ', 100, 500);

      chai.expect(getStub.called).to.be.true;
      chai.expect(putStub.called).to.be.true;
      chai.expect(putStub.args[0][0]).to.deep.include(expectedDoc);
    });

    it('should always update the existing log, even when counts and date are unchanged', async () => {
      const logType = replicationLimitLogService.LOG_TYPE;
      const existingDoc = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        date: 1000,
        count: 100,
        all_docs_count: 500
      };
      const getStub = sinon.stub(db.medicLogs, 'get').resolves(existingDoc);
      const putStub = sinon.stub(db.medicLogs, 'put').resolves();

      await replicationLimitLogService.put('userXYZ', 100, 500);

      chai.expect(getStub.called).to.be.true;
      chai.expect(putStub.called).to.be.true;
      chai.expect(putStub.args[0][0].date).to.not.equal(1000);
    });
  });

  describe('get()', () => {
    it('should retrieve log by document ID', async () => {
      const logType = replicationLimitLogService.LOG_TYPE;
      const doc = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        count: 100
      };
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs');
      const getStub = sinon.stub(db.medicLogs, 'get').resolves(doc);

      const response = await replicationLimitLogService.get('userXYZ');

      chai.expect(getStub.called).to.be.true;
      chai.expect(allDocsStub.called).to.be.false;
      chai.expect(getStub.args[0][0]).to.equal(doc._id);
      chai.expect(response.users).to.equal(doc);
    });

    it('should retrieve list of logs by type', async () => {
      const logType = replicationLimitLogService.LOG_TYPE;
      const doc1 = {
        _id: logType + 'userABC',
        user: 'userABC',
        count: 100
      };
      const doc2 = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        count: 100
      };
      const allDocsResponse = {
        rows: [
          { doc: doc1 },
          { doc: doc2 }
        ]
      };
      const options = {
        startkey: logType,
        endkey: logType + '\ufff0',
        include_docs: true
      };
      const getStub = sinon.stub(db.medicLogs, 'get');
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs').resolves(allDocsResponse);

      const response = await replicationLimitLogService.get();

      chai.expect(getStub.called).to.be.false;
      chai.expect(allDocsStub.called).to.be.true;
      chai.expect(allDocsStub.args[0][0]).to.deep.include(options);
      chai.expect(response.users[0]).to.equal(doc1);
      chai.expect(response.users[1]).to.equal(doc2);
    });
  });

  describe('getLogsForUsers()', () => {
    const logType = replicationLimitLogService.LOG_TYPE;
    const log = (user, date) => ({ _id: logType + user, user, date });

    it('should query by keyed doc ids and return logs keyed by username', async () => {
      const alice = log('alice', 1000);
      const bob = log('bob', 2000);
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs').resolves({
        rows: [{ doc: alice }, { doc: bob }],
      });

      const logsByUser = await replicationLimitLogService.getLogsForUsers(['alice', 'bob']);

      chai.expect(allDocsStub.args[0][0]).to.deep.equal({
        keys: [logType + 'alice', logType + 'bob'],
        include_docs: true,
      });
      chai.expect(logsByUser).to.deep.equal({ alice, bob });
    });

    it('should omit users that have no log', async () => {
      const alice = log('alice', 1000);
      sinon.stub(db.medicLogs, 'allDocs').resolves({
        rows: [{ doc: alice }, { key: logType + 'ghost', error: 'not_found' }],
      });

      const logsByUser = await replicationLimitLogService.getLogsForUsers(['alice', 'ghost']);

      chai.expect(logsByUser).to.deep.equal({ alice });
    });

    it('should not query when given no usernames', async () => {
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs');

      const logsByUser = await replicationLimitLogService.getLogsForUsers([]);

      chai.expect(allDocsStub.called).to.be.false;
      chai.expect(logsByUser).to.deep.equal({});
    });
  });

});
