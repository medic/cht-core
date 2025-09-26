const sinon = require('sinon');
const chai = require('chai');

const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/impact');
const service = require('../../../src/services/impact');

let req;
let res;

describe('Impact controller', () => {

  afterEach(() => sinon.restore());

  describe('v1', () => {

    beforeEach(() => {
      req = { query: {} };
      res = { json: sinon.stub() };
    });

    it('returns successfully', () => {
      sinon.stub(service, 'jsonV1').resolves({ totalReports: 10 });
      return controller.getV1(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({
          totalReports: 10
        });
      });
    });

    it('handles promise rejection gracefully', () => {
      sinon.stub(service, 'jsonV1').rejects(new Error('something missing'));
      sinon.stub(serverUtils, 'error').returns();
      return controller.getV1(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

  });

});
