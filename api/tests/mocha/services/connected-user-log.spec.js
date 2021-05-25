const chai = require('chai');
const sinon = require('sinon');
const moment = require('moment');
const connectedUserLogService = require('../../../src/services/connected-user-log');
const db = require('../../../src/db');

describe('Connected Users Log service', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('saveLog()', () => {
    it('should save a log', () => {
      const getStub = sinon.stub(db.medicLogs, 'get').returns(Promise.reject({ status: 404 }));
      const putStub = sinon.stub(db.medicLogs, 'put').returns(Promise.resolve());
      const expectedDoc = {
        _id: 'connected-user-' + 'userXYZ',
        user: 'userXYZ',
        timestamp: 100
      };

      return connectedUserLogService
        .save({user: 'userXYZ', timestamp: 100})
        .then(() => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(putStub.called).to.be.true;
          chai.expect(putStub.args[0][0]).to.deep.include(expectedDoc);
        });
    });
  });

  describe('get()', () => {
    it('should get logs within the defined interval', () => {
      const records = [
        {
          id: 'connected-user-admin',
          doc: {
            _id:'connected-user-admin',
            _rev:'4-c7002d',
            user:'admin',
            timestamp:moment().subtract(3, 'weeks').valueOf()
          }
        },
        {
          id: 'connected-user-user1',
          doc: {
            _id:'connected-user-user1',
            _rev:'2-639e17',
            user:'user1',
            timestamp:moment().subtract(2, 'days').valueOf()
          }
        },
        {
          id: 'connected-user-user2',
          doc: {
            _id:'connected-user-user2',
            _rev:'10-942c4',
            user:'admin',
            timestamp:moment().subtract(10, 'days').valueOf()
          }
        },
        {
          id: 'connected-user-user3',
          doc: {
            _id:'connected-user-user3',
            _rev:'6-dd9c2',
            user:'user3',
            timestamp:moment().subtract(3, 'days').valueOf()
          }
        },
      ];
      const getStub = sinon.stub(db.medicLogs, 'allDocs').returns(Promise.resolve( { rows: records } ));
      return connectedUserLogService
        .get(5)
        .then((result) => {
          chai.expect(getStub.called).to.be.true;
          chai.expect(result.length).to.equal(2);
          chai.expect(result[0].user).to.equal('user1');
          chai.expect(result[1].user).to.equal('user3');
        });
    });
  });
});
