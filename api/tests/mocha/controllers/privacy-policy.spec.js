const chai = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const config = require('../../../src/config');
const serverUtils = require('../../../src/server-utils');
const privacyPolicyController = require('../../../src/controllers/privacy-policy');
const privacyPolicyService = require('../../../src/services/privacy-policy');
const cookieService = require('../../../src/services/cookie');
const templateService = require('../../../src/services/template');

describe('Privacy Policy Controller', () => {
  
  let req;
  let res;

  beforeEach(() => {
    templateService.clear();
    req = {
      query: { },
      headers: { }
    };
    res = { send: sinon.stub() };
    sinon.stub(privacyPolicyService, 'get');
    sinon.stub(serverUtils, 'error');
    sinon.stub(config, 'translate');
    sinon.stub(cookieService, 'get');
    sinon.stub(templateService, 'getTemplate');
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
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(templateService.getTemplate.callCount).to.equal(1);
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(res.send.args[0][0]).to.equal('<html>my-template</html>');
        });
    });

    it('uses cookie locale', () => {
      privacyPolicyService.get.resolves('my-template');
      cookieService.get.returns('fr');
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

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
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

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
