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
  });
});
