require('chai').should();

const sinon = require('sinon').sandbox.create();
const auth = require('../../../src/auth'),
      serverUtils = require('../../../src/server-utils');

const controller = require('../../../src/controllers/upgrade'),
      service = require('../../../src/services/upgrade');

describe('Upgrade controller', () => {
  const req = {
    body: {
      build: {
        namespace: 'medic',
        application: 'medic',
        version: '1.0.0'
      }
    }
  };

  beforeEach(() => {
    sinon.stub(auth, 'check');
    sinon.stub(serverUtils, 'error');
    sinon.stub(service, 'upgrade').returns(Promise.resolve());
  });

  afterEach(() => sinon.restore());

  it('checks that user is an admin', () => {
    auth.check.returns(Promise.reject(''));
    return controller.upgrade(req, {})
      .then(() => {
        auth.check.callCount.should.equal(1);
        serverUtils.error.callCount.should.equal(1);
      });
  });

  it('checks that the user passed a build info body', () => {
    auth.check.returns(Promise.resolve({}));
    const json = sinon.stub();
    return controller.upgrade({body: {}}, {json: json})
      .then(() => {
        auth.check.callCount.should.equal(1);
        serverUtils.error.callCount.should.equal(1);
        serverUtils.error.args[0][0].status.should.equal(400);
      });
  });

  it('calls the upgade service if the user is an admin', () => {
    auth.check.returns(Promise.resolve({user: 'admin'}));
    const json = sinon.stub();
    return controller.upgrade(req, {json: json})
      .then(() => {
        auth.check.callCount.should.equal(1);
        serverUtils.error.callCount.should.equal(0);
        service.upgrade.callCount.should.equal(1);
        service.upgrade.args[0][0].should.deep.equal(req.body.build);
        service.upgrade.args[0][1].should.equal('admin');
        json.callCount.should.equal(1);
        json.args[0][0].should.deep.equal({ok: true});
      });
  });
});
