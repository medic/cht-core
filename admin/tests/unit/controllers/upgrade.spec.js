describe('UpgradeCtrl controller', () => {
  'use strict';

  const expect = chai.expect;

  let version;
  let buildsDb;
  let modal;
  let scope;
  let createController;
  let http;

  beforeEach(() => {
    module('adminApp');

    version = {
      parse: sinon.stub(),
      compare: sinon.stub(),
      minimumNextRelease: sinon.stub(),
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

    module($provide => {
      $provide.value('Modal', modal);
      $provide.value('Version', version);
      $provide.value('pouchDB', pouchDb);
      $provide.value('$http', http);
    });

    inject(($controller) => {
      createController = () => {
        scope = {};
        return $controller('UpgradeCtrl', {
          $q: Q,
          $scope: scope,
          $translate: sinon.stub().resolves(''),
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
      ['/api/v1/upgrade'],
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
      ['/api/v1/upgrade'],
    ]);
    expect(scope.versions).to.deep.equal({});
  });

  it('should load builds when deployment is valid', async () => {
    const deployInfo = { the: 'deplopy info', version: '4.1.0' };
    Object.freeze(deployInfo);

    http.get.withArgs('/api/deploy-info').resolves({ data: deployInfo });
    http.get.withArgs('/api/v1/upgrade').resolves({ data: { upgradeDoc: undefined, indexers: [] } });
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
    http.get.withArgs('/api/v1/upgrade').resolves({ data: { upgradeDoc: undefined, indexers: [] } });
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
    // todo
  });

  describe('upgrade', () => {
    it('should not perform upgrade if modal is not confirmed', async () => {
      // todo
    });

    it('should stage an upgrade', async () => {
      // todo
    });

    it('should perform an upgrade', async () => {
      // todo
    });

    it('should complete an upgrade', async () => {
      // todo
    });

    it('should catch errors and stop following', async () => {
      // todo
    });
  });

  describe('cancel upgrade', () => {
    it('should not cancel upgrade if upgrade is not in progress', async () => {
      // todo
    });

    it('should not cancel upgrade if modal is not confirmed', async () => {
      // todo
    });

    it('should cancel upgrade, stop following and load builds', () => {
      // todo
    });

    it('should catch errors', () => {
      // todo
    });
  });
});
