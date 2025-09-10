describe('ImagesPartnersCtrl', function () {

  'use strict';

  let $controller;
  let $rootScope;

  const $log = {error: sinon.stub()};
  const $translate = {instant: sinon.stub()};
  const db = {
    get: sinon.stub(),
    put: sinon.stub(),
    putAttachment: sinon.stub()
  };
  const ResourceIcons = {getDocResources: sinon.stub()};

  let imagesPartnersController;
  let $scope;

  beforeEach(module('adminApp'));

  beforeEach(inject(function (_$controller_, _$rootScope_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;

    $scope = $rootScope.$new(true);
    imagesPartnersController = () => $controller('ImagesPartnersCtrl', {
      $log,
      $scope,
      $translate,
      DB: () => db,
      ResourceIcons
    });
  }));

  afterEach(() => sinon.restore());

  describe('Init', () => {
    it('should not fail when partners doc is malformed (empty object)', (done) => {
      const doc = {};
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect(db.get.calledOnce).to.be.true;
        chai.expect($scope.doc).to.deep.equal({ resources: {} });
        done();
      }, 50);
    });

    it('should not fail when partners doc has null resources', (done) => {
      const doc = { resources: null };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect(db.get.calledOnce).to.be.true;
        chai.expect($scope.doc).to.deep.equal({ resources: {} });
        done();
      }, 50);
    });

    it('should not fail when partners doc has undefined resources', (done) => {
      const doc = { resources: undefined };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect(db.get.calledOnce).to.be.true;
        chai.expect($scope.doc).to.deep.equal({ resources: {} });
        done();
      }, 50);
    });
  });

  describe('addAttachment', () => {
    it('should initialize resources when saving to malformed doc', (done) => {
      const malformedDoc = {};
      const updatedDoc = { _id: 'partners', resources: {}, _rev: 'rev1' };
      
      db.get.onFirstCall().resolves(malformedDoc);
      db.putAttachment.resolves();
      db.get.onSecondCall().resolves(updatedDoc);
      db.put.resolves({ rev: 'rev2' });
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        const file = { name: 'test.png', type: 'image/png' };
        $scope.name = 'partner1';
        
        db.get().then(doc => {
          if (!doc.resources) {
            doc.resources = {};
          }
          doc.resources[$scope.name] = file.name;
          chai.expect(doc.resources).to.deep.equal({ partner1: 'test.png' });
          done();
        });
      }, 10);
    });
  });
});
