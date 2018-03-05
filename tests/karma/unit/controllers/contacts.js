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
      searchResults,
      searchService,
      getDataRecords,
      typeLabel,
      xmlForms,
      $rootScope,
      scrollLoaderStub,
      scrollLoaderCallback,
      changes,
      changesCallback,
      contactSearchLiveList;

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
      update: e => {
        if (e !== district || elements[0] !== district) {
          elements.push(e);
        }
      }
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
    forms = [{ internalId: 'a-form', icon: 'an-icon', title: 'A Form' }];
    xmlForms.callsArgWith(2, null, forms); // call the callback
    userSettings = KarmaUtils.promiseService(null, { facility_id: district._id });
    contactsLiveList = deadList();
    contactSearchLiveList = deadList();
    getDataRecords = KarmaUtils.promiseService(null, district);
    searchResults = [];
    var $translate = key => Promise.resolve(key + 'translated');
    $translate.instant = key => key + 'translated';
    scrollLoaderStub = {
      init: callback => {
        scrollLoaderCallback = callback;
      }
    };

    changes = (options) =>  {
      changesCallback = options.callback;
      return { unsubscribe: () => {} };
    };

    createController = () => {
      searchService = sinon.stub();
      searchService.returns(Promise.resolve(searchResults));

      return $controller('ContactsCtrl', {
        '$element': sinon.stub(),
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$scope': scope,
        '$state': { includes: sinon.stub() },
        '$timeout': work => work(),
        '$translate': $translate,
        'Changes': changes,
        'ContactSchema': contactSchema,
        'ContactSummary': () => {
          return Promise.resolve({});
        },
        'Export': () => {},
        'GetDataRecords': getDataRecords,
        'LiveList': { contacts: contactsLiveList, 'contact-search': contactSearchLiveList },
        'Search': searchService,
        'SearchFilters': { freetext: sinon.stub(), reset: sinon.stub()},
        'Session': {
          isAdmin: () => { return isAdmin; }
        },
        'Simprints': { enabled: () => false },
        'Tour': () => {},
        'TranslateFrom': key => `TranslateFrom:${key}`,
        'UserSettings': userSettings,
        'XmlForms': xmlForms
      });
    };
  }));

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
        assert.equal(actionBarArgs.selected[0].child.type, childType);
        assert.equal(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(actionBarArgs.selected[0].child.addPlaceLabel, buttonLabel);
      });
    });

    it('no New Place button if no child type', () => {
      contactSchema.getChildPlaceType.returns(undefined);
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.equal(actionBarArgs.selected[0].child, undefined);
        // But the other buttons are there!
        assert.equal(actionBarArgs.relevantForms.length, 1);
        assert.equal(actionBarArgs.relevantForms[0].code, 'a-form');
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.equal(actionBarArgs.selected[0]._id, person._id);
      });
    });

    it('for the Message and Call buttons', () => {
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.deepEqual(actionBarArgs.sendTo, person);
      });
    });

    it('no Message and Call buttons if doc is not person', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.equal(actionBarArgs.sendTo, '');
      });
    });

    it('for the New Action button', () => {
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.equal(actionBarArgs.relevantForms.length, 1);
        assert.equal(actionBarArgs.relevantForms[0].code, 'a-form');
      });
    });

    it('sets the actionbar partially if it couldn\'t get forms', () => {
      xmlForms.callsArgWith(2, { error: 'no forms brew'}); // call the callback
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.equal(actionBarArgs.relevantForms, undefined);
        assert.deepEqual(actionBarArgs.sendTo, person);
        assert.equal(actionBarArgs.selected[0]._id, person._id);
        assert.equal(actionBarArgs.selected[0].child.type, childType);
        assert.equal(actionBarArgs.selected[0].child.icon, icon);
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

    describe('translates form titles', () => {

      const testTranslation = (form, expectedTitle) => {
        xmlForms.callsArgWith(2, null, [ form ]);
        return createController().getSetupPromiseForTesting()
          .then(() => {
            return scope.setSelected({ doc: district });
          })
          .then(() => {
            assert(scope.setRightActionBar.called, 'right actionBar should be set');
            const actionBarArgs = scope.setRightActionBar.getCall(0).args[0];
            assert.deepEqual(actionBarArgs.relevantForms.length, 1);
            assert.equal(actionBarArgs.relevantForms[0].title, expectedTitle);
          });
      };

      it('uses the translation_key', () => {
        const form = { internalId: 'a', icon: 'a-icon', translation_key: 'a.form.key' };
        return testTranslation(form, 'a.form.keytranslated');
      });

      it('uses the title', () => {
        const form = { internalId: 'a', icon: 'a-icon', title: 'My Form' };
        return testTranslation(form, 'TranslateFrom:My Form');
      });

      it('uses the translation_key in preference to the title', () => {
        const form = { internalId: 'a', icon: 'a-icon', translation_key: 'a.form.key', title: 'My Form' };
        return testTranslation(form, 'a.form.keytranslated');
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
      userSettings = KarmaUtils.promiseService(null, {});
      getDataRecords = KarmaUtils.promiseService();
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

    it('when paginating, does not skip the extra place for admins #4085', () => {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, { facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);

      return createController().getSetupPromiseForTesting({ scrollLoaderStub }).then(() => {
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 50);
        scrollLoaderCallback();
        assert.equal(searchService.args[1][2].skip, 50);
        assert.equal(searchService.args[1][2].limit, 50);
      });
    });

    it('when paginating, does modify skip for non-admins #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);

      return createController().getSetupPromiseForTesting({ scrollLoaderStub }).then(() => {
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 51);
        scrollLoaderCallback();
        assert.equal(searchService.args[1][2].skip, 50);
        assert.equal(searchService.args[1][2].limit, 50);
      });
    });

    it('when refreshing list as admin, does not modify limit #4085', () => {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, { facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(10).fill(searchResult);

      return createController().getSetupPromiseForTesting({ scrollLoaderStub }).then(() => {
        const lhs = contactsLiveList.getList();
        changesCallback();
        assert.equal(lhs.length, 10);
        assert.equal(searchService.args[1][2].limit, 10);
        assert.equal(searchService.args[1][2].skip, undefined);
      });
    });

    it('when refreshing list as non-admin, does modify limit #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(10).fill(searchResult);

      return createController().getSetupPromiseForTesting({ scrollLoaderStub }).then(() => {
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 11);
        changesCallback();
        assert.equal(searchService.args[1][2].limit, 10);
        assert.equal(searchService.args[1][2].skip, undefined);
      });
    });

    it('resets limit/skip modifier when filtering #4085', () => {
      let lhs;
      const searchResult = { _id: 'search-result' };
      searchResults = Array(10).fill(searchResult);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 11);
          scope.filters = {search: true};
          searchResults = Array(50).fill(searchResult);
          searchService.returns(Promise.resolve(searchResults));
          scope.search();
          assert.equal(searchService.args[1][2].limit, 50);
          assert.equal(searchService.args[1][2].skip, undefined);
          return Promise.resolve();
        })
        .then(() => {
          lhs = contactSearchLiveList.getList();
          assert.equal(lhs.length, 50);
          //aand paginate the search results, also not skipping the extra place
          scrollLoaderCallback();
          assert.equal(searchService.args[2][2].skip, 50);
          assert.equal(searchService.args[2][2].limit, 50);
        });
    });

    it('when paginating, does not modify the skip when it finds homeplace #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(49).fill(searchResult);
      searchResults.push(district);

      return createController().getSetupPromiseForTesting({ scrollLoaderStub }).then(() => {
        const lhs = contactsLiveList.getList();
        assert.equal(lhs.length, 50);
        scrollLoaderCallback();
        assert.equal(searchService.args[1][2].skip, 50);
        assert.equal(searchService.args[1][2].limit, 50);
      });
    });

    it('when paginating, does not modify the skip when it finds homeplace on subsequent pages #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 51);
          searchResults = Array(49).fill(searchResult);
          searchResults.push(district);
          searchService.returns(Promise.resolve(searchResults));
          scrollLoaderCallback();
          assert.equal(searchService.args[1][2].skip, 50);
          assert.equal(searchService.args[1][2].limit, 50);
          return Promise.resolve();
        })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 100);
          searchResults = Array(50).fill(searchResult);
          searchService.returns(Promise.resolve(searchResults));
          scrollLoaderCallback();
          assert.equal(searchService.args[2][2].skip, 100);
          assert.equal(searchService.args[2][2].limit, 50);
          return Promise.resolve();
        })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 150);
        });
    });
  });
});
