describe('AboutCtrl controller', () => {

  'use strict';

  let ctrl;
  let createController;
  let $rootScope;
  let scope;
  let $interval;
  let DB;
  let Session;
  let Version;
  let ResourceIcons;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller) => {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    $interval = sinon.stub().callsArg(0);
    Session = { userCtx: sinon.stub() };
    DB = {
      allDocs: sinon.stub().resolves(),
      get: sinon.stub().resolves(),
      info: sinon.stub().resolves(),
    };
    Version = {
      getLocal: sinon.stub(),
      getRemoteRev: sinon.stub()
    };
    ResourceIcons = { getDocResources: sinon.stub().resolves() };
    createController = () => {
      ctrl = $controller('AboutCtrl', {
        $interval: $interval,
        $log: { error: sinon.stub() },
        $scope: scope,
        DB: sinon.stub().returns(DB),
        Session,
        ResourceIcons,
        Version
      });
    };
  }));

  it('initializes data', () => {
    DB.info.resolves({ some: 'info' });
    Session.userCtx.returns('session info');
    Version.getLocal.resolves({ version: '3.5.0', rev: '12' });
    Version.getRemoteRev.resolves('15');

    createController();

    return Promise.resolve().then(() => {
      return Promise.resolve().then(() => {
        chai.expect(ctrl.dbInfo).to.deep.equal({ some: 'info' });
        chai.expect(ctrl.userCtx).to.equal('session info');
        chai.expect(ctrl.version).to.equal('3.5.0');
        chai.expect(ctrl.localRev).to.equal('12');
        chai.expect(ctrl.remoteRev).to.equal('15');
      });
    });
  });

  it ('display partner logo if it exists', () => {
    ResourceIcons.getDocResources.resolves(['Medic Mobile']);
    Version.getLocal.resolves({ version: '3.5.0', rev: '12' });
    Version.getRemoteRev.resolves('15');

    createController();

    return Promise.resolve().then(() => {
      chai.expect(ctrl.partners[0]).to.equal('Medic Mobile');
    });
  });
});
