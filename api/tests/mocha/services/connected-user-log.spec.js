const chai = require('chai');
const sinon = require('sinon');
const connectedUserLogService = require('../../../src/services/connected-user-log');
const db = require('../../../src/db');

let clock;

describe('Connected Users Log service', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('saveLog()', () => {
    it('should save a log', () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });
      const putStub = sinon.stub(db.medicLogs, 'put').resolves();
      const expectedDoc = {
        _id: 'connected-user-userXYZ',
        user: 'userXYZ',
        timestamp: 0
      };

      return connectedUserLogService
        .save('userXYZ')
        .then(() => {
          chai.expect(putStub.args[0][0]).to.deep.include(expectedDoc);
        });
    });

    it('should throw any error that is not a 404', () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 401 });

      return connectedUserLogService
        .save('userXYZ')
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 401 });
        });
    });

    it('should not save the log if the timestamp difference is less than the set interval', () => {
      sinon.stub(db.medicLogs, 'get').resolves({ timestamp: 1 });
      const putStub = sinon.stub(db.medicLogs, 'put');
      clock.tick(25 * 60 * 1000); //25 minutes

      return connectedUserLogService
        .save('userXYZ')
        .then(() => {
          chai.expect(putStub.callCount).to.equal(0);
        });
    });

    it('should save the log if the timestamp difference is more than the set interval', () => {
      sinon.stub(db.medicLogs, 'get').resolves({ timestamp: 1 });
      const putStub = sinon.stub(db.medicLogs, 'put');
      clock.tick(31 * 60 * 1000); //31 minutes

      return connectedUserLogService
        .save('userXYZ')
        .then(() => {
          chai.expect(putStub.callCount).to.equal(1);
        });
    });
  });
});
