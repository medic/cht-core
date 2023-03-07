const sinon = require('sinon');
const chai = require('chai');

const controller = require('../../../src/controllers/extension-libs');
const service = require('../../../src/services/extension-libs');
const serverUtils = require('../../../src/server-utils');

let res;

describe('Extension Libs controller', () => {

  beforeEach(() => {
    res = {
      set: sinon.stub(),
      send: sinon.stub()
    };
  });

  afterEach(() => sinon.restore());

  it('handles undefined name param', async () => {
    const req = { params: {} };
    const utilsError = sinon.stub(serverUtils, 'error');
    const serviceGet = sinon.stub(service, 'get');
    await controller.get(req, res);
    chai.expect(serviceGet.callCount).to.equal(0);
    chai.expect(utilsError.callCount).to.equal(1);
    chai.expect(utilsError.args[0][0].status).to.equal(400);
    chai.expect(utilsError.args[0][0].message).to.equal('Library name parameter required');
  });

  it('handles error thrown by service', async () => {
    const req = { params: { name: 'crib' } };
    const utilsError = sinon.stub(serverUtils, 'serverError');
    const serviceGet = sinon.stub(service, 'get').throws(new Error('unexpected'));
    await controller.get(req, res);
    chai.expect(serviceGet.callCount).to.equal(1);
    chai.expect(utilsError.callCount).to.equal(1);
    chai.expect(utilsError.args[0][0].message).to.equal('unexpected');
  });

  it('handles 404', async () => {
    const req = { params: { name: 'crib' } };
    const utilsError = sinon.stub(serverUtils, 'error');
    const serviceGet = sinon.stub(service, 'get').resolves();
    await controller.get(req, res);
    chai.expect(serviceGet.callCount).to.equal(1);
    chai.expect(utilsError.callCount).to.equal(1);
    chai.expect(utilsError.args[0][0].status).to.equal(404);
    chai.expect(utilsError.args[0][0].message).to.equal('Not found');
  });

  it('returns the lib', async () => {
    const req = { params: { name: 'crib' } };
    const utilsError = sinon.stub(serverUtils, 'error');
    const serviceGet = sinon.stub(service, 'get').resolves({ contentType: 'gibberish', data: 'abcd' });
    await controller.get(req, res);
    chai.expect(serviceGet.callCount).to.equal(1);
    chai.expect(serviceGet.args[0][0]).to.equal('crib');
    chai.expect(utilsError.callCount).to.equal(0);
    chai.expect(res.set.callCount).to.equal(1);
    chai.expect(res.set.args[0][0]).to.equal('Content-Type');
    chai.expect(res.set.args[0][1]).to.equal('gibberish');
    chai.expect(res.send.callCount).to.equal(1);
    const actual = Buffer.from(res.send.args[0][0]).toString('base64');
    chai.expect(actual).to.equal('abcd');
  });

});
