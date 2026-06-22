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

    it('should persist log with all docs count', () => {
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.reject({ status: 404 }));
      const putStub = sinon.stub(db.medicLogs, 'put').returns(Promise.resolve());
      const logType = replicationLimitLogService.LOG_TYPE;

      const expectedDoc = {
        _id: logType + 'userXYZ',
        user: 'userXYZ',
        count: 100,
        all_docs_count: 500
      };

      return replicationLimitLogService
        .put('userXYZ', 100, 500)
        .then(() => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(putStub.called).to.be.true;
          chai.expect(putStub.args[0][0]).to.deep.include(expectedDoc);
        });
    });

    it('should always update the existing log, even when counts and date are unchanged', () => {
      const logType = replicationLimitLogService.LOG_TYPE;
      const existingDoc = {
        _id: logType + 'userXYZ',
        _rev: '1-abc',
        user: 'userXYZ',
        date: 1000,
        count: 100,
        all_docs_count: 500
      };
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.resolve(existingDoc));
      const putStub = sinon.stub(db.medicLogs, 'put').returns(Promise.resolve());

      return replicationLimitLogService
        .put('userXYZ', 100, 500)
        .then(() => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(putStub.called).to.be.true;
          // Keeps the existing _rev (updates in place) and refreshes the date.
          chai.expect(putStub.args[0][0]._rev).to.equal('1-abc');
          chai.expect(putStub.args[0][0].date).to.not.equal(1000);
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

  describe('getStaleLogs()', () => {
    const logType = replicationLimitLogService.LOG_TYPE;
    const log = (user, date) => ({ _id: logType + user, user, date });

    it('should return only logs older than the given cutoff', () => {
      const cutoff = 1000;
      const fresh = log('fresh', 1500);
      const stale = log('stale', 500);
      sinon.stub(db.medicLogs, 'get');
      const allDocsStub = sinon.stub(db.medicLogs, 'allDocs').returns(Promise.resolve({
        rows: [{ doc: fresh }, { doc: stale }],
      }));

      return replicationLimitLogService
        .getStaleLogs(cutoff)
        .then((logs) => {
          chai.expect(allDocsStub.args[0][0]).to.deep.include({
            startkey: logType,
            endkey: logType + '\ufff0',
            include_docs: true,
          });
          chai.expect(logs).to.deep.equal([stale]);
        });
    });

    it('should ignore logs without a date', () => {
      sinon.stub(db.medicLogs, 'get');
      sinon.stub(db.medicLogs, 'allDocs').returns(Promise.resolve({
        rows: [
          { doc: log('nodate', undefined) },
          { doc: log('stale', 500) },
        ],
      }));

      return replicationLimitLogService
        .getStaleLogs(1000)
        .then((logs) => {
          chai.expect(logs.map(l => l.user)).to.deep.equal(['stale']);
        });
    });

    it('should return an empty array when no logs are stale', () => {
      sinon.stub(db.medicLogs, 'get');
      sinon.stub(db.medicLogs, 'allDocs').returns(Promise.resolve({
        rows: [{ doc: log('fresh', 1500) }],
      }));

      return replicationLimitLogService
        .getStaleLogs(1000)
        .then((logs) => {
          chai.expect(logs).to.deep.equal([]);
        });
    });
  });

});
