const sinon = require('sinon');
const chai = require('chai');
const controller = require('../../../src/controllers/offline-data-bundle');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const dataBundle = require('../../../src/services/offline-data-bundle/data-bundle');

let req;
let res;

describe('Offline Data Bundle Controller', () => {
  beforeEach(() => {
    res = { json: sinon.stub() };
    sinon.stub(auth, 'assertPermissions');
    sinon.stub(dataBundle, 'process');
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  it('should respond with 400 when body has no bundles array', () => {
    req = { id: 'req-1', body: {} };
    return controller.request(req, res).then(() => {
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0]).to.deep.equal([
        { code: 400, reason: 'POST body must include a `bundles` array.' },
        req,
        res,
      ]);
      chai.expect(auth.assertPermissions.notCalled).to.be.true;
      chai.expect(dataBundle.process.notCalled).to.be.true;
      chai.expect(res.json.notCalled).to.be.true;
    });
  });

  it('should respond with 400 when bundles is not an array', () => {
    req = { id: 'req-2', body: { bundles: 'nope' } };
    return controller.request(req, res).then(() => {
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0]).to.deep.equal(
        { code: 400, reason: 'POST body must include a `bundles` array.' }
      );
      chai.expect(dataBundle.process.notCalled).to.be.true;
    });
  });

  it('should respond with 400 when body is missing entirely', () => {
    req = { id: 'req-3' };
    return controller.request(req, res).then(() => {
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0]).to.deep.equal(
        { code: 400, reason: 'POST body must include a `bundles` array.' }
      );
      chai.expect(dataBundle.process.notCalled).to.be.true;
    });
  });

  it('should gate on the relay permission and return the service result as JSON', () => {
    const serviceResult = {
      results: [{ user: 'chw', device_id: 'device-1', checkpoint: 5, accepted: 2, rejected: 0 }],
    };
    auth.assertPermissions.resolves({ name: 'taxi', roles: ['relay'] });
    dataBundle.process.resolves(serviceResult);
    const bundles = [{ envelope: {}, payload: 'p', signature: 's' }];
    req = { id: 'req-4', body: { bundles } };

    return controller.request(req, res).then(() => {
      chai.expect(auth.assertPermissions.callCount).to.equal(1);
      chai.expect(auth.assertPermissions.args[0]).to.deep.equal([
        req,
        { hasAny: ['can_relay_offline_data_bundle'] },
      ]);
      chai.expect(dataBundle.process.callCount).to.equal(1);
      chai.expect(dataBundle.process.args[0]).to.deep.equal([bundles]);
      chai.expect(res.json.args[0]).to.deep.equal([serviceResult]);
      chai.expect(serverUtils.error.notCalled).to.be.true;
    });
  });

  it('should propagate error when requester lacks the relay permission', () => {
    const permissionError = { code: 403, message: 'Insufficient privileges' };
    auth.assertPermissions.rejects(permissionError);
    req = { id: 'req-5', body: { bundles: [] } };

    return controller.request(req, res).then(() => {
      chai.expect(auth.assertPermissions.callCount).to.equal(1);
      chai.expect(dataBundle.process.notCalled).to.be.true;
      chai.expect(res.json.notCalled).to.be.true;
      chai.expect(serverUtils.error.args[0]).to.deep.equal([permissionError, req, res]);
    });
  });

  it('should propagate error when the service throws', () => {
    const serviceError = new Error('boom');
    auth.assertPermissions.resolves({ name: 'taxi', roles: ['relay'] });
    dataBundle.process.rejects(serviceError);
    req = { id: 'req-6', body: { bundles: [{ envelope: {}, payload: 'p', signature: 's' }] } };

    return controller.request(req, res).then(() => {
      chai.expect(res.json.notCalled).to.be.true;
      chai.expect(serverUtils.error.args[0]).to.deep.equal([serviceError, req, res]);
    });
  });
});
