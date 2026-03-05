const sinon = require('sinon');
const chai = require('chai');

const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/impact');
const service = require('../../../src/services/impact');
const auth = require('../../../src/auth');

describe('Impact controller', () => {
  const userCtx = { hello: 'world' };
  let isOnlineOnly;
  let req;
  let res;

  beforeEach(() => {
    sinon
      .stub(auth, 'getUserCtx')
      .resolves(userCtx);
    isOnlineOnly = sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    beforeEach(() => {
      req = { query: {} };
      res = { json: sinon.stub() };
    });

    afterEach(() => sinon.restore());

    it('returns successfully for online user', () => {
      isOnlineOnly.returns(true);
      const impactServiceOutput = {
        reports: {
          count: 10,
          by_form: [
            { form: 'L', count: 3 },
            { form: 'G', count: 7 }
          ]
        }
      };
      sinon.stub(service, 'jsonV1').resolves(impactServiceOutput);
      return controller.v1.get(req, res).then(() => {
        chai.expect(service.jsonV1.called).to.equal(true);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal(impactServiceOutput);
      });
    });

    it('offline user does not get to endpoint', () => {
      isOnlineOnly.returns(false);
      const impactServiceOutput = {
        reports: {
          count: 0,
          by_form: []
        }
      };
      sinon.stub(service, 'jsonV1').resolves(impactServiceOutput);
      return controller.v1.get(req, res).then(() => {
        chai.expect(service.jsonV1.called).to.equal(false);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

    it('handles promise rejection gracefully', () => {
      sinon.stub(service, 'jsonV1').rejects(new Error('something missing'));
      return controller.v1.get(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

  });

});
