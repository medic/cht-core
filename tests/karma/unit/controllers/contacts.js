describe('Contacts controller', function() {

  'use strict';

  var assert = chai.assert,
    childType,
    contactSchema,
    createController,
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
    createController = function() {
      return $controller('ContactsCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': sinon.stub(),
        '$q': Q,
        '$state': { includes: sinon.stub() },
        '$timeout': sinon.stub(),
        'ContactSchema': contactSchema,
        'LiveList': { contacts: { initialised: sinon.stub(), setSelected: sinon.stub() } },
        'Search': sinon.stub(),
        'SearchFilters': { freetext: sinon.stub(), reset: sinon.stub()},
        'UserSettings': sinon.stub()
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore();
  });

  describe('sets actionBar', function() {
    it('swith the selected doc', function() {
      createController();
      scope.setSelected({ doc: district});
      assert(scope.setActionBar.called);
      var actionBarArgs = scope.setActionBar.getCall(0).args[0];
      assert.deepEqual(actionBarArgs.selected[0], district);
    });

    it('for the New Place button', function() {
      createController();
      scope.setSelected({ doc: district});
      assert(scope.setActionBar.called);
      var actionBarArgs = scope.setActionBar.getCall(0).args[0];
      assert.deepEqual(actionBarArgs.selected[0].childType, childType);
      assert.deepEqual(actionBarArgs.selected[0].childIcon, icon);
    });

    it('no New Place button if no child type', function() {
      contactSchema.getChildPlaceType.returns('');
      createController();
      scope.setSelected({ doc: district});
      assert(scope.setActionBar.called);
      var actionBarArgs = scope.setActionBar.getCall(0).args[0];
      assert.deepEqual(actionBarArgs.selected[0].childType, '');
      assert.deepEqual(actionBarArgs.selected[0].childIcon, '');
    });

    it('for the Message and Call buttons', function() {
      createController();
      scope.setSelected({ doc: person});
      assert(scope.setActionBar.called);
      var actionBarArgs = scope.setActionBar.getCall(0).args[0];
      assert.deepEqual(actionBarArgs.sendTo, person);
    });

    it('no Message and Call buttons if doc is not person', function() {
      createController();
      scope.setSelected({ doc: district});
      assert(scope.setActionBar.called);
      var actionBarArgs = scope.setActionBar.getCall(0).args[0];
      assert.deepEqual(actionBarArgs.sendTo, '');
    });
  });
});
