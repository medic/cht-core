const sinon = require('sinon');
const auth = require('../../../src/auth');
const secureSettings = require('@medic/settings');
const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/credentials');
const chai = require('chai');

describe('Credentials controller', () => {

  let req;
  let res;

  beforeEach(() => {
    req = { params: {} };
    res = { json: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('put', () => {

    it('errors if no key given', () => {
      sinon.stub(secureSettings, 'setCredentials');
      sinon.stub(serverUtils, 'error').returns();
      controller.put(req, res);
      chai.expect(secureSettings.setCredentials.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(400);
      chai.expect(serverUtils.error.args[0][0].reason).to.equal('Missing required param "key"' );
    });

    it('errors if no password given', () => {
      sinon.stub(secureSettings, 'setCredentials');
      sinon.stub(serverUtils, 'error').returns();
      req.params.key = 'mykey';
      req.body = {};
      controller.put(req, res);
      chai.expect(secureSettings.setCredentials.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(400);
      chai.expect(serverUtils.error.args[0][0].reason).to.equal('Missing required request body' );
    });

    it('errors if not db admin', async () => {
      sinon.stub(secureSettings, 'setCredentials');
      sinon.stub(serverUtils, 'error').returns();
      req.params.key = 'mykey';
      req.body = 'pwd';
      sinon.stub(auth, 'getUserCtx').resolves({ roles: [] });
      sinon.stub(auth, 'isDbAdmin').returns(false);
      await controller.put(req, res);
      chai.expect(secureSettings.setCredentials.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(403);
    });

    it('handles error from setting credentials', async () => {
      sinon.stub(secureSettings, 'setCredentials').rejects({ code: 503 });
      sinon.stub(serverUtils, 'error').returns();
      req.params.key = 'mykey';
      req.body = 'pwd';
      sinon.stub(auth, 'getUserCtx').resolves({ roles: [] });
      sinon.stub(auth, 'isDbAdmin').returns(true);
      await controller.put(req, res);
      chai.expect(secureSettings.setCredentials.callCount).to.equal(1);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(503);
    });

    it('sets credentials and returns', async () => {
      sinon.stub(secureSettings, 'setCredentials').resolves();
      req.params.key = 'mykey';
      req.body = 'pwd';
      sinon.stub(auth, 'getUserCtx').resolves({ roles: [] });
      sinon.stub(auth, 'isDbAdmin').returns(true);
      res.json.resolves();
      await controller.put(req, res);
      chai.expect(secureSettings.setCredentials.callCount).to.equal(1);
      chai.expect(secureSettings.setCredentials.args[0][0]).to.equal('mykey');
      chai.expect(secureSettings.setCredentials.args[0][1]).to.equal('pwd');
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal({ ok: true });
    });

  });

});
