describe('UpgradeCtrl controller', () => {
  'use strict';

  const expect = chai.expect;

  let version;
  let buildsDb;
  let modal;
  let scope;
  let createController;
  let http;
  let timeout;
  let translate;
  let state;

  const nextTick = () => new Promise(r => setTimeout(r));

  beforeEach(() => {
    module('adminApp');

    version = {
      parse: sinon.stub(),
      compare: sinon.stub(),
      minimumNextRelease: sinon.stub(),
      currentVersion: sinon.stub(),
    };

    buildsDb = {
      query: sinon.stub(),
    };
    const pouchDb = sinon.stub().returns(buildsDb);
    modal = sinon.stub();
    http = {
      get: sinon.stub(),
      post: sinon.stub(),
      delete: sinon.stub(),
    };
    translate = sinon.stub().resolvesArg(0);
    translate.onReady = sinon.stub().resolves();
    state = {
      params: {},
      go: sinon.stub(),
    };

    module($provide => {
      $provide.value('Modal', modal);
      $provide.value('Version', version);
      $provide.value('pouchDB', pouchDb);
      $provide.value('$http', http);
      $provide.value('$state', state);
    });

    inject(($controller, _$timeout_) => {
      timeout = _$timeout_;
      createController = () => {
        scope = {};
        return $controller('UpgradeCtrl', {
          $q: Q,
          $scope: scope,
          $translate: translate,
        });
      };
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should catch errors when api deploy_info requests fails', async () => {
    http.get.rejects({ code: 500 });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(buildsDb.query.callCount).to.equal(0);
    expect(http.get.args).to.deep.equal([
      ['/api/deploy-info'],
      ['/api/v2/upgrade'],
    ]);
  });

  it('should not load builds when current deployment is invalid', async () => {
    http.get.resolves({ });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(buildsDb.query.callCount).to.equal(0);
    expect(http.get.args).to.deep.equal([
      ['/api/deploy-info'],
      ['/api/v2/upgrade'],
    ]);
    expect(scope.versions).to.deep.equal({});
  });

  it('should load builds when deployment is valid', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    Object.freeze(deployInfo);

    http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
    http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc: undefined, indexers: [] } });
    version.minimumNextRelease.returns({ major: 4, minor: 1, patch: 1, beta: 0 });

    buildsDb.query.onCall(0).resolves({
      rows: [
        { id: 'medic:medic:branch1', value: { version: 'branch1' } },
        { id: 'medic:medic:branch2', value: { version: 'branch2' } },
      ],
    });
    buildsDb.query.onCall(1).resolves({
      rows: [
        { id: 'medic:medic:beta1', value: { version: 'beta1' } },
        { id: 'medic:medic:beta2', value: { version: 'beta2' } },
      ],
    });
    buildsDb.query.onCall(2).resolves({
      rows: [
        { id: 'medic:medic:release1', value: { version: 'release1' } },
        { id: 'medic:medic:release2', value: { version: 'release2' } },
      ],
    });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(scope.versions).to.deep.equal({
      branches: [{ version: 'branch1' }, { version: 'branch2' }],
      betas: [{ version: 'beta1' }, { version: 'beta2' }],
      releases: [{ version: 'release1' }, { version: 'release2' }],
      featureReleases: [],
    });
    expect(buildsDb.query.callCount).to.equal(3);
    expect(buildsDb.query.args[0]).to.deep.equal([
      'builds/releases',
      {
        startkey: [ 'branch', 'medic', 'medic', {}],
        endkey: [ 'branch', 'medic', 'medic'],
        descending: true,
        limit: 50,
      }
    ]);
    expect(buildsDb.query.args[1]).to.deep.equal([
      'builds/releases',
      {
        startkey: [ 'beta', 'medic', 'medic', {}],
        endkey: [ 'beta', 'medic', 'medic', 4, 1, 1, 0 ],
        descending: true,
        limit: 50,
      }
    ]);
    expect(buildsDb.query.args[2]).to.deep.equal([
      'builds/releases',
      {
        startkey: [ 'release', 'medic', 'medic', {}],
        endkey: [ 'release', 'medic', 'medic', 4, 1, 1 ],
        descending: true,
        limit: 50,
      }
    ]);
  });

  it('should catch couch query errors', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    Object.freeze(deployInfo);

    http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
    http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc: undefined, indexers: [] } });
    version.minimumNextRelease.returns({ major: 4, minor: 1, patch: 1, beta: 0 });

    buildsDb.query.onCall(0).resolves({
      rows: [
        { id: 'medic:medic:branch1', value: { version: 'branch1' } },
        { id: 'medic:medic:branch2', value: { version: 'branch2' } },
      ],
    });
    buildsDb.query.onCall(1).rejects({ status: 401 });
    buildsDb.query.onCall(2).rejects({ status: 401 });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(scope.versions).to.deep.equal({});
  });

  it('should follow upgrade if already in progress', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    const upgradeDoc = {
      from: { version: '4.1.0' },
      to: { version: '4.2.0' },
    };
    Object.freeze(deployInfo);
    Object.freeze(upgradeDoc);

    http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
    http.get.withArgs('/api/v2/upgrade')
      .onCall(0).resolves({ data: { upgradeDoc, indexers: [] } })
      .onCall(1).resolves({ data: { upgradeDoc, indexers: [1, 2, 3]} })
      .onCall(2).resolves({ data: { upgradeDoc, indexers: [4, 5, 6]} });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(buildsDb.query.callCount).to.equal(0);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);

    await timeout.flush(2000);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([1, 2, 3]);

    await timeout.flush(2000);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(3);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([4, 5, 6]);
  });

  it('should stop following the upgrade when it is cancelled', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    const upgradeDoc = {
      from: { version: '4.1.0' },
      to: { version: '4.2.0' },
    };
    Object.freeze(deployInfo);
    Object.freeze(upgradeDoc);

    http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
    http.get.withArgs('/api/v2/upgrade')
      .onCall(0).resolves({ data: { upgradeDoc, indexers: [] } })
      .onCall(1).resolves({ data: { upgradeDoc, indexers: [1, 2, 3]} })
      .onCall(2).resolves({ data: { upgradeDoc, indexers: [4, 5, 6]} })
      .onCall(3).resolves({ data: { upgradeDoc: undefined, indexers: []} });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(buildsDb.query.callCount).to.equal(0);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);

    await timeout.flush(2000);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([1, 2, 3]);

    await timeout.flush(2000);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(3);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([4, 5, 6]);

    await timeout.flush(2000);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(4);
    expect(scope.upgradeDoc).to.deep.equal(undefined);
    expect(scope.indexerProgress).to.deep.equal([]);

    await timeout.flush(2000);
    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(4);
    await timeout.flush(2000);
    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(4);
    await timeout.flush(2000);
    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(4);
  });

  it('should continue following when request errors', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    const upgradeDoc = {
      from: { version: '4.1.0', build: '4.1.0' },
      to: { version: '4.2.0', build: '4.2.0' },
    };
    Object.freeze(deployInfo);
    Object.freeze(upgradeDoc);

    http.get.withArgs('/api/deploy-info')
      .onCall(0).resolves({ data: deployInfo })
      .onCall(1).resolves({ data: { the: 'deplopy info', version: '4.2.0' } });
    http.get.withArgs('/api/v2/upgrade')
      .onCall(0).resolves({ data: { upgradeDoc, indexers: [] } })
      .onCall(1).rejects({ error: 502 })
      .onCall(2).rejects({ error: 'something' })
      .onCall(3).rejects({ an: 'error' })
      .onCall(4).resolves({ data: { upgradeDoc: undefined } });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(buildsDb.query.callCount).to.equal(0);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);

    timeout.flush(2000);
    await nextTick();

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);
    expect(scope.error).to.equal(undefined);

    timeout.flush(2000);
    await nextTick();

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(3);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);
    expect(scope.error).to.equal(undefined);

    timeout.flush(2000);
    await nextTick();

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(4);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);

    timeout.flush(2000);
    await nextTick();

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(5);
    expect(scope.upgradeDoc).to.deep.equal(undefined);
    expect(scope.indexerProgress).to.deep.equal(undefined);
    expect(scope.error).to.equal(undefined);

    await timeout.flush(2000);
    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(5);
    await timeout.flush(2000);
    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(5);
    await timeout.flush(2000);
    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(5);
  });

  it('should display error after upgrade endpoint has failed for 1 minute', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    const upgradeDoc = {
      from: { version: '4.1.0', build: '4.1.0' },
      to: { version: '4.2.0', build: '4.2.0' },
    };
    Object.freeze(deployInfo);
    Object.freeze(upgradeDoc);

    http.get.withArgs('/api/deploy-info')
      .onCall(0).resolves({ data: deployInfo })
      .onCall(1).resolves({ data: { the: 'deplopy info', version: '4.2.0' } });
    http.get.withArgs('/api/v2/upgrade')
      .rejects({ error: 'something' })
      .onCall(0).resolves({ data: { upgradeDoc, indexers: [] } });

    createController();
    await scope.setupPromise;

    expect(scope.loading).to.equal(false);
    expect(buildsDb.query.callCount).to.equal(0);

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
    expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    expect(scope.indexerProgress).to.deep.equal([]);

    for (let i = 0; i < 31; i++) {
      timeout.flush(2000);
      await nextTick();
    }

    expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(32);
    expect(scope.error).to.equal('instance.upgrade.error.get_upgrade');
  });

  describe('upgrade', () => {
    it('should stage an upgrade', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade')
        .onCall(0).resolves({ data: { upgradeDoc: undefined  } })
        .onCall(1).resolves({ data: { upgradeDoc: { up: 'grade' }, indexers: [] } });
      http.post.withArgs('/api/v2/upgrade/stage').resolves();

      createController();
      await scope.setupPromise;

      await scope.upgrade({ version: '4.2.0' }, 'stage');

      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': true,
        'model.before': '4.1.0',
        'model.after': '4.2.0'
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();
      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade/stage',
        { build: { version: '4.2.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(scope.upgradeDoc).to.deep.equal({ up: 'grade' });
    });

    it('should perform an upgrade and reload the page', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      const deployInfoUpgraded = { the: 'deplopy info', version: '4.2.0' };
      http.get.withArgs('/api/deploy-info')
        .onCall(0).resolves({ data: deployInfo })
        .onCall(1).resolves({ data: deployInfoUpgraded });
      const upgradeDoc = {
        from: {
          version: '4.1.0',
          build: '4.1.0',
        },
        to: {
          version: '4.2.0',
          build: '4.2.0',
        }
      };
      http.get.withArgs('/api/v2/upgrade')
        .onCall(0).resolves({ data: { upgradeDoc: undefined  } })
        .onCall(1).resolves({ data: { upgradeDoc, indexers: [] } })
        .onCall(2).resolves({ data: { upgradeDoc: undefined, indexers: [] } });
      http.post.withArgs('/api/v2/upgrade').resolves();

      createController();
      await scope.setupPromise;

      await scope.upgrade({ version: '4.2.0' });

      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': false,
        'model.before': '4.1.0',
        'model.after': '4.2.0'
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();
      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade',
        { build: { version: '4.2.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);

      expect(state.go.callCount).to.equal(0);

      timeout.flush(2000);

      expect(state.go.callCount).to.equal(0);


      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(3);
      await nextTick();
      expect(http.get.withArgs('/api/deploy-info').callCount).to.equal(2);
      expect(state.go.callCount).to.equal(1);
      expect(state.go.args[0]).to.deep.equal(['upgrade', { upgraded: true }, { reload: true }]);
    });

    it('should display an error when upgrade could not complete', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade')
        .onCall(0).resolves({ data: { upgradeDoc: undefined  } })
        .onCall(1).resolves({ data: { upgradeDoc: { up: 'grade' }, indexers: [] } })
        .onCall(2).resolves({ data: { upgradeDoc: undefined, indexers: [] } });
      http.post.withArgs('/api/v2/upgrade').resolves();

      createController();
      await scope.setupPromise;

      await scope.upgrade({ version: '4.2.0' });

      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': false,
        'model.before': '4.1.0',
        'model.after': '4.2.0'
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();
      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade',
        { build: { version: '4.2.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(scope.upgradeDoc).to.deep.equal({ up: 'grade' });

      expect(state.go.callCount).to.equal(0);

      timeout.flush(2000);

      expect(state.go.callCount).to.equal(0);


      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(3);
      await nextTick();
      expect(http.get.withArgs('/api/deploy-info').callCount).to.equal(2);
      expect(state.go.callCount).to.equal(0);
      expect(scope.error).to.equal('instance.upgrade.error.deploy');
    });

    it('should log status errors on complete', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc: undefined  } });

      http.post.withArgs('/api/v2/upgrade/complete').rejects({ an: 'error', status: 500 });

      createController();
      await scope.setupPromise;

      await scope.upgrade({ version: '4.2.0' }, 'complete');

      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': false,
        'model.before': '4.1.0',
        'model.after': '4.2.0',
        'model.errorKey': 'instance.upgrade.error.deploy',
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();

      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade/complete',
        { build: { version: '4.2.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
    });

    it('should throw any error when action is not complete', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc: undefined  } });

      http.post.withArgs('/api/v2/upgrade/stage').rejects({ an: 'error' });

      createController();
      await scope.setupPromise;

      await scope.upgrade({ version: '4.2.0' }, 'stage');

      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': true,
        'model.before': '4.1.0',
        'model.after': '4.2.0',
        'model.errorKey': 'instance.upgrade.error.deploy',
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();

      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade/stage',
        { build: { version: '4.2.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
    });

    it('should complete an upgrade and reload page', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc: undefined  } });
      http.get.withArgs('/setup/poll').rejects({ error: 'whatever' });
      http.get.withArgs('/setup/poll').onCall(5).resolves();
      http.post.withArgs('/api/v2/upgrade/complete').rejects({ the: 'timeout error' });

      createController();
      await scope.setupPromise;

      await scope.upgrade({ version: '4.2.0' }, 'complete');

      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': false,
        'model.before': '4.1.0',
        'model.after': '4.2.0',
        'model.errorKey': 'instance.upgrade.error.deploy',
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      const promise = upgradeCb();
      await timeout.flush(1000);
      await nextTick();
      await timeout.flush(1000);
      await nextTick();
      await timeout.flush(1000);
      await nextTick();
      await timeout.flush(1000);
      await nextTick();
      await timeout.flush(1000);
      await nextTick();
      await timeout.flush(1000);
      await nextTick();
      await promise;

      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade/complete',
        { build: { version: '4.2.0' } },
      ]);

      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(http.get.withArgs('/setup/poll').callCount).to.equal(6);
    });
  });

  describe('abort upgrade', () => {
    it('should not cancel abort if upgrade is not in progress', async () => {
      modal.resolves();
      buildsDb.query.resolves({});
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').onCall(0).resolves({ data: { upgradeDoc: undefined  } });

      createController();
      await scope.setupPromise;

      await scope.abortUpgrade();

      expect(modal.callCount).to.equal(0);
      expect(http.delete.callCount).to.equal(0);
    });

    it('should abort upgrade and load builds', async () => {
      modal.resolves();
      buildsDb.query.resolves({ rows: [] });
      version.minimumNextRelease.returns({ });
      const deployInfo = { the: 'deplopy info', version: '4.2.0' };
      const upgradeDoc = { to: { version: '4.3.0' } };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade')
        .onCall(0).resolves({ data: { upgradeDoc } })
        .onCall(1).resolves({ data: { upgradeDoc: undefined } });
      http.delete.resolves();

      createController();
      await scope.setupPromise;

      expect(buildsDb.query.callCount).to.equal(0);

      await scope.abortUpgrade();

      expect(modal.callCount).to.equal(1);
      expect(http.delete.callCount).to.equal(0);

      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_abort.html',
        controller: 'UpgradeConfirmCtrl',
        'model.before': '4.2.0',
        'model.after': '4.3.0',
        'model.errorKey': 'instance.upgrade.error.abort',
      });
      const abortDb = modal.args[0][0].model.confirmCallback;

      await abortDb();

      expect(http.delete.callCount).to.equal(1);
      expect(http.delete.args[0]).to.deep.equal(['/api/v2/upgrade']);

      expect(scope.upgradeDoc).to.equal(undefined);
      expect(buildsDb.query.callCount).to.equal(3);
    });

    it('should throw errors', async () => {
      modal.resolves();
      buildsDb.query.resolves({ rows: [] });
      version.minimumNextRelease.returns({ });
      const deployInfo = { the: 'deplopy info', version: '4.2.0' };
      const upgradeDoc = { to: { version: '4.3.0' } };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade')
        .onCall(0).resolves({ data: { upgradeDoc } })
        .onCall(1).resolves({ data: { upgradeDoc: undefined } });
      http.delete.rejects({ the: 'error' });

      createController();
      await scope.setupPromise;

      expect(buildsDb.query.callCount).to.equal(0);

      await scope.abortUpgrade();

      expect(modal.callCount).to.equal(1);
      expect(http.delete.callCount).to.equal(0);

      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_abort.html',
        controller: 'UpgradeConfirmCtrl',
        'model.before': '4.2.0',
        'model.after': '4.3.0',
        'model.errorKey': 'instance.upgrade.error.abort',
      });
      const abortCb = modal.args[0][0].model.confirmCallback;

      try {
        await abortCb();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });
      }

      expect(http.delete.callCount).to.equal(1);
      expect(http.delete.args[0]).to.deep.equal(['/api/v2/upgrade']);

      expect(scope.upgradeDoc).to.equal(upgradeDoc);
      expect(buildsDb.query.callCount).to.equal(0);
    });
  });

  describe('retry upgrade', () => {
    it('should retry a staged upgrade', async () => {
      modal.resolves();
      const upgradeDoc = {
        to: { the: 'buildinfo', version: '4.2.0' },
        action: 'stage',
      };
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc, indexers: [] } });
      http.post.withArgs('/api/v2/upgrade/stage').resolves();

      createController();
      await scope.setupPromise;

      await scope.retryUpgrade();

      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': true,
        'model.before': '4.1.0',
        'model.after': '4.2.0'
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();
      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade/stage',
        { build: { the: 'buildinfo', version: '4.2.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    });

    it('should retry a full upgrade', async () => {
      modal.resolves();
      const upgradeDoc = {
        to: { the: 'buildinfo', version: '4.3.0' },
        action: 'upgrade',
      };

      const deployInfo = { the: 'deplopy info', version: '4.2.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc, indexers: [] } });
      http.post.withArgs('/api/v2/upgrade').resolves();

      createController();
      await scope.setupPromise;

      await scope.retryUpgrade();

      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': false,
        'model.before': '4.2.0',
        'model.after': '4.3.0'
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();
      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade',
        { build: { the: 'buildinfo', version: '4.3.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(scope.upgradeDoc).to.deep.equal(upgradeDoc);
    });

    it('should do nothing if no upgrade doc', async () => {
      modal.resolves();
      buildsDb.query.resolves({
        rows: [
          { id: 'medic:medic:branch1', value: { version: 'branch1' } },
          { id: 'medic:medic:branch2', value: { version: 'branch2' } },
        ],
      });
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade').resolves({ data: { upgradeDoc: undefined  } });

      createController();
      await scope.setupPromise;

      await scope.retryUpgrade();

      expect(modal.callCount).to.equal(0);
      expect(scope.upgradeDoc).to.deep.equal(undefined);
    });

    it('should log 500 errors', async () => {
      modal.resolves();
      const upgradeDoc = {
        to: { the: 'buildinfo', version: '4.3.0' },
        action: 'upgrade',
      };
      const deployInfo = { the: 'deplopy info', version: '4.1.0' };
      http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
      http.get.withArgs('/api/v2/upgrade')
        .onCall(0).resolves({ data: { upgradeDoc  } })
        .onCall(1).resolves({ data: { } });

      http.post.withArgs('/api/v2/upgrade').rejects({ an: 'error', status: 500 });

      createController();
      await scope.setupPromise;

      await scope.retryUpgrade();

      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);
      expect(modal.callCount).to.equal(1);
      expect(modal.args[0][0]).to.deep.nested.include({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        'model.stageOnly': false,
        'model.before': '4.1.0',
        'model.after': '4.3.0',
        'model.errorKey': 'instance.upgrade.error.deploy',
      });
      const upgradeCb = modal.args[0][0].model.confirmCallback;
      expect(http.post.callCount).to.equal(0);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(1);

      await upgradeCb();

      expect(http.post.callCount).to.equal(1);
      expect(http.post.args[0]).to.deep.equal([
        '/api/v2/upgrade',
        { build: { the: 'buildinfo', version: '4.3.0' } },
      ]);
      expect(http.get.withArgs('/api/v2/upgrade').callCount).to.equal(2);
      expect(scope.upgradeDoc).to.be.undefined;
    });
  });
});
