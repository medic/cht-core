const chai = require('chai');
const sinon = require('sinon');
const logDocsService = require('../../../src/services/log-docs');
const db = require('../../../src/db');

describe('Log Docs service', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('logReplicationLimitExceeded()', () => {
    it('should reject if parameters are missing', () => {
      const putStub = sinon.stub(db.medicLogs, 'put');
      const expectedMessage = 'Error on logging Replication Limit Exceeded: Missing required data, user: undefined';

      return logDocsService
        .logReplicationLimitExceeded()
        .catch((error) => {
          chai.expect(error).to.not.be.undefined;
          chai.expect(error.message).to.deep.equal(expectedMessage);
          chai.expect(putStub.called).to.be.false;
        });
    });

    it('should persist log', () => {
      const putStub = sinon.stub(db.medicLogs, 'put').returns(Promise.resolve());
      const logType = logDocsService.LOG_TYPES.replicationCount;
      const expectedDoc = {
        _id: logType + 'userXYZ',
        user: { username: 'userXYZ' },
        count: 100,
        limit: 30
      };

      return logDocsService
        .logReplicationLimitExceeded('userXYZ', 100, 30)
        .then(() => {
          chai.expect(putStub.called).to.be.true;
          chai.expect(putStub.args[0][0]).to.deep.include(expectedDoc);
        });
    });
  });

  describe('getReplicationLimitExceededLog()', () => {
    it('should retrieve log by document ID', () => {
      const logType = logDocsService.LOG_TYPES.replicationCount;
      const doc = {
        _id: logType + 'userXYZ',
        user: { username: 'userXYZ' },
        count: 100,
        limit: 30
      };
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs');
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.resolve(doc));

      return logDocsService
        .getReplicationLimitExceededLog('userXYZ')
        .then((response) => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(allDocsStub.called).to.be.false;
          chai.expect(getStub.args[0][0]).to.equal(doc._id);
          chai.expect(response).to.equal(doc);
        });
    });

    it('should retrieve list of logs by type', () => {
      const logType = logDocsService.LOG_TYPES.replicationCount;
      const doc1 = {
        _id: logType + 'userABC',
        user: { username: 'userABC' },
        count: 100,
        limit: 30
      };
      const doc2 = {
        _id: logType + 'userXYZ',
        user: { username: 'userXYZ' },
        count: 100,
        limit: 30
      };
      const response = {
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
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs').returns(Promise.resolve(response));

      return logDocsService
        .getReplicationLimitExceededLog()
        .then((response) => {
          chai.expect(getStub.called).to.be.false;
          chai.expect(allDocsStub.called).to.be.true;
          chai.expect(allDocsStub.args[0][0]).to.deep.include(options);
          chai.expect(response[0]).to.equal(doc1);
          chai.expect(response[1]).to.equal(doc2);
        });
    });
  });
});
