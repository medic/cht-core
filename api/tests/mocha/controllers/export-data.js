require('chai').should();

const sinon = require('sinon').sandbox.create(),
      auth = require('../../../src/auth'),
      serverUtils = require('../../../src/server-utils');

const controller = require('../../../src/controllers/export-data');

describe('Export Data controller', () => {
  beforeEach(() => {
    sinon.stub(serverUtils, 'error');
    sinon.stub(auth, 'check');
  });

  afterEach(() => sinon.restore());

  describe('V2', () => {
    it('Throws an error if you try to query for an unsupported export', () => {
      controller.routeV2({req: true, params: {type: 'fake'}}, {res: true});
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0][0].message.should.contain('v2 export only supports');
      serverUtils.error.args[0][1].req.should.equal(true);
      serverUtils.error.args[0][2].res.should.equal(true);
    });
    it('Checks permissions', () => {
      auth.check.returns(Promise.reject({message: 'Bad permissions'}));
      return controller.routeV2({req: true, params: {type: 'reports'}}, {res: true})
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.contain('national_admin');
          serverUtils.error.callCount.should.equal(1);
          serverUtils.error.args[0][0].message.should.contain('Bad permissions');
          serverUtils.error.args[0][1].req.should.equal(true);
          serverUtils.error.args[0][2].res.should.equal(true);
        });
    });
  });
});
