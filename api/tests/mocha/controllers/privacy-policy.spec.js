const chai = require('chai');
const sinon = require('sinon');
const config = require('../../../src/config');
const serverUtils = require('../../../src/server-utils');
const privacyPolicyController = require('../../../src/controllers/privacy-policy');
const privacyPolicyService = require('../../../src/services/privacy-policy');

describe('Privacy Policy Controller', () => {
  
  let req;
  let res;

  beforeEach(() => {
    req = {
      query: { }
    };
    res = { send: sinon.stub() };
    sinon.stub(privacyPolicyService, 'get');
    sinon.stub(serverUtils, 'error');
    sinon.stub(config, 'translate');
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

    // TODO add more tests once template service can be mocked

  });
});
