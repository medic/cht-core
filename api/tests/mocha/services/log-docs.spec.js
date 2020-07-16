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
      const expectedDoc = {
        _id: 'replication-count-userXYZ',
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
    it('should reject if parameter is missing', () => {
      const getStub = sinon.stub(db.medicLogs, 'get');
      const expectedMessage = 'Error on getting Replication Limit Exceeded Log: Missing user name';

      return logDocsService
        .getReplicationLimitExceededLog()
        .catch((error) => {
          chai.expect(error).to.not.be.undefined;
          chai.expect(error.message).to.deep.equal(expectedMessage);
          chai.expect(getStub.called).to.be.false;
        });
    });

    it('should retrieve log', () => {
      const doc = {
        _id: 'replication-count-userXYZ',
        user: { username: 'userXYZ' },
        count: 100,
        limit: 30
      };
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.resolve(doc));

      return logDocsService
        .getReplicationLimitExceededLog('userXYZ')
        .then((response) => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(getStub.args[0][0]).to.equal('replication-count-userXYZ');
          chai.expect(response).to.equal(doc);
        });
    });
  });
});
