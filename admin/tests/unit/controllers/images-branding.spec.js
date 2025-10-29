describe('ImagesBrandingCtrl', function () {

  'use strict';

  let $controller;
  let $rootScope;

  const $log = {error: sinon.stub()};
  const $translate = sinon.stub();
  const AddAttachment = sinon.stub();
  const db = {
    get: sinon.stub(),
    put: sinon.stub()
  };
  const Translate = {fieldIsRequired: sinon.stub()};

  let imagesBrandingController;
  let $scope;

  beforeEach(module('adminApp'));

  beforeEach(inject(function (_$controller_, _$rootScope_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;

    $scope = $rootScope.$new(true);
    imagesBrandingController = () => $controller('ImagesBrandingCtrl', {
      $log,
      $scope,
      $translate,
      AddAttachment,
      DB: () => db,
      Translate
    });
  }));

  afterEach(() => sinon.restore());

  describe('Submit', () => {
    //https://github.com/medic/cht-core/issues/8026
    it('should not fail when branding doc is empty', async () => {

      db.get.withArgs('branding', {attachments: true}).resolves({});
      $translate.resolves('some message');
      Translate.fieldIsRequired.resolves('some validation messsage');

      const controller = await imagesBrandingController();
      await controller.$onInit();
      await $scope.submit();
      chai.expect($log.error.called).to.be.false;
      chai.expect($scope.doc).to.deep.be.equal({resources: {}});
    });
    it('should not fail when resources is null', async () => {

      db.get.withArgs('branding', {attachments: true}).resolves({resources: null});
      $translate.resolves('some message');
      Translate.fieldIsRequired.resolves('some validation messsage');

      const controller = await imagesBrandingController();
      await controller.$onInit();
      await $scope.submit();
      chai.expect($log.error.called).to.be.false;
      chai.expect($scope.doc).to.deep.be.equal({resources: {}});
    });
  });
});
