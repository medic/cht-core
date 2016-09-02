describe('Contacts controller', function() {

  'use strict';

  var assert = chai.assert,
    childType,
    contactSchema,
    createController,
    forms,
    icon,
    scope,
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
    scope.setActionBar = sinon.stub();
    contactSchema = { get: sinon.stub(), getChildPlaceType: sinon.stub() };
    contactSchema.getChildPlaceType.returns(childType);
    contactSchema.get.returns({ icon: icon});
    var xmlForms = sinon.stub();
    forms = 'forms';
    xmlForms.callsArgWith(2, null, forms); // call the callback
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
        'UserSettings': KarmaUtils.promiseService(null, { facility_id: district._id }),
        'XmlForms': xmlForms
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore();
  });

  describe('sets actionBar', function() {
    var testActionBar = function(selectedDoc, assertions) {
      createController();
      scope.setSelected({ doc: selectedDoc});
      assert(scope.setActionBar.called, 'actionBar should be set');
      var actionBarArgs = scope.setActionBar.getCall(0).args[0];
      assertions(actionBarArgs);
    };

    it('with the selected doc', function() {
      testActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0], district);
      });
    });

    it('for the New Place button', function() {
      testActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].childType, childType);
        assert.deepEqual(actionBarArgs.selected[0].childIcon, icon);
      });
    });

    it('no New Place button if no child type', function() {
      contactSchema.getChildPlaceType.returns('');
      testActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].childType, '');
        assert.deepEqual(actionBarArgs.selected[0].childIcon, '');
      });
    });

    it('for the Message and Call buttons', function() {
      testActionBar(person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, person);
      });
    });

    it('no Message and Call buttons if doc is not person', function() {
      testActionBar(district, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, '');
      });
    });

    it('for the New Action button', function() {
      testActionBar(person, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.relevantForms, forms);
      });
    });
  });
});
