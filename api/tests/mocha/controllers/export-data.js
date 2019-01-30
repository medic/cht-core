require('chai').should();

const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

const controller = require('../../../src/controllers/export-data');
const service = require('../../../src/services/export-data');

let set;

describe('Export Data controller', () => {
  beforeEach(() => {
    sinon.stub(serverUtils, 'error');
    sinon.stub(auth, 'check');
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(service, 'export');

    set = sinon.stub().returns({ set });
  });

  afterEach(() => sinon.restore());

  describe('get', () => {
    it('Throws an error if you try to query for an unsupported export', () => {
      controller.get({req: true, params: {type: 'fake'}}, {res: true});
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0][0].message.should.contain('v2 export only supports');
      serverUtils.error.args[0][1].req.should.equal(true);
      serverUtils.error.args[0][2].res.should.equal(true);
    });
    it('Checks permissions', () => {
      auth.check.returns(Promise.reject({message: 'Bad permissions'}));
      auth.getUserCtx.returns(Promise.resolve({}));
      auth.isOnlineOnly.returns(true);
      return controller.get({req: true, params: {type: 'reports'}}, {res: true})
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(1);
          serverUtils.error.args[0][0].message.should.contain('Bad permissions');
          serverUtils.error.args[0][1].req.should.equal(true);
          serverUtils.error.args[0][2].res.should.equal(true);
        });
    });

    it('corrects filter types', () => {
      const req = {
        params: {
          type: 'reports'
        },
        body: {
          filters: {
            date: { from: '1525813200000', to: '1528232399999' },
            valid: 'true',
            verified: 'false'
          }
        }
      };
      auth.check.resolves();
      auth.getUserCtx.returns(Promise.resolve({}));
      auth.isOnlineOnly.returns(true);
      return controller.get(req, { set: set, flushHeaders: sinon.stub() }).then(() => {
        service.export.callCount.should.equal(1);
        service.export.args[0].should.deep.equal([
          'reports',
          {
            date: { from: 1525813200000, to: 1528232399999 },
            valid: true,
            verified: false
          },
          {}
        ]);
      });
    });
  });

});
