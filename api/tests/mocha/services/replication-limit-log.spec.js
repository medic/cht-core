const chai = require('chai');
const sinon = require('sinon');
const replicationLimitLogService = require('../../../src/services/replication-limit-log');
const db = require('../../../src/db');
const logger = require('../../../src/logger');

describe('Replication Limit Log service', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('put()', () => {
    it('should log error in console, if parameters are missing', () => {
      const getStub = sinon.stub(db.medicLogs, 'get');
      const putStub = sinon.stub(db.medicLogs, 'put');
      const errorStub = sinon.stub(logger, 'error');
      const expectedMessage = 'Error on Log Replication Limit';

      return replicationLimitLogService
        .put()
        .then(() => {
          chai.expect(getStub.called).to.be.false;
          chai.expect(putStub.called).to.be.false;
          chai.expect(errorStub.called).to.be.true;
          chai.expect(errorStub.args[0][0]).to.include(expectedMessage);
        });
    });

    it('should persist log', () => {
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.reject({ status: 404 }));
      const putStub = sinon.stub(db.medicLogs, 'put').returns(Promise.resolve());
      const logType = replicationLimitLogService.LOG_TYPE;
      const expectedDoc = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        count: 100
      };

      return replicationLimitLogService
        .put('userXYZ', 100)
        .then(() => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(putStub.called).to.be.true;
          chai.expect(putStub.args[0][0]).to.deep.include(expectedDoc);
        });
    });
  });

  describe('get()', () => {
    it('should retrieve log by document ID', () => {
      const logType = replicationLimitLogService.LOG_TYPE;
      const doc = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        count: 100
      };
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs');
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.resolve(doc));

      return replicationLimitLogService
        .get('userXYZ')
        .then((response) => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(allDocsStub.called).to.be.false;
          chai.expect(getStub.args[0][0]).to.equal(doc._id);
          chai.expect(response.users).to.equal(doc);
        });
    });

    it('should retrieve list of logs by type', () => {
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

      return replicationLimitLogService
        .get()
        .then((response) => {
          chai.expect(getStub.called).to.be.false;
          chai.expect(allDocsStub.called).to.be.true;
          chai.expect(allDocsStub.args[0][0]).to.deep.include(options);
          chai.expect(response.users[0]).to.equal(doc1);
          chai.expect(response.users[1]).to.equal(doc2);
        });
    });
  });

  describe('_isLogDifferent()', () => {
    it('should return false when logs are not different enough', () => {
      const oldLog = {
        date: 1583944505000, // 2020/03/12 03:05:05
        count: 50
      };
      const newLog = {
        date: 1584635705000, // 2020/03/20 03:05:05
        count: 40
      };

      const result = replicationLimitLogService._isLogDifferent(oldLog, newLog);

      chai.expect(result).to.be.false;
    });

    it('should return true when count is different enough', () => {
      const oldLog = {
        date: 1583944505000, // 2020/03/12 03:05:05
        count: 150
      };
      const newLog = {
        date: 1584635705000, // 2020/03/20 03:05:05
        count: 40
      };

      const result = replicationLimitLogService._isLogDifferent(oldLog, newLog);

      chai.expect(result).to.be.true;
    });

    it('should return true when date is different enough', () => {
      const oldLog = {
        date: 1584203705000, // 2020/03/15 03:05:05
        count: 50
      };
      const newLog = {
        date: 1587317705000, // 2020/04/20 03:05:05
        count: 40
      };

      const result = replicationLimitLogService._isLogDifferent(oldLog, newLog);

      chai.expect(result).to.be.true;
    });

    it('should return true when old log is missing data', () => {
      const newLog = {
        date: 1587317705000, // 2020/04/20 03:05:05
        count: 40
      };

      const result = replicationLimitLogService._isLogDifferent({}, newLog);

      chai.expect(result).to.be.true;
    });
  });
});
