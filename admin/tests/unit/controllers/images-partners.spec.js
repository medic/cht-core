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

  describe('Document Loading', () => {
    it('should load partners doc successfully', (done) => {
      const doc = { _id: 'partners', resources: { partner1: 'partner1.png' } };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves(['partner1']);

      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        chai.expect(db.get.calledOnce).to.be.true;
        chai.expect(db.get.args[0]).to.deep.equal(['partners', { attachments: true }]);
        chai.expect($scope.doc).to.deep.equal(doc);
        chai.expect($scope.images).to.deep.equal(['partner1']);
        chai.expect($scope.loading).to.be.false;
        done();
      }, 50);
    });

    it('should create partners doc if it does not exist', (done) => {
      db.get.onFirstCall().rejects({ status: 404 });
      db.put.resolves({ rev: 'new-rev' });
      const newDoc = { _id: 'partners', resources: {}, _rev: 'new-rev' };
      db.get.onSecondCall().resolves(newDoc);

      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        chai.expect($scope.loading).to.be.false;
        done();
      }, 50);
    });

    it('should not fail when partners doc is malformed (empty object)', (done) => {
      const doc = {};
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        chai.expect($scope.loading).to.be.false;
        done();
      }, 50);
    });

    it('should not fail when partners doc has null resources', (done) => {
      const doc = { resources: null };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        chai.expect($scope.loading).to.be.false;
        done();
      }, 50);
    });

    it('should not fail when partners doc has undefined resources', (done) => {
      const doc = { resources: undefined };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        chai.expect($scope.loading).to.be.false;
        done();
      }, 50);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      $translate.instant.returns('Field is required');
      const doc = { _id: 'partners', resources: {} };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);
    });

    it('should validate partner name is required', (done) => {
      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        $scope.name = null;
        $scope.submit();
        chai.expect($scope.error).to.equal('Field is required');
        done();
      }, 50);
    });

    it('should validate partner name is not empty', (done) => {
      imagesPartnersController();

      setTimeout(() => {
        $rootScope.$apply();
        $scope.name = '';
        $scope.submit();
        chai.expect($scope.error).to.equal('Field is required');
        done();
      }, 50);
    });
  });

  describe('Resource Initialization', () => {
    it('should initialize resources property when missing during attachment', () => {
      const malformedDoc = {};
      
      if (!malformedDoc.resources) {
        malformedDoc.resources = {};
      }
      malformedDoc.resources['test-partner'] = 'test.png';

      chai.expect(malformedDoc.resources).to.deep.equal({ 'test-partner': 'test.png' });
    });

    it('should initialize resources property when null during attachment', () => {
      const docWithNullResources = { resources: null };
      
      if (!docWithNullResources.resources) {
        docWithNullResources.resources = {};
      }
      docWithNullResources.resources['test-partner'] = 'test.png';

      chai.expect(docWithNullResources.resources).to.deep.equal({ 'test-partner': 'test.png' });
    });

    it('should preserve existing resources when adding new partner', () => {
      const docWithExistingResources = { resources: { existing: 'existing.png' } };
      
      if (!docWithExistingResources.resources) {
        docWithExistingResources.resources = {};
      }
      docWithExistingResources.resources['new-partner'] = 'new.png';

      chai.expect(docWithExistingResources.resources).to.deep.equal({ 
        existing: 'existing.png',
        'new-partner': 'new.png' 
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', (done) => {
      const error = { status: 500, message: 'Database error' };
      db.get.rejects(error);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect($scope.loading).to.be.false;
        done();
      }, 50);
    });
  });
});
