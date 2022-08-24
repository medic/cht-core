require('chai').should();

const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

const controller = require('../../../src/controllers/upgrade');
const service = require('../../../src/services/upgrade');

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
    sinon.stub(service, 'complete').returns(Promise.resolve());
  });

  afterEach(() => sinon.restore());

  describe('Upgrade', () => {
    it('checks that user has the right permissions', () => {
      auth.check.returns(Promise.reject(''));
      return controller.upgrade(req, {})
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.equal('can_upgrade');
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

    it('calls the uprgade service', () => {
      auth.check.returns(Promise.resolve({ name: 'admin' }));
      const json = sinon.stub();
      return controller.upgrade(req, {json: json})
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(0);
          service.upgrade.callCount.should.equal(1);
          service.upgrade.args[0][0].should.deep.equal(req.body.build);
          service.upgrade.args[0][1].should.equal('admin');
          service.upgrade.args[0][2].should.deep.equal({stageOnly: false});
          json.callCount.should.equal(1);
          json.args[0][0].should.deep.equal({ok: true});
        });
    });
  });

  describe('Stage', () => {
    it('calls the upgrade service', () => {
      auth.check.returns(Promise.resolve({ name: 'admin' }));
      const json = sinon.stub();
      return controller.stage(req, {json: json})
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.equal('can_upgrade');
          serverUtils.error.callCount.should.equal(0);
          service.upgrade.callCount.should.equal(1);
          service.upgrade.args[0][0].should.deep.equal(req.body.build);
          service.upgrade.args[0][1].should.equal('admin');
          service.upgrade.args[0][2].should.deep.equal({stageOnly: true});
          json.callCount.should.equal(1);
          json.args[0][0].should.deep.equal({ok: true});
        });
    });
  });

  describe('Complete staged build', () => {
    it('Passes the call on to the service', () => {
      auth.check.returns(Promise.resolve({}));

      return controller.complete({}, {})
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.equal('can_upgrade');
          service.complete.callCount.should.equal(1);
        });
    });
  });
});
