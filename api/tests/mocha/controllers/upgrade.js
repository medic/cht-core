const should = require('chai').should();

const sinon = require('sinon');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

const controller = require('../../../src/controllers/upgrade');
const service = require('../../../src/services/setup/upgrade');
const configWatcher = require('../../../src/services/config-watcher');

describe('Upgrade controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {
        build: { version: '4.0.0' },
      }
    };

    res = {
      json: sinon.stub(),
    };

    sinon.stub(auth, 'check');
    sinon.stub(serverUtils, 'error');
    sinon.stub(service, 'upgrade').resolves();
    sinon.stub(service, 'complete').resolves();
  });

  afterEach(() => sinon.restore());

  describe('Upgrade', () => {
    it('checks that user has the right permissions', () => {
      auth.check.rejects('');
      return controller
        .upgrade(req, res)
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.deep.equal(['can_configure']);
          serverUtils.error.callCount.should.equal(1);
        });
    });

    it('checks that the user passed a version', () => {
      auth.check.resolves({});
      const json = sinon.stub();
      return controller
        .upgrade({ body: { }}, { json })
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(1);
          serverUtils.error.args[0][0].status.should.equal(400);
        });
    });

    it('calls the upgrade service', () => {
      auth.check.resolves({ user: 'admin' });
      const json = sinon.stub();
      return controller
        .upgrade(req, { json })
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(0);
          service.upgrade.callCount.should.equal(1);
          service.upgrade.args[0][0].should.deep.equal(req.body.build);
          service.upgrade.args[0][1].should.equal('admin');
          service.upgrade.args[0][2].should.deep.equal(false);
          json.callCount.should.equal(1);
          json.args[0][0].should.deep.equal({ok: true});
        });
    });

    it('should catch service errors', () => {
      auth.check.resolves({ user: 'admin' });
      service.upgrade.rejects({ the: 'error' });
      const json = sinon.stub();
      return controller
        .upgrade(req, { json })
        .then(() => should.fail('Should have thrown'))
        .catch(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(1);
          service.upgrade.callCount.should.equal(1);
          json.callCount.should.equal(0);
        });
    });
  });

  describe('Stage', () => {
    it('checks that user has the right permissions', () => {
      auth.check.rejects('');
      return controller.stage(req, res)
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.deep.equal(['can_configure']);
          serverUtils.error.callCount.should.equal(1);
        });
    });

    it('checks that the user passed a version', () => {
      auth.check.resolves({});
      const json = sinon.stub();
      return controller
        .stage({body: { }}, { json })
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(1);
          serverUtils.error.args[0][0].status.should.equal(400);
        });
    });

    it('calls the upgrade service', () => {
      auth.check.resolves({ user: 'admin' });
      const json = sinon.stub();
      return controller
        .stage(req, { json })
        .then(() => {
          auth.check.callCount.should.equal(1);
          serverUtils.error.callCount.should.equal(0);
          service.upgrade.callCount.should.equal(1);
          service.upgrade.args[0][0].should.deep.equal(req.body.build);
          service.upgrade.args[0][1].should.equal('admin');
          service.upgrade.args[0][2].should.deep.equal(true);
          json.callCount.should.equal(1);
          json.args[0][0].should.deep.equal({ok: true});
        });
    });
  });

  describe('Complete staged build', () => {
    it('Passes the call on to the service', () => {
      auth.check.returns(Promise.resolve({}));

      return controller.complete(req, res)
        .then(() => {
          auth.check.callCount.should.equal(1);
          auth.check.args[0][1].should.deep.equal(['can_configure']);
          service.complete.callCount.should.equal(1);
        });
    });
  });

  describe('serviceWorker', () => {
    it('should allow users who can configure to rebuild the service worker', () => {
      sinon.stub(configWatcher, 'updateServiceWorker');
      auth.check.resolves();

      return controller.serviceWorker(req, res).then(() => {
        configWatcher.updateServiceWorker.callCount.should.equal(1);
        auth.check.callCount.should.equal(1);
        auth.check.args[0].should.deep.equal([req, ['can_configure']]);
        serverUtils.error.callCount.should.equal(0);
      });
    });

    it('should throw an error when user does not have the required permissions', () => {
      sinon.stub(configWatcher, 'updateServiceWorker');
      auth.check.rejects({ some: 'error' });

      return controller.serviceWorker(req, res).then(() => {
        configWatcher.updateServiceWorker.callCount.should.equal(0);
        auth.check.callCount.should.equal(1);
        auth.check.args[0].should.deep.equal([req, ['can_configure']]);
        serverUtils.error.callCount.should.equal(1);
        serverUtils.error.args[0].should.deep.equal([{ some: 'error' }, req, res]);
      });
    });
  });

  describe('upgradeInProgress', () => {
    it('should check that the user has permissions to check the upgrade', async () => {
      auth.check.rejects({ user: 'admin' });

      await controller.upgradeInProgress(req, res);

      auth.check.callCount.should.equal(1);
      auth.check.args[0].should.deep.equal([req, ['can_configure']]);
      res.json.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
    });

    it('should call service and return results', async () => {
      auth.check.resolves();
      sinon.stub(service, 'upgradeInProgress').resolves({ the: 'upgrade' });
      sinon.stub(service, 'indexerProgress').resolves(['indexers']);

      await controller.upgradeInProgress(req, res);

      service.upgradeInProgress.callCount.should.equal(1);
      service.indexerProgress.callCount.should.equal(1);
      res.json.callCount.should.equal(1);
      res.json.args[0].should.deep.equal([ {
        upgradeDoc: { the: 'upgrade' },
        indexers: ['indexers'],
      }]);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should catch upgradeInProgress service errors', async () => {
      auth.check.resolves();
      sinon.stub(service, 'upgradeInProgress').rejects({ the: 'upgrade' });
      sinon.stub(service, 'indexerProgress').resolves(['indexers']);

      await controller.upgradeInProgress(req, res);

      service.upgradeInProgress.callCount.should.equal(1);
      service.indexerProgress.callCount.should.equal(1);
      res.json.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
    });

    it('should catch indexerProgress service errors', async () => {
      auth.check.resolves();
      sinon.stub(service, 'upgradeInProgress').resolves({ the: 'upgrade' });
      sinon.stub(service, 'indexerProgress').rejects(['indexers']);

      await controller.upgradeInProgress(req, res);

      service.upgradeInProgress.callCount.should.equal(1);
      service.indexerProgress.callCount.should.equal(1);
      res.json.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
    });
  });

  describe('abortUpgrade', () => {
    it('should check that the user has permissions to check the upgrade', async () => {
      auth.check.rejects({ user: 'admin' });

      await controller.abort(req, res);

      auth.check.callCount.should.equal(1);
      auth.check.args[0].should.deep.equal([req, ['can_configure']]);
      res.json.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
    });

    it('should call service', async () => {
      auth.check.resolves();
      sinon.stub(service, 'abort').resolves();

      await controller.abort(req, res);

      service.abort.callCount.should.equal(1);
      res.json.callCount.should.equal(1);
      res.json.args[0].should.deep.equal([{ ok: true }]);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should catch service errors', async () => {
      auth.check.resolves();
      sinon.stub(service, 'abort').rejects();

      await controller.abort(req, res);

      service.abort.callCount.should.equal(1);
      res.json.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
    });
  });
});
