const sinon = require('sinon');
const { expect } = require('chai');
const controller = require('../../../src/controllers/ui-extension');
const service = require('../../../src/services/ui-extension');
const serverUtils = require('../../../src/server-utils');

describe('UI Extension controller', () => {
  let res;
  let getAllProperties;
  let getScript;
  let serverError;
  let errorStub;

  beforeEach(() => {
    res = {
      json: sinon.stub(),
      set: sinon.stub(),
      send: sinon.stub(),
    };
    getAllProperties = sinon.stub(service, 'getAllProperties');
    getScript = sinon.stub(service, 'getScript');
    serverError = sinon.stub(serverUtils, 'serverError');
    errorStub = sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  describe('list', () => {
    it('returns JSON from service', async () => {
      const properties = [{ id: 'test' }];
      getAllProperties.resolves(properties);
      await controller.list({}, res);
      expect(res.json).to.have.been.calledOnceWithExactly(properties);
      expect(getAllProperties).to.have.been.calledOnceWithExactly();
      expect(serverError).to.not.have.been.called;
    });

    it('handles errors', async () => {
      const error = new Error('boom');
      getAllProperties.rejects(error);
      await controller.list({}, res);
      expect(res.json).to.not.have.been.called;
      expect(serverError).to.have.been.calledOnceWithExactly(error, {}, res);
    });
  });

  describe('get', () => {
    it('requires id param', async () => {
      const req = { params: {} };
      await controller.get(req, res);
      expect(errorStub).to.have.been.calledOnceWithExactly(
        { status: 400, message: 'Extension id parameter required' }, req, res
      );
      expect(getScript).to.not.have.been.called;
      expect(res.send).to.not.have.been.called;
      expect(res.set).to.not.have.been.called;
    });

    it('returns 404 when script not found', async () => {
      const req = { params: { id: 'test' } };
      getScript.resolves(undefined);
      await controller.get(req, res);
      expect(errorStub).to.have.been.calledOnceWithExactly(
        { message: 'Not found', status: 404 }, req, res
      );
      expect(getScript).to.have.been.calledOnceWithExactly('test');
      expect(res.send).to.not.have.been.called;
      expect(res.set).to.not.have.been.called;
    });

    it('sends buffered script', async () => {
      const req = { params: { id: 'test' } };
      getScript.resolves({ data: 'QUJD' }); // 'ABC' base64
      await controller.get(req, res);
      expect(res.set).to.have.been.calledOnceWithExactly('Content-Type', 'text/javascript');
      expect(res.send.args[0][0].toString()).to.equal('ABC');
      expect(errorStub).to.not.have.been.called;
    });

    it('handles unexpected error', async () => {
      const error = new Error('boom');
      const req = { params: { id: 'test' } };
      getScript.rejects(error);
      await controller.get(req, res);
      expect(serverError).to.have.been.calledOnceWithExactly(
        error, req, res
      );
      expect(getScript).to.have.been.calledOnceWithExactly('test');
      expect(res.send).to.not.have.been.called;
      expect(res.set).to.not.have.been.called;
    });
  });
});
