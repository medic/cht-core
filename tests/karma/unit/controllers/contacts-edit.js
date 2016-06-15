describe('ContactsEditCtrl controller', function() {

  'use strict';

  var ContactForm,
      createController,
      db,
      Enketo,
      rootScope,
      scope,
      UserDistrict;

  var facility_id = 'abc123';

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    scope.setShowContent = sinon.stub();
    scope.setCancelTarget = sinon.stub();
    scope.setTitle = sinon.stub();
    UserDistrict = sinon.stub();
    db = { get: sinon.stub() };
    ContactForm = { forCreate: sinon.stub(), forEdit: sinon.stub() };
    ContactForm.forCreate.returns(KarmaUtils.mockPromise(null, {contactFormField: 'forCreate' }));
    ContactForm.forEdit.returns(KarmaUtils.mockPromise(null, {contactFormField: 'forEdit' }));
    Enketo = { renderFromXmlString: sinon.stub() };
    Enketo.renderFromXmlString.returns(KarmaUtils.mockPromise(null, {formField: 'formValue' }));
    var translate = sinon.stub();
    translate.returns(KarmaUtils.mockPromise(null, 'title'));
    createController = function() {
      return $controller('ContactsEditCtrl', {
        'ContactForm': ContactForm,
        'DB': function() { return db; },
        'Enketo' : Enketo,
        'EnketoTranslation' : sinon.stub(),
        '$log' : { error: sinon.stub(), debug: sinon.stub()},
        '$rootScope': $rootScope,
        '$scope': scope,
        'Snackbar' : sinon.stub(),
        '$state': { includes: sinon.stub(), params: { id: ''} },
        '$translate': translate,
        'UserDistrict': UserDistrict
      });
    };
  }));

  it('admin can create 3 place types', function(done) {
    UserDistrict.returns(KarmaUtils.mockPromise(null, '')); // no facility_id : admin.
    createController();
    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      chai.expect(Object.keys(scope.placeSchemas).length).to.equal(3);

      // Check the content loads.
      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        setTimeout(function() {
          scope.$apply(); // needed to resolve the promises
          chai.expect(scope.loadingContent).to.equal(false);
          chai.expect(!!scope.contentError).to.equal(false);
          done();
        });
      });
    });
  });

  it('district admin can create 2 place types', function(done) {
    UserDistrict.returns(KarmaUtils.mockPromise(null, facility_id));
    db.get.returns(KarmaUtils.mockPromise(null, { type: 'district_hospital' }));
    createController();
    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      chai.expect(db.get.callCount).to.equal(1);
      chai.expect(db.get.args[0][0]).to.equal(facility_id);
      chai.expect(Object.keys(scope.placeSchemas).length).to.equal(2);

      // Check the content loads.
      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        setTimeout(function() {
          scope.$apply(); // needed to resolve the promises
          chai.expect(scope.loadingContent).to.equal(false);
          chai.expect(!!scope.contentError).to.equal(false);
          done();
        });
      });
    });
  });
});