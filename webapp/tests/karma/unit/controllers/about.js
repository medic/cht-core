describe('AboutCtrl controller', () => {

  'use strict';

  let createController;
  let $rootScope;
  let scope;
  let $interval;
  let DB;
  let Debug;
  let Session;
  let ResourceIcons;
  let getVersion;
  let setVersion;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, GlobalActions, Selectors) => {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    ({ setVersion } = GlobalActions($ngRedux.dispatch));
    getVersion = () => Selectors.getVersion($ngRedux.getState());
    $interval = sinon.stub().callsArg(0);
    Session = { userCtx: sinon.stub() };
    DB = {
      allDocs: sinon.stub().resolves(),
      get: sinon.stub().resolves(),
      info: sinon.stub().resolves(),
    };
    Debug = { get: sinon.stub() };
    ResourceIcons = { getDocResources: sinon.stub().resolves() };
    createController = () => {
      return $controller('AboutCtrl', {
        $interval: $interval,
        $log: { error: sinon.stub() },
        $scope: scope,
        DB: sinon.stub().returns(DB),
        Debug: Debug,
        Session: Session,
        ResourceIcons: ResourceIcons
      });
    };
  }));

  it('initializes data', () => {
    DB.info.resolves({ some: 'info' });
    Session.userCtx.returns('session info');
    Debug.get.returns('debug stuff');
    DB.allDocs.resolves({ rows: [{ value: { rev: '23-aaaa' }}] });
    DB.get.resolves({ _id: '_design/medic-client', deploy_info: { version: 4 }, _rev: '4465-dfsadsada' });
    setVersion(3);
    createController();

    return Promise.resolve().then(() => {
      chai.expect(DB.allDocs.callCount).to.equal(1);
      chai.expect(DB.allDocs.args[0][0].key).to.equal('_design/medic-client');
      chai.expect(DB.get.callCount).to.equal(1);
      chai.expect(DB.get.args[0][0]).to.equal('_design/medic-client');
      chai.expect(scope.dbInfo).to.deep.equal({ some: 'info' });
      chai.expect(scope.userCtx).to.equal('session info');
      chai.expect(scope.enableDebugModel).to.deep.equal({ val: 'debug stuff' });
      chai.expect(scope.ddocVersion).to.equal('23');
      chai.expect(scope.clientDdocVersion).to.equal('4465');
      chai.expect(getVersion()).to.equal(4);
    });
  });

  it('displays base version if exists', () => {
    DB.get
      .withArgs('_design/medic-client')
      .resolves({ _id: '_design/medic-client', deploy_info: { version: '4-beta', base_version: '4' }, _rev: '4465-0' });
    setVersion(3);
    createController();

    return Promise.resolve().then(() => {
      chai.expect(getVersion()).to.equal('4-beta (~4)');
    });
  });

  it('displays package version if ddoc not found', () => {
    DB.get.withArgs('_design/medic-client').rejects();
    setVersion('some version');
    createController();

    return Promise.resolve().then(() => {
      chai.expect(getVersion()).to.equal('some version');
    });
  });

  it('displays package version if ddoc does not have info', () => {
    DB.get.withArgs('_design/medic-client').resolves({ _id: '_design/medic-client', deploy_info: undefined });
    setVersion('some version');
    createController();

    return Promise.resolve().then(() => {
      chai.expect(getVersion()).to.equal('some version');
    });
  });

  it ('display partner logo if it exists', () => {
    ResourceIcons.getDocResources.resolves(['Medic Mobile']);
    createController();

    return Promise.resolve().then(() => {
      chai.expect(scope.partners[0]).to.equal('Medic Mobile');
    });
  });
});
