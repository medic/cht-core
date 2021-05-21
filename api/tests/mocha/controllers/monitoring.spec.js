const sinon = require('sinon');
const chai = require('chai');

const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/monitoring');
const service = require('../../../src/services/monitoring');

let req;
let res;

describe('Monitoring controller', () => {

  afterEach(() => sinon.restore());

  describe('v1', () => {

    beforeEach(() => {
      req = { query: {} };
      res = { json: sinon.stub() };
    });

    it('returns successfully', () => {
      sinon.stub(service, 'jsonV1').resolves({ version: { app: '1.2.3' } });
      return controller.getV1(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({
          version: {
            app: '1.2.3',
          }
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

  describe('v2', () => {

    beforeEach(() => {
      req = { query: {} };
      res = { json: sinon.stub() };
    });

    it('returns successfully', () => {
      sinon.stub(service, 'jsonV2').resolves({ version: { app: '4.5.6' } });
      return controller.getV2(req, res).then(() => {
        chai.expect(service.jsonV2.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({
          version: {
            app: '4.5.6',
          }
        });
      });
    });

    it('handles promise rejection gracefully', () => {
      sinon.stub(service, 'jsonV2').rejects(new Error('something missing'));
      sinon.stub(serverUtils, 'error').returns();
      return controller.getV2(req, res).then(() => {
        chai.expect(service.jsonV2.callCount).to.equal(1);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

  });

});
