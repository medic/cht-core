describe('Contacts controller', function() {

  'use strict';

  var assert = chai.assert,
    buttonLabel,
    contactsLiveList,
    childType,
    contactSchema,
    createController,
    district,
    forms,
    icon,
    isAdmin = false,
    person,
    scope,
    userSettings,
    userFaciltyQuery,
    searchResults,
    searchService,
    typeLabel,
    xmlForms,
    $rootScope;

  beforeEach(module('inboxApp'));

  var deadList = function() {
    var elements = [];

    return  {
      getList: function() { return elements;},
      initialised: sinon.stub(),
      setSelected: sinon.stub(),
      refresh: sinon.stub(),
      count: function() { return elements.length; },
      insert: function(e) { elements.push(e); },
      set: function(es) { elements = es; },
      update: function(e) { elements.push(e); }
    };
  };

  beforeEach(inject(function(_$rootScope_, $controller) {
    district = { _id: 'abcde', name: 'My District', type: 'district_hospital' };
    person = { _id: 'lkasdfh', name: 'Alon', type: 'person' };
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    buttonLabel = 'ClICK ME!!';
    typeLabel = 'District';
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setTitle = sinon.stub();
    scope.clearSelected = sinon.stub();
    scope.clearCancelTarget = sinon.stub();
    scope.setRightActionBar = sinon.stub();
    scope.setLeftActionBar = sinon.stub();
    contactSchema = { get: sinon.stub(), getChildPlaceType: sinon.stub(), getPlaceTypes: sinon.stub()};
    contactSchema.get.returns({ icon: icon, addButtonLabel : buttonLabel, label: typeLabel });
    contactSchema.getChildPlaceType.returns(childType);
    contactSchema.getPlaceTypes.returns(['district_hospital']);
    xmlForms = sinon.stub();
    forms = 'forms';
    xmlForms.callsArgWith(2, null, forms); // call the callback
    userSettings = KarmaUtils.promiseService(null, { facility_id: district._id });
    userFaciltyQuery = KarmaUtils.promiseService(null, { rows: [{value: district}] });
    contactsLiveList = deadList();
    searchResults = [];

    createController = function() {
      searchService = sinon.stub();
      searchService.returns(KarmaUtils.mockPromise(null, searchResults));

      return $controller('ContactsCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$state': { includes: sinon.stub() },
        '$timeout': function(work) { work(); },
        '$translate': function(key) { return KarmaUtils.mockPromise(null, key + 'translated'); },
        'ContactSchema': contactSchema,
        'DB': function() {
          return {
            get: KarmaUtils.promiseService(null, district),
            query: userFaciltyQuery
          };
        },
        'LiveList': { contacts: contactsLiveList },
        'Search': searchService,
        'SearchFilters': { freetext: sinon.stub(), reset: sinon.stub()},
        'Session': {
          isAdmin: function() { return isAdmin; }
        },
        'UserSettings': userSettings,
        'XmlForms': xmlForms,
        'ContactSummary': function() {
          return KarmaUtils.mockPromise(null, {});
        },
        'Changes': function() {
          return { unsubscribe: function() {} };
        }
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore();
  });

  it('sets title', function(done) {
    createController().getSetupPromiseForTesting()
      .then(function() {
        return scope.setSelected({ doc: district });
      }).then(function() {
        assert(scope.setTitle.called, 'title should be set');
        assert.equal(scope.setTitle.getCall(0).args[0], typeLabel + 'translated');
        done();
      }).catch(done);
  });

  describe('sets right actionBar', function() {
    var testRightActionBar = function(done, selected, assertions) {
      createController().getSetupPromiseForTesting()
        .then(function() {
          return scope.setSelected(selected);
        }).then(function() {
          assert(scope.setRightActionBar.called, 'right actionBar should be set');
          var actionBarArgs = scope.setRightActionBar.getCall(0).args[0];
          assertions(actionBarArgs);
          done();
        }).catch(done);
    };

    it('with the selected doc', function(done) {
      testRightActionBar(done, { doc: district }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0], district);
      });
    });

    it('for the New Place button', function(done) {
      testRightActionBar(done, { doc: district }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabel);
      });
    });

    it('no New Place button if no child type', function(done) {
      contactSchema.getChildPlaceType.returns(undefined);
      testRightActionBar(done, { doc: person }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.selected[0].child, undefined);
        // But the other buttons are there!
        assert.deepEqual(actionBarArgs.relevantForms, forms);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.deepEqual(actionBarArgs.selected[0]._id, person._id);
      });
    });

    it('for the Message and Call buttons', function(done) {
      testRightActionBar(done, { doc: person }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, person);
      });
    });

    it('no Message and Call buttons if doc is not person', function(done) {
      testRightActionBar(done, { doc: district }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.sendTo, '');
      });
    });

    it('for the New Action button', function(done) {
      testRightActionBar(done, { doc: person }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.relevantForms, forms);
      });
    });

    it('sets the actionbar partially if it couldn\'t get forms', function(done) {
      xmlForms.callsArgWith(2, { error: 'no forms brew'}); // call the callback
      testRightActionBar(done, { doc: person }, function(actionBarArgs) {
        assert.deepEqual(actionBarArgs.relevantForms, undefined);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.deepEqual(actionBarArgs.selected[0]._id, person._id);
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabel);
      });
    });

    it('disables editing for own place', function(done) {
      testRightActionBar(done, { doc: district }, function(actionBarArgs) {
        assert.equal(actionBarArgs.canEdit, false);
      });
    });

    it('enables editing for not own place', function(done) {
      testRightActionBar(done, { doc: person }, function(actionBarArgs) {
        assert.equal(actionBarArgs.canEdit, true);
      });
    });

    it('disables deleting for places with child places', function(done) {
      testRightActionBar(done, { doc: district, children: { places: [ district ] } }, function(actionBarArgs) {
        assert.equal(actionBarArgs.canDelete, false);
      });
    });

    it('disables deleting for places with child people', function(done) {
      testRightActionBar(done, { doc: district, children: { persons: [ person ] } }, function(actionBarArgs) {
        assert.equal(actionBarArgs.canDelete, false);
      });
    });

    it('enables deleting for leaf nodes', function(done) {
      testRightActionBar(done, { doc: district, children: { persons: [], places: [] } }, function(actionBarArgs) {
        assert.equal(actionBarArgs.canDelete, true);
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
          assert.equal(actionBarArgs.addPlaceLabel, buttonLabel);
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

  describe('Search', function() {
    it('Puts the user\'s home place at the top of the list', function(done) {
      searchResults = [
        {
          _id: 'search-result'
        }
      ];

      createController().getSetupPromiseForTesting()
        .then(function() {
          var lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 2, 'both home place and search results are shown');
          assert.equal(lhs[0]._id, district._id, 'first item is home place');
          assert.equal(lhs[1]._id, 'search-result', 'second item is search result');

          done();
        }).catch(done);
    });
    it('Only displays the user\'s home place once', function(done) {
      searchResults = [
        {
          _id: 'search-result'
        },
        {
          _id: district._id
        }
      ];

      createController().getSetupPromiseForTesting()
        .then(function() {
          var lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 2, 'both home place and search results are shown');
          assert.equal(lhs[0]._id, district._id, 'first item is home place');
          assert.equal(lhs[1]._id, 'search-result', 'second item is search result');

          done();
        }).catch(done);
    });
    it('Only searches for top-level places as an admin', function(done) {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, { facility_id: undefined });
      searchResults = [
        {
          _id: 'search-result'
        }
      ];

      createController().getSetupPromiseForTesting()
        .then(function() {
          assert.deepEqual(searchService.args[0][1], {types: { selected: ['district_hospital']}});

          var lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 1, 'both home place and search results are shown');

          done();
        }).catch(done);
    });
  });
});
