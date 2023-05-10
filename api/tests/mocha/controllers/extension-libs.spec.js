const sinon = require('sinon');
const chai = require('chai');

const controller = require('../../../src/controllers/extension-libs');
const service = require('../../../src/services/extension-libs');
const serverUtils = require('../../../src/server-utils');

let res;

describe('Extension Libs controller', () => {

  beforeEach(() => {
    res = {
      json: sinon.stub(),
      set: sinon.stub(),
      send: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('list', () => {

    it('handles error thrown by service', async () => {
      const req = { };
      const utilsError = sinon.stub(serverUtils, 'serverError');
      const serviceGetAll = sinon.stub(service, 'getAll').throws(new Error('unexpected'));
      await controller.list(req, res);
      chai.expect(serviceGetAll.callCount).to.equal(1);
      chai.expect(utilsError.callCount).to.equal(1);
      chai.expect(utilsError.args[0][0].message).to.equal('unexpected');
      chai.expect(res.json.callCount).to.equal(0);
    });

    it('returns array of lib names', async () => {
      const libs = [
        { name: 'average.js', data: 'abc', contentType: 'garbage' },
        { name: 'sum.js', data: 'def', contentType: 'rubbish' },
      ];
      const req = { };
      const utilsError = sinon.stub(serverUtils, 'serverError');
      const serviceGetAll = sinon.stub(service, 'getAll').resolves(libs);
      await controller.list(req, res);
      chai.expect(serviceGetAll.callCount).to.equal(1);
      chai.expect(utilsError.callCount).to.equal(0);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal([ 'average.js', 'sum.js' ]);
    });

  });

  describe('get', () => {

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

});
