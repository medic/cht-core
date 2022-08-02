const chai = require('chai');
const sinon = require('sinon');
const config = require('../../../src/config');
const serverUtils = require('../../../src/server-utils');
const privacyPolicyController = require('../../../src/controllers/privacy-policy');
const privacyPolicyService = require('../../../src/services/privacy-policy');
const cookieService = require('../../../src/services/cookie');

describe('Privacy Policy Controller', () => {
  
  let req;
  let res;

  beforeEach(() => {
    req = {
      query: { },
      headers: { }
    };
    res = { send: sinon.stub() };
    sinon.stub(privacyPolicyService, 'get');
    sinon.stub(serverUtils, 'error');
    sinon.stub(config, 'translate');
    sinon.stub(cookieService, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {

    it('should throw an error when service rejects', () => {
      privacyPolicyService.get.rejects({ some: 'err' });

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        });
    });

    it('sends html response', () => {
      privacyPolicyService.get.resolves('my-template');

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(res.send.args[0][0]).to.contain('my-template');
        });
    });

    it('uses cookie locale', () => {
      privacyPolicyService.get.resolves('my-template');
      cookieService.get.returns('fr');

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(privacyPolicyService.get.callCount).to.equal(1);
          chai.expect(privacyPolicyService.get.args[0][0]).to.equal('fr');
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(config.translate.callCount).to.equal(3);
          chai.expect(config.translate.args[0][1]).to.equal('fr');
          chai.expect(config.translate.args[1][1]).to.equal('fr');
          chai.expect(config.translate.args[2][1]).to.equal('fr');
        });
    });

    it('uses configured default language if no cookie found', () => {
      privacyPolicyService.get.resolves('my-template');
      cookieService.get.returns(null);

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(privacyPolicyService.get.callCount).to.equal(1);
          chai.expect(privacyPolicyService.get.args[0][0]).to.equal(null);
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(config.translate.callCount).to.equal(3);
          chai.expect(config.translate.args[0][0]).to.equal('Back');
          chai.expect(config.translate.args[0][1]).to.equal(null);
          chai.expect(config.translate.args[1][0]).to.equal('login');
          chai.expect(config.translate.args[1][1]).to.equal(null);
          chai.expect(config.translate.args[2][0]).to.equal('privacy.policy');
          chai.expect(config.translate.args[2][1]).to.equal(null);
        });
    });

  });
});
