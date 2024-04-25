const sinon = require('sinon');
const chai = require('chai');

const controller = require('../../../src/controllers/well-known');
const settingsService = require('../../../src/services/settings');
const serverUtils = require('../../../src/server-utils');

describe('well-known controller', () => {
  let req;
  let res;
  let settingsGet;

  beforeEach(() => {
    req = {};
    res = {
      json: sinon.stub(),
    };
    settingsGet = sinon.stub(settingsService, 'get');
  });
  afterEach(() => sinon.restore());

  describe('assetlinks', () => {
    it('should respond with assetlinks.json if configured', async () => {
      const assetlinks = { anything: true };
      settingsGet.resolves({ assetlinks });

      await controller.assetlinks(req, res);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal(assetlinks);
    });

    it('should respond 404 not found if not configured', async () => {
      settingsGet.resolves({});
      sinon.stub(serverUtils, 'error');

      await controller.assetlinks(req, res);
      chai.expect(serverUtils.error.args[0][0].code).to.equal(404);
      chai.expect(res.json.callCount).to.equal(0);
    });

    it('should respond 500 with an error if settings service is failing', async () => {
      settingsGet.rejects();
      sinon.stub(serverUtils, 'error');

      await controller.assetlinks(req, res);
      chai.expect(serverUtils.error.args[0][0]).to.be.an.instanceOf(Error);
      chai.expect(res.json.callCount).to.equal(0);
    });
  });
});
