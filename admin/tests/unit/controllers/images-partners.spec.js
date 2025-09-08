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
    it('should load partners doc successfully', (done) => {
      const doc = { _id: 'partners', resources: { partner1: 'partner1.png' } };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves(['partner1']);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect(db.get.calledOnce).to.be.true;
        chai.expect(db.get.args[0]).to.deep.equal(['partners', { attachments: true }]);
        chai.expect($scope.doc).to.deep.equal(doc);
        done();
      });
    });

    it('should create partners doc if it does not exist', (done) => {
      db.get.onFirstCall().rejects({ status: 404 });
      db.put.resolves({ rev: 'new-rev' });
      const newDoc = { _id: 'partners', resources: {}, _rev: 'new-rev' };
      db.get.onSecondCall().resolves(newDoc);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect(db.get.calledTwice).to.be.true;
        chai.expect(db.put.calledOnce).to.be.true;
        chai.expect(db.put.args[0][0]).to.deep.equal({
          _id: 'partners',
          resources: {}
        });
        done();
      });
    });

    it('should not fail when partners doc is malformed (empty object)', (done) => {
      const doc = {};
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      setTimeout(() => {
        chai.expect(db.get.calledOnce).to.be.true;
        chai.expect($scope.doc).to.deep.equal({ resources: {} });
        done();
      });
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
      });
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
      });
    });
  });

  describe('Submit', () => {
    beforeEach(() => {
      // Mock jQuery file input
      window.$ = sinon.stub().returns([{
        files: [{
          name: 'partner.png',
          type: 'image/png',
          size: 50000
        }]
      }]);
      $translate.instant.returns('Field is required');
    });

    it('should validate partner name', () => {
      const doc = { _id: 'partners', resources: {} };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();
      $scope.name = null;
      $scope.submit();

      chai.expect($scope.error).to.equal('Field is required');
    });

    it('should validate file upload', () => {
      window.$ = sinon.stub().returns([{ files: [] }]);
      const doc = { _id: 'partners', resources: {} };
      db.get.resolves(doc);
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();
      $scope.name = 'partner1';
      $scope.submit();

      chai.expect($scope.error).to.equal('Field is required');
    });

    it('should successfully add partner with malformed doc', () => {
      const malformedDoc = {};
      const updatedDoc = { _id: 'partners', resources: {}, _rev: 'rev1' };
      
      db.get.onFirstCall().resolves(malformedDoc);
      db.putAttachment.resolves();
      db.get.onSecondCall().resolves(updatedDoc);
      db.put.resolves({ rev: 'rev2' });
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      return Promise.resolve().then(() => {
        $scope.name = 'partner1';
        $scope.submit();

        return Promise.resolve().then(() => {
          chai.expect($scope.doc.resources).to.deep.equal({});
          chai.expect(db.putAttachment.calledOnce).to.be.true;
          chai.expect(db.put.calledOnce).to.be.true;
          const putArg = db.put.args[0][0];
          chai.expect(putArg.resources).to.deep.equal({ partner1: 'partner.png' });
        });
      });
    });

    it('should handle attachment errors gracefully', () => {
      const doc = { _id: 'partners', resources: {} };
      db.get.resolves(doc);
      db.putAttachment.rejects(new Error('Upload failed'));
      $translate.instant.returns('Error saving settings');
      ResourceIcons.getDocResources.resolves([]);

      imagesPartnersController();

      return Promise.resolve().then(() => {
        $scope.name = 'partner1';
        $scope.submit();

        return Promise.resolve().then(() => {
          chai.expect($log.error.calledOnce).to.be.true;
          chai.expect($scope.error).to.equal('Error saving settings');
          chai.expect($scope.submitting).to.be.false;
        });
      });
    });
  });
});
