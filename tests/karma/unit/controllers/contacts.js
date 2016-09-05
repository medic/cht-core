describe('Contacts controller', function() {

  'use strict';

  var assert = chai.assert,
    childType,
    contactSchema,
    createController,
    forms,
    icon,
    scope,
    userSettings,
    $rootScope;

  var district = { _id: 'abcde', name: 'My District', type: 'district_hospital'};
  var person = { _id: 'lkasdfh', name: 'Alon', type: 'person'};

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setTitle = sinon.stub();
    scope.clearSelected = sinon.stub();
    scope.clearCancelTarget = sinon.stub();
    scope.setRightActionBar = sinon.stub();
    scope.setLeftActionBar = sinon.stub();
    contactSchema = { get: sinon.stub(), getChildPlaceType: sinon.stub() };
    contactSchema.getChildPlaceType.returns(childType);
    contactSchema.get.returns({ icon: icon});
    var xmlForms = sinon.stub();
    forms = 'forms';
    xmlForms.callsArgWith(2, null, forms); // call the callback
    userSettings = KarmaUtils.promiseService(null, { facility_id: district._id });
    createController = function() {
      return $controller('ContactsCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': sinon.stub(),
        '$q': Q,
        '$state': { includes: sinon.stub() },
        '$timeout': sinon.stub(),
        'ContactSchema': contactSchema,
        'DB': function() { return { get: KarmaUtils.promiseService(null, district) }; },
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
    var testRightActionBar = function(selectedDoc, assertions) {
      createController();
      scope.setSelected({ doc: selectedDoc});
      assert(scope.setRightActionBar.called, 'right actionBar should be set');
      var actionBarArgs = scope.setRightActionBar.getCall(0).args[0];
      assertions(actionBarArgs);
    };

    it('with the selected doc', function() {
      testRightActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0], district);
      });
    });

    it('for the New Place button', function() {
      testRightActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
      });
    });

    it('no New Place button if no child type', function() {
      contactSchema.getChildPlaceType.returns('');
      testRightActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].child.type, '');
        assert.deepEqual(actionBarArgs.selected[0].child.icon, '');
      });
    });

    it('for the Message and Call buttons', function() {
      testRightActionBar(person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, person);
      });
    });

    it('no Message and Call buttons if doc is not person', function() {
      testRightActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, '');
      });
    });

    it('for the New Action button', function() {
      testRightActionBar(person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.relevantForms, forms);
      });
    });
  });

  describe('sets left actionBar', function() {
    it('when user has facility_id', function(done) {
      createController().getSetupPromiseForTesting()
        .then(function() {
          assert(scope.setLeftActionBar.called, 'left actionBar should be set');
          var actionBarArgs = scope.setLeftActionBar.getCall(0).args[0];
          assert.deepEqual(
            actionBarArgs,
            {
              userChildPlace: { type: childType, icon: icon },
              userFacilityId : district._id
            }
          );
          done();
        }).catch(done);
    });

    it('when user doesn\'t have facility_id', function(done) {
      userSettings = KarmaUtils.promiseService(null, {});
      createController().getSetupPromiseForTesting()
        .then(function() {
          assert(!scope.setLeftActionBar.called, 'left actionBar uses defaults');
          done();
        }).catch(done);
    });
  });
});
