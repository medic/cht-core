describe('AboutCtrl controller', function() {

  'use strict';

  var createController,
      $rootScope,
      scope,
      $interval,
      DB,
      Debug,
      Session,
      PartnerImages;


  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.version = 3;
    $interval = sinon.stub().callsArg(0);
    Session = { userCtx: sinon.stub() };
    DB = {
      allDocs: sinon.stub().resolves(),
      get: sinon.stub().resolves(),
      info: sinon.stub().resolves(),
    };
    Debug = { get: sinon.stub() };
    PartnerImages = { getImages: sinon.stub().resolves() };
    createController = function() {
      return $controller('AboutCtrl', {
        $interval: $interval,
        $log: { error: sinon.stub() },
        $scope: scope,
        DB: sinon.stub().returns(DB),
        Debug: Debug,
        Session: Session,
        PartnerImages: PartnerImages
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore(Debug, Session);
  });

  it('initializes data', () => {
    DB.info.resolves({ some: 'info' });
    Session.userCtx.returns('session info');
    Debug.get.returns('debug stuff');
    DB.allDocs.withArgs({ key: '_design/medic' }).resolves({ rows: [{ value: { rev: '23-aaaa' }}] });
    DB.get
      .withArgs('_design/medic-client')
      .resolves({ _id: '_design/medic-client', deploy_info: { version: 4 }, _rev: '4465-dfsadsada' });
    createController();

    return Promise.resolve().then(() => {
      chai.expect(scope.dbInfo).to.deep.equal({ some: 'info' });
      chai.expect(scope.userCtx).to.equal('session info');
      chai.expect(scope.enableDebugModel).to.deep.equal({ val: 'debug stuff' });
      chai.expect(scope.ddocVersion).to.equal('23');
      chai.expect(scope.clientDdocVersion).to.equal('4465');
      chai.expect(scope.version).to.equal(4);
    });
  });

  it('displays base version if exists', () => {
    DB.get
      .withArgs('_design/medic-client')
      .resolves({ _id: '_design/medic-client', deploy_info: { version: '4-beta', base_version: '4' }, _rev: '4465-0' });
    createController();

    return Promise.resolve().then(() => {
      chai.expect(scope.version).to.equal('4-beta (~4)');
    });
  });

  it('displays package version if ddoc not found', () => {
    DB.get.withArgs('_design/medic-client').rejects();
    scope.version = 'some version';
    createController();

    return Promise.resolve().then(() => {
      chai.expect(scope.version).to.equal('some version');
    });
  });

  it('displays package version if ddoc does not have info', () => {
    DB.get.withArgs('_design/medic-client').resolves({ _id: '_design/medic-client', deploy_info: undefined });
    scope.version = 'some version';
    createController();

    return Promise.resolve().then(() => {
      chai.expect(scope.version).to.equal('some version');
    });
  });

  it ('display partner logo if it exists', () => {
    PartnerImages.getImages.resolves([{ name: 'Medic Mobile', data: 'xyz', type: 'image/svg+xml'}]);
    createController();

    return Promise.resolve().then(() => {
      chai.expect(scope.partners[0].name).to.equal('Medic Mobile');
      chai.expect(scope.partners[0].data).to.equal('xyz');
      chai.expect(scope.partners[0].type).to.equal('image/svg+xml');
    });
  });
});
