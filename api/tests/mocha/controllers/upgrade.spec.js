const expect = require('chai').expect;
const sinon = require('sinon');
const environment = require('@medic/environment');
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

    environment.buildsUrl = 'https://mybuild.com';
  });

  afterEach(() => {
    environment.buildsUrl = '';
    sinon.restore();
  });

  describe('Upgrade', () => {
    it('checks that user has the right permissions', async () => {
      auth.check.rejects('');
      
      await controller.upgrade(req, res);
      
      expect(auth.check.callCount).to.equal(1);
      expect(auth.check.args[0][1]).to.deep.equal(['can_upgrade']);
      expect(serverUtils.error.callCount).to.equal(1);
    });

    it('checks that the user passed a version', async () => {
      auth.check.resolves({});
      const json = sinon.stub();
      
      await controller.upgrade({ body: {} }, { json });
      
      expect(auth.check.callCount).to.equal(1);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(serverUtils.error.args[0][0].status).to.equal(400);
    });

    it('calls the upgrade service', async () => {
      auth.check.resolves({ user: 'admin' });
      const json = sinon.stub();
      
      await controller.upgrade(req, { json });
      
      expect(auth.check.callCount).to.equal(1);
      expect(serverUtils.error.callCount).to.equal(0);
      expect(service.upgrade.callCount).to.equal(1);
      expect(service.upgrade.args[0][0]).to.deep.equal(req.body.build);
      expect(service.upgrade.args[0][1]).to.equal('admin');
      expect(service.upgrade.args[0][2]).to.deep.equal(false);
      expect(json.callCount).to.equal(1);
      expect(json.args[0][0]).to.deep.equal({ ok: true });
    });

    it('should catch service errors', async () => {
      auth.check.resolves({ user: 'admin' });
      service.upgrade.rejects({ the: 'error' });
      const json = sinon.stub();
      
      await controller.upgrade(req, { json });
      
      expect(auth.check.callCount).to.equal(1);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(service.upgrade.callCount).to.equal(1);
      expect(json.callCount).to.equal(0);
    });
  });

  describe('Stage', () => {
    it('checks that user has the right permissions', async () => {
      auth.check.rejects('');
      
      await controller.stage(req, res);
      
      expect(auth.check.callCount).to.equal(1);
      expect(auth.check.args[0][1]).to.deep.equal(['can_upgrade']);
      expect(serverUtils.error.callCount).to.equal(1);
    });

    it('checks that the user passed a version', async () => {
      auth.check.resolves({});
      const json = sinon.stub();
      
      await controller.stage({ body: {} }, { json });
      
      expect(auth.check.callCount).to.equal(1);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(serverUtils.error.args[0][0].status).to.equal(400);
    });

    it('calls the upgrade service', async () => {
      auth.check.resolves({ user: 'admin' });
      const json = sinon.stub();
      
      await controller.stage(req, { json });
      
      expect(auth.check.callCount).to.equal(1);
      expect(auth.check.args[0][1]).to.deep.equal(['can_upgrade']);
      expect(serverUtils.error.callCount).to.equal(0);
      expect(service.upgrade.callCount).to.equal(1);
      expect(service.upgrade.args[0][0]).to.deep.equal(req.body.build);
      expect(service.upgrade.args[0][1]).to.equal('admin');
      expect(service.upgrade.args[0][2]).to.deep.equal(true);
      expect(json.callCount).to.equal(1);
      expect(json.args[0][0]).to.deep.equal({ ok: true });
    });
  });

  describe('Complete staged build', () => {
    it('Passes the call on to the service', async () => {
      auth.check.resolves({});
      
      await controller.complete(req, res);
      
      expect(auth.check.callCount).to.equal(1);
      expect(auth.check.args[0][1]).to.deep.equal(['can_upgrade']);
      expect(service.complete.callCount).to.equal(1);
    });
  });

  describe('serviceWorker', () => {
    it('should allow users who can configure to rebuild the service worker', async () => {
      sinon.stub(configWatcher, 'updateServiceWorker');
      auth.check.resolves();

      await controller.serviceWorker(req, res);

      expect(configWatcher.updateServiceWorker.callCount).to.equal(1);
      expect(auth.check.callCount).to.equal(1);
      expect(auth.check.args[0]).to.deep.equal([req, ['can_upgrade']]);
      expect(serverUtils.error.callCount).to.equal(0);
    });

    it('should throw an error when user does not have the required permissions', async () => {
      sinon.stub(configWatcher, 'updateServiceWorker');
      auth.check.rejects({ some: 'error' });

      await controller.serviceWorker(req, res);

      expect(configWatcher.updateServiceWorker.callCount).to.equal(0);
      expect(auth.check.callCount).to.equal(1);
      expect(auth.check.args[0]).to.deep.equal([req, ['can_upgrade']]);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'error' }, req, res]);
    });
  });

  describe('canUpgrade', () => {
    it('should resolve with true when upgrade is possible', async () => {
      auth.check.resolves();
      sinon.stub(service, 'canUpgrade').resolves(true);

      await controller.canUpgrade(req, res);

      expect(res.json.calledOnceWith({ ok: true })).to.be.true;
      expect(serverUtils.error.called).to.be.false;
      expect(auth.check.calledOnceWith(req, ['can_upgrade'])).to.be.true;
    });

    it('should resolve with false when upgrade is not possible', async () => {
      auth.check.resolves();
      sinon.stub(service, 'canUpgrade').resolves(false);

      await controller.canUpgrade(req, res);

      expect(res.json.calledOnceWith({ ok: false })).to.be.true;
      expect(serverUtils.error.called).to.be.false;
      expect(auth.check.calledOnceWith(req, ['can_upgrade'])).to.be.true;
    });

    it('should throw auth error when no permissions', async () => {
      auth.check.rejects({ some: 'error' });

      await controller.canUpgrade(req, res);

      expect(res.json.called).to.be.false;
      expect(serverUtils.error.calledOnce).to.be.true;
      expect(serverUtils.error.args[0][0]).to.deep.equal({ some: 'error' });
    });
  });

  describe('compare', () => {
    beforeEach(() => {
      sinon.stub(service, 'compareBuildVersions').resolves([{ type: 'add', ddoc: '_design/foo', db: 'medic' }]);
    });

    it('should require auth', async () => {
      auth.check.rejects({ some: 'auth error' });

      await controller.compare(req, res);

      expect(auth.check.calledOnceWith(req, ['can_upgrade'])).to.be.true;
      expect(service.compareBuildVersions.called).to.be.false;
      expect(serverUtils.error.calledOnce).to.be.true;
      expect(serverUtils.error.args[0][0]).to.deep.equal({ some: 'auth error' });
    });

    it('should return 400 when build is missing', async () => {
      auth.check.resolves();
      const json = sinon.stub();

      await controller.compare({ body: {} }, { json });

      expect(auth.check.calledOnce).to.be.true;
      expect(service.compareBuildVersions.called).to.be.false;
      expect(serverUtils.error.calledOnce).to.be.true;
      expect(serverUtils.error.args[0][0].status).to.equal(400);
    });

    it('should return differences from service', async () => {
      auth.check.resolves();

      await controller.compare(req, res);

      expect(service.compareBuildVersions.calledOnceWith({ version: '4.0.0' })).to.be.true;
      expect(res.json.calledOnceWith([{ type: 'add', ddoc: '_design/foo', db: 'medic' }])).to.be.true;
      expect(serverUtils.error.called).to.be.false;
    });

    it('should handle service errors', async () => {
      auth.check.resolves();
      service.compareBuildVersions.rejects({ boom: true });

      await controller.compare(req, res);

      expect(serverUtils.error.calledOnce).to.be.true;
      expect(serverUtils.error.args[0][0]).to.deep.equal({ boom: true });
    });
  });
});
