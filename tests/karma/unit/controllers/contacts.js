describe('Contacts controller', () => {

  'use strict';

  let assert = chai.assert,
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

  const deadList = () => {
    let elements = [];

    return  {
      getList: () => elements,
      initialised: sinon.stub(),
      setSelected: sinon.stub(),
      refresh: sinon.stub(),
      count: () => elements.length,
      insert: e => elements.push(e),
      set: es => elements = es,
      update: e => elements.push(e)
    };
  };

  beforeEach(inject((_$rootScope_, $controller) => {
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
    userFaciltyQuery = KarmaUtils.promiseService(null, { rows: [{ id: district._id, value: district }] });
    contactsLiveList = deadList();
    searchResults = [];

    createController = () => {
      searchService = sinon.stub();
      searchService.returns(KarmaUtils.mockPromise(null, searchResults));

      return $controller('ContactsCtrl', {
        '$element': sinon.stub(),
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$state': { includes: sinon.stub() },
        '$timeout': work => work(),
        '$translate': key => KarmaUtils.mockPromise(null, key + 'translated'),
        'ContactSchema': contactSchema,
        'DB': () => {
          return {
            get: KarmaUtils.promiseService(null, district),
            query: userFaciltyQuery
          };
        },
        'LiveList': { contacts: contactsLiveList },
        'Search': searchService,
        'SearchFilters': { freetext: sinon.stub(), reset: sinon.stub()},
        'Session': {
          isAdmin: () => { return isAdmin; }
        },
        'UserSettings': userSettings,
        'XmlForms': xmlForms,
        'ContactSummary': () => {
          return KarmaUtils.mockPromise(null, {});
        },
        'Changes': () => {
          return { unsubscribe: () => {} };
        },
        'Tour': () => {},
        'Export': () => {}
      });
    };
  }));

  afterEach(() => {
    KarmaUtils.restore();
  });

  it('sets title', () => {
    return createController().getSetupPromiseForTesting()
      .then(() => {
        return scope.setSelected({ doc: district });
      })
      .then(() => {
        assert(scope.setTitle.called, 'title should be set');
        assert.equal(scope.setTitle.getCall(0).args[0], typeLabel + 'translated');
      });
  });

  describe('sets right actionBar', () => {
    const testRightActionBar = (selected, assertions) => {
      return createController().getSetupPromiseForTesting()
        .then(() => {
          return scope.setSelected(selected);
        })
        .then(() => {
          assert(scope.setRightActionBar.called, 'right actionBar should be set');
          const actionBarArgs = scope.setRightActionBar.getCall(0).args[0];
          assertions(actionBarArgs);
        });
    };

    it('with the selected doc', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.selected[0], district);
      });
    });

    it('for the New Place button', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabel);
      });
    });

    it('no New Place button if no child type', () => {
      contactSchema.getChildPlaceType.returns(undefined);
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.selected[0].child, undefined);
        // But the other buttons are there!
        assert.deepEqual(actionBarArgs.relevantForms, forms);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.deepEqual(actionBarArgs.selected[0]._id, person._id);
      });
    });

    it('for the Message and Call buttons', () => {
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.sendTo, person);
      });
    });

    it('no Message and Call buttons if doc is not person', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.sendTo, '');
      });
    });

    it('for the New Action button', () => {
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.relevantForms, forms);
      });
    });

    it('sets the actionbar partially if it couldn\'t get forms', () => {
      xmlForms.callsArgWith(2, { error: 'no forms brew'}); // call the callback
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.relevantForms, undefined);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.deepEqual(actionBarArgs.selected[0]._id, person._id);
        assert.deepEqual(actionBarArgs.selected[0].child.type, childType);
        assert.deepEqual(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabel);
      });
    });

    it('disables editing for own place', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.equal(actionBarArgs.canEdit, false);
      });
    });

    it('enables editing for not own place', () => {
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.equal(actionBarArgs.canEdit, true);
      });
    });

    it('disables deleting for places with child places', () => {
      return testRightActionBar({ doc: district, children: { places: [ district ] } }, actionBarArgs => {
        assert.equal(actionBarArgs.canDelete, false);
      });
    });

    it('disables deleting for places with child people', () => {
      return testRightActionBar({ doc: district, children: { persons: [ person ] } }, actionBarArgs => {
        assert.equal(actionBarArgs.canDelete, false);
      });
    });

    it('enables deleting for leaf nodes', () => {
      return testRightActionBar({ doc: district, children: { persons: [], places: [] } }, actionBarArgs => {
        assert.equal(actionBarArgs.canDelete, true);
      });
    });
  });

  describe('sets left actionBar', () => {
    it('when user has facility_id', () => {
      createController().getSetupPromiseForTesting().then(() => {
        assert(scope.setLeftActionBar.called, 'left actionBar should be set');
        const actionBarArgs = scope.setLeftActionBar.getCall(0).args[0];
        assert.deepEqual(actionBarArgs.userChildPlace, { type: childType, icon: icon });
        assert.equal(actionBarArgs.userFacilityId, district._id);
        assert.equal(actionBarArgs.addPlaceLabel, buttonLabel);
      });
    });

    it('when user doesn\'t have facility_id', () => {
      userSettings = userFaciltyQuery = KarmaUtils.promiseService(null, {});
      return createController().getSetupPromiseForTesting().then(() => {
        assert(scope.setLeftActionBar.called);
      });
    });
  });

  describe('Search', () => {

    it('Puts the home place at the top of the list', () => {
      searchResults = [
        {
          _id: 'search-result'
        }
      ];

      return createController().getSetupPromiseForTesting().then(() => {
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 2, 'both home place and search results are shown');
        assert.equal(lhs[0]._id, district._id, 'first item is home place');
        assert.equal(lhs[1]._id, 'search-result', 'second item is search result');
      });
    });

    it('Only displays the home place once', () => {
      searchResults = [
        {
          _id: 'search-result'
        },
        {
          _id: district._id
        }
      ];

      return createController().getSetupPromiseForTesting().then(() => {
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 2, 'both home place and search results are shown');
        assert.equal(lhs[0]._id, district._id, 'first item is home place');
        assert.equal(lhs[1]._id, 'search-result', 'second item is search result');
      });
    });

    it('Only searches for top-level places as an admin', () => {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, { facility_id: undefined });
      searchResults = [
        {
          _id: 'search-result'
        }
      ];

      return createController().getSetupPromiseForTesting().then(() => {
        assert.deepEqual(searchService.args[0][1], {types: { selected: ['district_hospital']}});
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 1, 'both home place and search results are shown');
      });
    });
  });
});
