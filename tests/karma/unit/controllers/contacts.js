describe('Contacts controller', function() {

  'use strict';

  var assert = chai.assert,
    buttonLabel,
    buttonLabelTranslated,
    childType,
    contactSchema,
    createController,
    district,
    forms,
    icon,
    person,
    scope,
    userSettings,
    userFaciltyQuery,
    xmlForms,
    $rootScope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    district = { _id: 'abcde', name: 'My District', type: 'district_hospital'};
    person = { _id: 'lkasdfh', name: 'Alon', type: 'person'};
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    buttonLabel = 'ClICK ME!!';
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setTitle = sinon.stub();
    scope.clearSelected = sinon.stub();
    scope.clearCancelTarget = sinon.stub();
    scope.setRightActionBar = sinon.stub();
    scope.setLeftActionBar = sinon.stub();
    contactSchema = { get: sinon.stub(), getChildPlaceType: sinon.stub() };
    contactSchema.get.returns({ icon: icon, addButtonLabel : buttonLabel });
    contactSchema.getChildPlaceType.returns(childType);
    xmlForms = sinon.stub();
    forms = 'forms';
    xmlForms.callsArgWith(2, null, forms); // call the callback
    userSettings = KarmaUtils.promiseService(null, { facility_id: district._id });
    userFaciltyQuery = KarmaUtils.promiseService(null, { rows: [district] });
    createController = function() {
      return $controller('ContactsCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$state': { includes: sinon.stub() },
        '$timeout': sinon.stub(),
        '$translate': KarmaUtils.promiseService(null, buttonLabelTranslated),
        'ContactSchema': contactSchema,
        'DB': function() { return {
          get: KarmaUtils.promiseService(null, district),
          query: userFaciltyQuery
        }; },
        'LiveList': { contacts: { initialised: sinon.stub(), setSelected: sinon.stub() } },
        'Search': sinon.stub(),
        'SearchFilters': { freetext: sinon.stub(), reset: sinon.stub()},
        'UserSettings': userSettings,
        'XmlForms': xmlForms
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore();
  });

  describe('sets right actionBar', function() {
    var testRightActionBar = function(done, selectedDoc, assertions) {
      createController().getSetupPromiseForTesting()
        .then(function() {
          return scope.setSelected({ doc: selectedDoc});
        }).then(function() {
          assert(scope.setRightActionBar.called, 'right actionBar should be set');
          var actionBarArgs = scope.setRightActionBar.getCall(0).args[0];
          assertions(actionBarArgs);
          done();
        }).catch(done);
    };

    it('with the selected doc', function(done) {
      testRightActionBar(done, district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0], district);
      });
    });

    it('for the New Place button', function(done) {
      testRightActionBar(done, district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabelTranslated);
      });
    });

    it('no New Place button if no child type', function(done) {
      contactSchema.getChildPlaceType.returns(undefined);
      testRightActionBar(done, person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].child, undefined);
        // But the other buttons are there!
        assert.deepEqual(actionBarArgs.relevantForms, forms);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.deepEqual(actionBarArgs.selected[0]._id, person._id);
      });
    });

    it('for the Message and Call buttons', function(done) {
      testRightActionBar(done, person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, person);
      });
    });

    it('no Message and Call buttons if doc is not person', function(done) {
      testRightActionBar(done, district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, '');
      });
    });

    it('for the New Action button', function(done) {
      testRightActionBar(done, person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.relevantForms, forms);
      });
    });

    it('sets the actionbar partially if it couldn\'t get forms', function(done) {
      xmlForms.callsArgWith(2, { error: 'no forms brew'}); // call the callback
      testRightActionBar(done, person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.relevantForms, undefined);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.deepEqual(actionBarArgs.selected[0]._id, person._id);
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabelTranslated);
      });
    });

  });

  describe('sets left actionBar', function() {
    it('when user has facility_id', function(done) {
      createController().getSetupPromiseForTesting()
        .then(function() {
          assert(scope.setLeftActionBar.called, 'left actionBar should be set');
          var actionBarArgs = scope.setLeftActionBar.getCall(0).args[0];
          assert.deepEqual(actionBarArgs.userChildPlace, { type: childType, icon: icon });
          assert.equal(actionBarArgs.userFacilityId, district._id);
          assert.equal(actionBarArgs.addPlaceLabel, buttonLabelTranslated);
          done();
        }).catch(done);
    });

    it('when user doesn\'t have facility_id', function(done) {
      userSettings = userFaciltyQuery = KarmaUtils.promiseService(null, {});
      createController().getSetupPromiseForTesting()
        .then(function() {
          assert(!scope.setLeftActionBar.called, 'left actionBar uses defaults');
          done();
        }).catch(done);
    });
  });
});
