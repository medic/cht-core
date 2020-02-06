const sinon = require('sinon');
const chai = require('chai');

const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/monitoring');
const service = require('../../../src/services/monitoring');

let req;
let res;

describe('Monitoring controller', () => {

  afterEach(() => sinon.restore());

  describe('JSON', () => {

    beforeEach(() => {
      req = { query: {} };
      res = { json: sinon.stub() };
    });
  
    it('returns successfully', () => {
      sinon.stub(service, 'json').resolves({ version: { app: '1.2.3' } });
      return controller.get(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({
          version: {
            app: '1.2.3',
          }
        });
      });
    });

    it('handles promise rejection gracefully', () => {
      sinon.stub(service, 'json').rejects(new Error('something missing'));
      sinon.stub(serverUtils, 'error').returns();
      return controller.get(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

  });

  describe('OpenMetrics', () => {

    beforeEach(() => {
      req = { query: { format: 'openmetrics' } };
      res = { end: sinon.stub() };
    });

    it('returns successfully', () => {
      sinon.stub(service, 'openMetrics').resolves('abc');
      return controller.get(req, res).then(() => {
        chai.expect(res.end.callCount).to.equal(1);
        chai.expect(res.end.args[0][0]).to.equal('abc');
      });
    });

    it('handles promise rejection gracefully', () => {
      sinon.stub(service, 'openMetrics').rejects(new Error('something missing'));
      sinon.stub(serverUtils, 'error').returns();
      return controller.get(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.end.callCount).to.equal(0);
      });
    });

  });

});

