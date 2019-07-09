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
    changesFilter,
    contactSearchLiveList,
    deadListFind,
    settings,
    auth,
    deadListContains,
    deadList,
    contactSummary,
    isDbAdmin,
    liveListInit,
    liveListReset,
    contactsActions,
    getSelected,
    tasksForContact;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, ContactsActions, Selectors) => {
    deadListFind = sinon.stub();
    deadListContains = sinon.stub();
    deadList = () => {
      let elements = [];

      return {
        getList: () => elements,
        initialised: sinon.stub(),
        setSelected: sinon.stub(),
        clearSelected: sinon.stub(),
        refresh: sinon.stub(),
        count: () => elements.length,
        insert: e => elements.push(e),
        invalidateCache: () => {},
        set: es => (elements = es),
        update: e => {
          if (e !== district || elements[0] !== district) {
            elements.push(e);
          }
        },
        remove: () => {
          if (deadListFind()) {
            return elements.pop();
          }
          return false;
        },
        contains: deadListContains,
        setScope: sinon.stub()
      };
    };

    district = { _id: 'abcde', name: 'My District', type: 'district_hospital' };
    person = { _id: 'lkasdfh', name: 'Alon', type: 'person' };
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    buttonLabel = 'ClICK ME!!';
    typeLabel = 'District';
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setTitle = sinon.stub();
    scope.clearSelection = sinon.stub();
    scope.setRightActionBar = sinon.stub();
    scope.setLeftActionBar = sinon.stub();
    contactSchema = {
      get: sinon.stub(),
      getChildPlaceType: sinon.stub(),
      getPlaceTypes: sinon.stub(),
      getTypes: sinon.stub(),
    };
    contactSchema.get.returns({
      icon: icon,
      addButtonLabel: buttonLabel,
      label: typeLabel,
    });
    contactSchema.getChildPlaceType.returns(childType);
    contactSchema.getPlaceTypes.returns(['district_hospital']);
    contactSchema.getTypes.returns([
      'person',
      'district_hospital',
      'clinic',
      'health_center',
    ]);
    xmlForms = sinon.stub();
    forms = [{ internalId: 'a-form', icon: 'an-icon', title: 'A Form' }];
    xmlForms.callsArgWith(2, null, forms); // call the callback
    userSettings = KarmaUtils.promiseService(null, {
      facility_id: district._id,
    });
    contactsLiveList = deadList();
    contactSearchLiveList = deadList();
    getDataRecords = KarmaUtils.promiseService(null, district);
    searchResults = [];
    var $translate = key => Promise.resolve(key + 'translated');
    $translate.instant = key => key + 'translated';
    scrollLoaderStub = {
      init: callback => {
        scrollLoaderCallback = callback;
      },
    };

    changes = options => {
      changesFilter = options.filter;
      changesCallback = options.callback;
      return { unsubscribe: () => {} };
    };

    contactSummary = sinon.stub();
    contactSummary.returns(Promise.resolve({ context: {} }));

    settings = sinon.stub().resolves({});
    auth = sinon.stub().rejects();
    isDbAdmin = sinon.stub();
    liveListInit = sinon.stub();
    liveListReset = sinon.stub();

    contactsActions = ContactsActions($ngRedux.dispatch);
    const stubbedContactsActions = {
      loadSelectedContactChildren: sinon.stub().returns(Promise.resolve()),
      loadSelectedContactReports: sinon.stub().returns(Promise.resolve())
    };
    getSelected = () => Selectors.getSelectedContact($ngRedux.getState());

    tasksForContact = sinon.stub();

    createController = () => {
      searchService = sinon.stub();
      searchService.returns(Promise.resolve(searchResults));

      return $controller('ContactsCtrl', {
        $element: sinon.stub(),
        $log: { error: sinon.stub(), debug: sinon.stub() },
        $q: Q,
        $scope: scope,
        $state: { includes: sinon.stub(), go: sinon.stub() },
        $timeout: work => work(),
        $translate: $translate,
        ContactsActions: () => Object.assign({}, contactsActions, stubbedContactsActions),
        Auth: auth,
        Changes: changes,
        ContactSchema: contactSchema,
        ContactSummary: contactSummary,
        Export: () => {},
        GetDataRecords: getDataRecords,
        LiveList: {
          contacts: contactsLiveList,
          'contact-search': contactSearchLiveList,
          $init: liveListInit,
          $reset: liveListReset
        },
        Search: searchService,
        SearchFilters: { freetext: sinon.stub(), reset: sinon.stub() },
        Session: {
          isAdmin: () => {
            return isAdmin;
          },
          isDbAdmin: isDbAdmin
        },
        Settings: settings,
        Simprints: { enabled: () => false },
        TasksForContact: tasksForContact,
        Tour: () => {},
        TranslateFrom: key => `TranslateFrom:${key}`,
        UserSettings: userSettings,
        XmlForms: xmlForms,
      });
    };
  }));

  it('sets title', () => {
    return createController()
      .getSetupPromiseForTesting()
      .then(() => {
        return scope.setSelected({ doc: district });
      })
      .then(() => {
        assert(scope.setTitle.called, 'title should be set');
        assert.equal(
          scope.setTitle.getCall(0).args[0],
          typeLabel + 'translated'
        );
        assert(liveListInit.called);
        assert.deepEqual(liveListInit.args[0], [scope, 'contacts', 'contact-search']);
      });
  });

  describe('selecting contacts', () => {
    const testContactSelection = selected => {
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          return scope.setSelected(selected);
        });
    };

    it('set selected contact', () => {
      return testContactSelection({ doc: district }).then(() => {
        assert.checkDeepProperties(getSelected().doc, district);
        assert(scope.setRightActionBar.called);
        assert(scope.setRightActionBar.args[0][0].selected);
      });
    });

    it('throws an error, sets a scope variable and resets the action bar when contact cannot be selected', () => {
      contactSummary.returns(Promise.reject());
      return testContactSelection({ doc: district })
        .then(() => {
          throw new Error('Expected error to be thrown');
        })
        .catch(() => {
          assert.checkDeepProperties(getSelected(), { doc: district, error: true });
          assert.equal(scope.setRightActionBar.callCount, 2);
          assert.deepEqual(scope.setRightActionBar.args[1], []);
        });
    });

    it('should not get tasks when not allowed', () => {
      auth.withArgs('can_view_tasks').rejects();
      return testContactSelection({ doc: district }).then(() => {
        assert.checkDeepProperties(getSelected().doc, district);
        assert(scope.setRightActionBar.called);
        assert(scope.setRightActionBar.args[0][0].selected);
        assert(auth.withArgs('can_view_tasks').called);
        assert(!tasksForContact.called);
      });
    });

    it('should get tasks when allowed', () => {
      auth.withArgs('can_view_tasks').resolves();
      return testContactSelection({ doc: district }).then(() => {
        assert.checkDeepProperties(getSelected().doc, district);
        assert(scope.setRightActionBar.called);
        assert(scope.setRightActionBar.args[0][0].selected);
        assert(auth.withArgs('can_view_tasks').called);
        assert.equal(tasksForContact.callCount, 1);
        assert.deepEqual(tasksForContact.args[0][0].doc, getSelected().doc);
        assert.equal(tasksForContact.args[0][1], 'ContactsCtrl');
      });
    });

    it('should store tasks in redux store and count tasks by contact', () => {
      auth.withArgs('can_view_tasks').resolves();
      let receiveTasksCallback;
      tasksForContact.callsFake((selected, listenerName, callback) => {
        receiveTasksCallback = callback;
      });
      const tasks = [
        { doc: { contact: { _id: 'contact1' } } },
        { other: 4  },
        { doc: { other: 3 } },
        { doc: { contact: { _id: 'contact1' } } },
        { doc: { contact: { _id: 'contact2' } } },
        { doc: { contact: { _id: 'contact1' } } },
      ];

      return testContactSelection({ doc: district }).then(() => {
        assert(auth.withArgs('can_view_tasks').called);
        assert.equal(tasksForContact.callCount, 1);
        receiveTasksCallback(tasks);
        assert.deepEqual(getSelected().tasks, tasks);
        assert.deepEqual(getSelected().tasksByContact, { 'contact1': 3, 'contact2': 1 });
      });
    });
  });

  describe('sets right actionBar', () => {
    const testRightActionBar = (selected, assertions) => {
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          return scope.setSelected(selected);
        })
        .then(() => {
          assert(
            scope.setRightActionBar.called,
            'right actionBar should be set'
          );
          const actionBarArgs = scope.setRightActionBar.getCall(1).args[0];
          assertions(actionBarArgs);
        });
    };

    it('with the selected doc', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.checkDeepProperties(actionBarArgs.selected[0], district);
      });
    });

    it('for the New Place button', () => {
      return testRightActionBar({ doc: district }, actionBarArgs => {
        assert.equal(actionBarArgs.selected[0].child.type, childType);
        assert.equal(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(
          actionBarArgs.selected[0].child.addPlaceLabel,
          buttonLabel
        );
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
        assert.checkDeepProperties(actionBarArgs.sendTo, person);
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

    it(`sets the actionbar partially if it couldn't get forms`, () => {
      xmlForms.callsArgWith(2, { error: 'no forms brew' }); // call the callback
      return testRightActionBar({ doc: person }, actionBarArgs => {
        assert.equal(actionBarArgs.relevantForms, undefined);
        assert.checkDeepProperties(actionBarArgs.sendTo, person);
        assert.equal(actionBarArgs.selected[0]._id, person._id);
        assert.equal(actionBarArgs.selected[0].child.type, childType);
        assert.equal(actionBarArgs.selected[0].child.icon, icon);
        assert.equal(
          actionBarArgs.selected[0].child.addPlaceLabel,
          buttonLabel
        );
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
      return testRightActionBar(
        { doc: district, children: { places: [district] } },
        actionBarArgs => {
          assert.equal(actionBarArgs.canDelete, false);
        }
      );
    });

    it('disables deleting for places with child people', () => {
      return testRightActionBar(
        { doc: district, children: { persons: [person] } },
        actionBarArgs => {
          assert.equal(actionBarArgs.canDelete, false);
        }
      );
    });

    it('enables deleting for leaf nodes', () => {
      return testRightActionBar(
        { doc: district, children: { persons: [], places: [] } },
        actionBarArgs => {
          assert.equal(actionBarArgs.canDelete, true);
        }
      );
    });

    describe('translates form titles', () => {
      const testTranslation = (form, expectedTitle) => {
        xmlForms.callsArgWith(2, null, [form]);
        return createController()
          .getSetupPromiseForTesting()
          .then(() => {
            return scope.setSelected({ doc: district, reportLoader: Promise.resolve() });
          })
          .then(() => {
            assert(
              scope.setRightActionBar.called,
              'right actionBar should be set'
            );
            const actionBarArgs = scope.setRightActionBar.getCall(1).args[0];
            assert.deepEqual(actionBarArgs.relevantForms.length, 1);
            assert.equal(actionBarArgs.relevantForms[0].title, expectedTitle);
          });
      };

      it('uses the translation_key', () => {
        const form = {
          internalId: 'a',
          icon: 'a-icon',
          translation_key: 'a.form.key',
        };
        return testTranslation(form, 'a.form.keytranslated');
      });

      it('uses the title', () => {
        const form = { internalId: 'a', icon: 'a-icon', title: 'My Form' };
        return testTranslation(form, 'TranslateFrom:My Form');
      });

      it('uses the translation_key in preference to the title', () => {
        const form = {
          internalId: 'a',
          icon: 'a-icon',
          translation_key: 'a.form.key',
          title: 'My Form',
        };
        return testTranslation(form, 'a.form.keytranslated');
      });
    });

    describe('muted contacts modal', () => {
      it('should set all forms to not display muted modal when contact is not muted', () => {
        const forms = [
          { internalId: 'unmute', icon: 'icon', translation_key: 'form.unmute', title: 'unmute'},
          { internalId: 'mute', icon: 'icon', translation_key: 'form.mute', title: 'mute'},
          { internalId: 'visit', icon: 'icon', translation_key: 'form.visit', title: 'visit'}
        ];
        xmlForms.callsArgWith(2, null, forms);
        settings.resolves({
          muting: {
            unmute_forms: ['unmute']
          }
        });

        return createController()
          .getSetupPromiseForTesting()
          .then(() => {
            return scope.setSelected({ doc: { _id: 'my-contact', muted: false }, reportLoader: Promise.resolve() });
          })
          .then(() => {
            assert(
              scope.setRightActionBar.called,
              'right actionBar should be set'
            );
            assert.deepEqual(scope.setRightActionBar.args[1][0].relevantForms, [
              { code: 'unmute', icon: 'icon', title: 'form.unmutetranslated', showUnmuteModal: false},
              { code: 'mute', icon: 'icon', title: 'form.mutetranslated', showUnmuteModal: false},
              { code: 'visit', icon: 'icon', title: 'form.visittranslated', showUnmuteModal: false}
            ]);
          });
      });

      it('should set non-unmute forms ti display modal when contact is muted', () => {
        const forms = [
          { internalId: 'unmute', icon: 'icon', translation_key: 'form.unmute', title: 'unmute'},
          { internalId: 'mute', icon: 'icon', translation_key: 'form.mute', title: 'mute'},
          { internalId: 'visit', icon: 'icon', translation_key: 'form.visit', title: 'visit'}
        ];
        xmlForms.callsArgWith(2, null, forms);
        settings.resolves({
          muting: {
            unmute_forms: ['unmute']
          }
        });

        return createController()
          .getSetupPromiseForTesting()
          .then(() => {
            return scope.setSelected({ doc: { _id: 'my-contact', muted: true }, reportLoader: Promise.resolve() });
          })
          .then(() => {
            assert(
              scope.setRightActionBar.called,
              'right actionBar should be set'
            );
            assert.deepEqual(scope.setRightActionBar.args[1][0].relevantForms, [
              { code: 'unmute', icon: 'icon', title: 'form.unmutetranslated', showUnmuteModal: false},
              { code: 'mute', icon: 'icon', title: 'form.mutetranslated', showUnmuteModal: true},
              { code: 'visit', icon: 'icon', title: 'form.visittranslated', showUnmuteModal: true}
            ]);
          });
      });
    });
  });

  describe('sets left actionBar', () => {
    it('when user has facility_id', () => {
      createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert(scope.setLeftActionBar.called, 'left actionBar should be set');
          const actionBarArgs = scope.setLeftActionBar.getCall(0).args[0];
          assert.deepEqual(actionBarArgs.userChildPlace, {
            type: childType,
            icon: icon,
          });
          assert.equal(actionBarArgs.userFacilityId, district._id);
          assert.equal(actionBarArgs.addPlaceLabel, buttonLabel);
        });
    });

    it(`when user doesn't have facility_id`, () => {
      userSettings = KarmaUtils.promiseService(null, {});
      getDataRecords = KarmaUtils.promiseService();
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert(scope.setLeftActionBar.called);
        });
    });
  });

  describe('Search', () => {
    it('Puts the home place at the top of the list', () => {
      searchResults = [
        {
          _id: 'search-result',
        },
      ];

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(
            lhs.length,
            2,
            'both home place and search results are shown'
          );
          assert.equal(lhs[0]._id, district._id, 'first item is home place');
          assert.equal(
            lhs[1]._id,
            'search-result',
            'second item is search result'
          );
        });
    });

    it('Only displays the home place once', () => {
      searchResults = [
        {
          _id: 'search-result',
        },
        {
          _id: district._id,
        },
      ];

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(
            lhs.length,
            2,
            'both home place and search results are shown'
          );
          assert.equal(lhs[0]._id, district._id, 'first item is home place');
          assert.equal(
            lhs[1]._id,
            'search-result',
            'second item is search result'
          );
        });
    });

    it('Only searches for top-level places as an admin', () => {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, {
        facility_id: undefined,
      });
      searchResults = [
        {
          _id: 'search-result',
        },
      ];

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.deepEqual(searchService.args[0][1], {
            types: { selected: ['district_hospital'] },
          });
          const lhs = contactsLiveList.getList();
          assert.equal(
            lhs.length,
            1,
            'both home place and search results are shown'
          );
        });
    });

    it('when paginating, does not skip the extra place for admins #4085', () => {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, {
        facility_id: undefined,
      });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 50);
          scrollLoaderCallback();
          assert.deepEqual(searchService.args[1][2], {
            reuseExistingDom: true,
            paginating: true,
            limit: 50,
            skip: 50,
          });
        });
    });

    it('when paginating, does modify skip for non-admins #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 51);
          scrollLoaderCallback();
          assert.deepEqual(searchService.args[1][2], {
            reuseExistingDom: true,
            paginating: true,
            limit: 50,
            skip: 50,
          });
        });
    });

    it('when refreshing list as admin, does not modify limit #4085', () => {
      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, {
        facility_id: undefined,
      });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(60).fill(searchResult);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          changesCallback({});
          assert.equal(lhs.length, 60);
          assert.deepInclude(searchService.args[1][2], {
            limit: 60,
            silent: true,
            withIds: false,
          });
        });
    });

    it('when refreshing list as non-admin, does modify limit #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(60).fill(searchResult);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 61);
          changesCallback({});
          assert.equal(searchService.args[1][2].limit, 60);
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
          scope.filters = { search: true };
          searchResults = Array(50).fill(searchResult);
          searchService.returns(Promise.resolve(searchResults));
          scope.search();
          assert.deepEqual(searchService.args[1][2], { limit: 50 });
          return Promise.resolve();
        })
        .then(() => {
          lhs = contactSearchLiveList.getList();
          assert.equal(lhs.length, 50);
          //aand paginate the search results, also not skipping the extra place
          scrollLoaderCallback();
          assert.deepEqual(searchService.args[2][2], {
            limit: 50,
            paginating: true,
            reuseExistingDom: true,
            skip: 50,
          });
        });
    });

    it('when paginating, does not modify the skip when it finds homeplace #4085', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(49).fill(searchResult);
      searchResults.push(district);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 50);
          scrollLoaderCallback();
          assert.deepEqual(searchService.args[1][2], {
            limit: 50,
            paginating: true,
            reuseExistingDom: true,
            skip: 50,
          });
        });
    });

    it('when paginating, does not modify the skip when it finds homeplace on subsequent pages #4085', () => {
      const mockResults = (count, startAt = 0) => {
        const result = [];
        for (let i = startAt; i < startAt + count; i++) {
          result.push({ _id: `search-result${i}` });
        }
        return result;
      };
      searchResults = mockResults(50);

      return createController()
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 51);
          searchResults = mockResults(49, 50);
          searchResults.push(district);
          searchService.returns(Promise.resolve(searchResults));
          scrollLoaderCallback();
          assert.deepEqual(searchService.args[1][2], {
            limit: 50,
            paginating: true,
            reuseExistingDom: true,
            skip: 50,
          });
          return Promise.resolve();
        })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 100);
          searchResults = mockResults(50, 100);
          searchService.returns(Promise.resolve(searchResults));
          scrollLoaderCallback();
          assert.deepEqual(searchService.args[2][2], {
            limit: 50,
            paginating: true,
            reuseExistingDom: true,
            skip: 100,
          });
          return Promise.resolve();
        })
        .then(() => {
          const lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 150);
        });
    });
  });

  describe('Changes feed filtering', () => {
    it('filtering returns true for `contact` type documents #4080', () => {
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(changesFilter({ doc: { type: 'person' } }), true);
          assert.equal(changesFilter({ doc: { type: 'clinic' } }), true);
          assert.equal(changesFilter({ doc: { type: 'health_center' } }), true);
          assert.equal(
            changesFilter({ doc: { type: 'district_hospital' } }),
            true
          );
        });
    });

    it('filtering returns false for non-`contact` type documents #4080', () => {
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.isNotOk(changesFilter({ doc: {} }));
          assert.isNotOk(changesFilter({ doc: { type: 'data_record' } }));
          assert.isNotOk(changesFilter({ doc: { type: '' } }));
        });
    });

    it('refreshes contacts list when receiving a contact change #4080', () => {
      searchResults = [
        {
          _id: 'search-result',
        },
        {
          _id: district._id,
        },
      ];

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          changesCallback({ doc: { _id: '123' } });
          assert.equal(searchService.callCount, 2);
          assert.equal(searchService.args[1][2].limit, 50); // 50 is the minimum size just in case it's a new contact at the end of the list
        });
    });

    it('when handling deletes, does not shorten the LiveList #4080', () => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(60).fill(searchResult);

      isAdmin = true;
      userSettings = KarmaUtils.promiseService(null, {
        facility_id: undefined,
      });

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          deadListFind.returns(true);
          changesCallback({ deleted: true, doc: {} });
          assert.equal(searchService.args[1][2].limit, 60);
        });
    });

    it('filtering returns true for contained deletions', () => {
      isAdmin = false;
      deadListContains.returns(true);
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(changesFilter({ deleted: true, id: 'some_id' }), true);
          assert.equal(deadListContains.callCount, 1);
          assert.deepEqual(deadListContains.args[0], ['some_id']);
        });
    });

    // test for empty doc!
  });

  describe('last visited date', function() {
    it('does not enable LastVisitedDate features not allowed', function() {
      auth.rejects();

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(auth.callCount, 1);
          assert.deepEqual(auth.args[0], ['can_view_last_visited_date']);
          assert.equal(scope.lastVisitedDateExtras, false);
          assert.deepEqual(scope.visitCountSettings, {});
          assert.equal(scope.sortDirection, 'alpha');
          assert.equal(scope.defaultSortDirection, 'alpha');
          assert.equal(settings.callCount, 1);

          assert.equal(searchService.callCount, 1);
          assert.deepEqual(searchService.args[0], [
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {},
            undefined,
          ]);

          scope.sortDirection = 'something';
          scope.resetFilterModel();
          assert.equal(scope.sortDirection, 'alpha');
        });
    });

    it('enables LastVisitedDate features when allowed', function() {
      auth.resolves();

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(auth.callCount, 1);
          assert.deepEqual(auth.args[0], ['can_view_last_visited_date']);
          assert.equal(scope.lastVisitedDateExtras, true);
          assert.deepEqual(scope.visitCountSettings, {});
          assert.equal(scope.sortDirection, 'alpha');
          assert.equal(scope.defaultSortDirection, 'alpha');
          assert.equal(settings.callCount, 1);

          assert.equal(searchService.callCount, 1);
          assert.deepEqual(searchService.args[0], [
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {
              displayLastVisitedDate: true,
              visitCountSettings: {},
            },
            undefined,
          ]);
        });
    });

    it('saves uhc home_visits settings and default sort when correct', function() {
      auth.resolves();
      settings.resolves({
        uhc: {
          contacts_default_sort: false,
          visit_count: {
            month_start_date: false,
            visit_count_goal: 1,
          },
        },
      });

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(auth.callCount, 1);
          assert.deepEqual(auth.args[0], ['can_view_last_visited_date']);

          assert.equal(scope.lastVisitedDateExtras, true);
          assert.deepEqual(scope.visitCountSettings, {
            monthStartDate: false,
            visitCountGoal: 1,
          });
          assert.equal(scope.sortDirection, 'alpha');
          assert.equal(settings.callCount, 1);

          assert.equal(searchService.callCount, 1);
          assert.deepEqual(searchService.args[0], [
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {
              displayLastVisitedDate: true,
              visitCountSettings: { monthStartDate: false, visitCountGoal: 1 },
            },
            undefined,
          ]);
        });
    });

    it('always saves default sort', function() {
      auth.resolves();
      settings.resolves({
        uhc: {
          contacts_default_sort: 'something',
          visit_count: {
            month_start_date: false,
            visit_count_goal: 1,
          },
        },
      });

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(auth.callCount, 1);
          assert.deepEqual(auth.args[0], ['can_view_last_visited_date']);

          assert.equal(scope.lastVisitedDateExtras, true);
          assert.deepEqual(scope.visitCountSettings, {
            monthStartDate: false,
            visitCountGoal: 1,
          });
          assert.equal(scope.sortDirection, 'something');
          assert.equal(settings.callCount, 1);

          assert.equal(searchService.callCount, 1);
          assert.deepEqual(searchService.args[0], [
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {
              displayLastVisitedDate: true,
              visitCountSettings: { monthStartDate: false, visitCountGoal: 1 },
            },
            undefined,
          ]);

          scope.sortDirection = 'somethingElse';
          scope.resetFilterModel();
          assert.equal(scope.sortDirection, 'something');
        });
    });

    it('saves uhc default sorting', function() {
      auth.resolves();
      settings.resolves({
        uhc: {
          contacts_default_sort: 'last_visited_date',
          visit_count: {
            month_start_date: 25,
            visit_count_goal: 125,
          },
        },
      });

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(auth.callCount, 1);
          assert.deepEqual(auth.args[0], ['can_view_last_visited_date']);

          assert.equal(scope.lastVisitedDateExtras, true);
          assert.deepEqual(scope.visitCountSettings, {
            monthStartDate: 25,
            visitCountGoal: 125,
          });
          assert.equal(scope.sortDirection, 'last_visited_date');
          assert.equal(scope.defaultSortDirection, 'last_visited_date');
          assert.equal(settings.callCount, 1);

          assert.equal(searchService.callCount, 1);
          assert.deepEqual(searchService.args[0], [
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {
              displayLastVisitedDate: true,
              visitCountSettings: { monthStartDate: 25, visitCountGoal: 125 },
              sortByLastVisitedDate: true,
            },
            undefined,
          ]);

          scope.sortDirection = 'something';
          scope.resetFilterModel();
          assert.equal(scope.sortDirection, 'last_visited_date');
        });
    });

    it('changes listener filters relevant last visited reports when feature is enabled', () => {
      auth.resolves();
      const relevantReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 'something' },
      };
      const deletedReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 'something' },
        _deleted: true,
      };
      const irrelevantReports = [
        {
          type: 'data_record',
          form: 'home_visit',
          fields: { visited_contact_uuid: 'else' },
        },
        { type: 'data_record', form: 'home_visit', fields: { uuid: 'bla' } },
        { type: 'data_record', form: 'home_visit' },
        {
          type: 'something',
          form: 'home_visit',
          fields: { visited_contact_uuid: 'something' },
        },
        {
          type: 'data_record',
          form: 'home_visit',
          fields: { visited_contact_uuid: 'irrelevant' },
          _deleted: true
        }
      ];

      deadListContains.returns(false);
      deadListContains.withArgs('something').returns(true);

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(!!changesFilter({ doc: relevantReport, id: 'relevantReport' }), true);
          assert.equal(!!changesFilter({ doc: irrelevantReports[0], id: 'irrelevant1' }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[1], id: 'irrelevant2' }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[2], id: 'irrelevant3' }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[3], id: 'irrelevant4' }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[4], id: 'irrelevant5' }), false);
          assert.equal(!!changesFilter({ doc: deletedReport, deleted: true }), true);
        });
    });

    it('changes listener filters deleted visit reports when sorting by last visited date', () => {
      auth.resolves();
      const deletedReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 'deleted' },
        _deleted: true,
      };
      deadListContains.returns(false);
      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          scope.sortDirection = 'last_visited_date';
          assert.equal(
            !!changesFilter({ doc: deletedReport, deleted: true }),
            true
          );
        });
    });

    it('changes listener does not filter last visited reports when feature is disabled', () => {
      auth.rejects();
      const relevantReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 'something' },
      };
      const irrelevantReports = [
        {
          type: 'data_record',
          form: 'home_visit',
          fields: { visited_contact_uuid: 'else' },
        },
        { type: 'data_record', form: 'home_visit', fields: { uuid: 'bla' } },
        { type: 'data_record', form: 'home_visit' },
        {
          type: 'something',
          form: 'home_visit',
          fields: { visited_contact_uuid: 'something' },
        },
      ];

      deadListContains.returns(false);
      deadListContains.withArgs('something').returns(true);

      return createController()
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(!!changesFilter({ doc: relevantReport }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[0] }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[1] }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[2] }), false);
          assert.equal(!!changesFilter({ doc: irrelevantReports[3] }), false);

          assert.equal(deadListContains.callCount, 0);
        });
    });

    describe('fully refreshing LHS list', () => {
      const relevantVisitReport = {
          type: 'data_record',
          form: 'home_visit',
          fields: { visited_contact_uuid: 4 },
        },
        irrelevantReport = {
          type: 'data_record',
          form: 'somethibg',
          fields: {},
        },
        irrelevantVisitReport = {
          type: 'data_record',
          form: 'home_visit',
          fields: { visited_contact_uuid: 122 },
        },
        deletedVisitReport = {
          type: 'data_record',
          form: 'home_visit',
          fields: { visited_contact_uuid: 122 },
          _deleted: true,
        },
        someContact = { type: 'person', _id: 1 };

      describe('uhc visits enabled', () => {
        beforeEach(() => {
          auth.resolves();
          deadListContains.withArgs(4).returns(true);
        });
        describe('alpha default sorting', () => {
          it('does not require refreshing when sorting is `alpha` and visit report is received', () => {
            return createController()
              .getSetupPromiseForTesting()
              .then(() => {
                Array.apply(null, Array(60)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);
                return Promise.all([
                  changesCallback({ doc: relevantVisitReport }),
                  changesCallback({ doc: irrelevantReport }),
                  changesCallback({ doc: irrelevantVisitReport }),
                  changesCallback({ doc: deletedVisitReport, deleted: true }),
                  changesCallback({ doc: someContact }),
                ]).then(() => {
                  assert.equal(searchService.callCount, 6);

                  for (let i = 1; i < 6; i++) {
                    assert.deepEqual(searchService.args[i], [
                      'contacts',
                      { types: { selected: ['childType'] } },
                      { limit: 60, withIds: false, silent: true, reuseExistingDom: true },
                      { displayLastVisitedDate: true, visitCountSettings: {} },
                      undefined,
                    ]);
                  }
                });
              });
          });

          it('does require refreshing when sorting is `last_visited_date` and visit report is received', () => {
            return createController()
              .getSetupPromiseForTesting()
              .then(() => {
                Array.apply(null, Array(5)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);
                scope.sortDirection = 'last_visited_date';

                return Promise.all([
                  changesCallback({ doc: relevantVisitReport }),
                  changesCallback({ doc: irrelevantReport }),
                  changesCallback({ doc: irrelevantVisitReport }),
                  changesCallback({ doc: deletedVisitReport, deleted: true }),
                  changesCallback({ doc: someContact }),
                ]).then(() => {
                  assert.equal(searchService.callCount, 6);
                  assert.deepEqual(searchService.args[1], [
                    'contacts',
                    { types: { selected: ['childType'] } },
                    { limit: 49, withIds: true, silent: true, reuseExistingDom: true },
                    {
                      displayLastVisitedDate: true,
                      visitCountSettings: {},
                      sortByLastVisitedDate: true,
                    },
                    ['abcde', 0, 1, 2, 3, 4],
                  ]);

                  for (let i = 2; i < 6; i++) {
                    assert.deepEqual(searchService.args[i], [
                      'contacts',
                      { types: { selected: ['childType'] } },
                      { limit: 49, withIds: false, silent: true, reuseExistingDom: true },
                      {
                        displayLastVisitedDate: true,
                        visitCountSettings: {},
                        sortByLastVisitedDate: true,
                      },
                      undefined,
                    ]);
                  }
                });
              });
          });
        });

        describe('last_visited_date default sorting', () => {
          beforeEach(() => {
            settings.resolves({
              uhc: { contacts_default_sort: 'last_visited_date' },
            });
          });

          it('does not require refreshing when sorting is `alpha` and visit report is received', () => {
            return createController()
              .getSetupPromiseForTesting()
              .then(() => {
                scope.sortDirection = 'alpha';
                Array.apply(null, Array(5)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);
                return Promise.all([
                  changesCallback({ doc: relevantVisitReport }),
                  changesCallback({ doc: irrelevantReport }),
                  changesCallback({ doc: irrelevantVisitReport }),
                  changesCallback({ doc: deletedVisitReport, deleted: true }),
                  changesCallback({ doc: someContact }),
                ]).then(() => {
                  assert.equal(searchService.callCount, 6);

                  for (let i = 1; i < 6; i++) {
                    assert.deepEqual(searchService.args[i], [
                      'contacts',
                      { types: { selected: ['childType'] } },
                      { limit: 49, withIds: false, silent: true, reuseExistingDom: true },
                      { displayLastVisitedDate: true, visitCountSettings: {} },
                      undefined,
                    ]);
                  }
                });
              });
          });

          it('does require refreshing when sorting is `last_visited_date` and visit report is received', () => {
            return createController()
              .getSetupPromiseForTesting()
              .then(() => {
                Array.apply(null, Array(5)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);

                return Promise.all([
                  changesCallback({ doc: relevantVisitReport }),
                  changesCallback({ doc: irrelevantReport }),
                  changesCallback({ doc: irrelevantVisitReport }),
                  changesCallback({ doc: deletedVisitReport, deleted: true }),
                  changesCallback({ doc: someContact }),
                ]).then(() => {
                  assert.equal(searchService.callCount, 6);
                  assert.deepEqual(searchService.args[1], [
                    'contacts',
                    { types: { selected: ['childType'] } },
                    { limit: 49, withIds: true, silent: true, reuseExistingDom: true },
                    {
                      displayLastVisitedDate: true,
                      visitCountSettings: {},
                      sortByLastVisitedDate: true,
                    },
                    ['abcde', 0, 1, 2, 3, 4],
                  ]);

                  for (let i = 2; i < 6; i++) {
                    assert.deepEqual(searchService.args[i], [
                      'contacts',
                      { types: { selected: ['childType'] } },
                      { limit: 49, withIds: false, silent: true, reuseExistingDom: true },
                      {
                        displayLastVisitedDate: true,
                        visitCountSettings: {},
                        sortByLastVisitedDate: true,
                      },
                      undefined,
                    ]);
                  }
                });
              });
          });
        });
      });

      describe('uhc visits disabled', () => {
        beforeEach(() => {
          auth.rejects();
          deadListContains.withArgs(4).returns(true);
        });

        describe('alpha default sorting', () => {
          it('does not require refreshing when sorting is `alpha` and visit report is received', () => {
            return createController()
              .getSetupPromiseForTesting()
              .then(() => {
                Array.apply(null, Array(5)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);
                return Promise.all([
                  changesCallback({ doc: relevantVisitReport }),
                  changesCallback({ doc: irrelevantReport }),
                  changesCallback({ doc: irrelevantVisitReport }),
                  changesCallback({ doc: deletedVisitReport, deleted: true }),
                  changesCallback({ doc: someContact }),
                ]).then(() => {
                  assert.equal(searchService.callCount, 6);

                  for (let i = 1; i < 6; i++) {
                    assert.deepEqual(searchService.args[i], [
                      'contacts',
                      { types: { selected: ['childType'] } },
                      { limit: 49, withIds: false, silent: true, reuseExistingDom: true },
                      {},
                      undefined,
                    ]);
                  }
                });
              });
          });
        });

        describe('last_visited_date default sorting', () => {
          beforeEach(() => {
            settings.resolves({
              uhc: { contacts_default_sort: 'last_visited_date' },
            });
          });

          it('does require refreshing when sorting is `last_visited_date` and visit report is received', () => {
            return createController()
              .getSetupPromiseForTesting()
              .then(() => {
                Array.apply(null, Array(5)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);

                return Promise.all([
                  changesCallback({ doc: relevantVisitReport }),
                  changesCallback({ doc: irrelevantReport }),
                  changesCallback({ doc: irrelevantVisitReport }),
                  changesCallback({ doc: deletedVisitReport, deleted: true }),
                  changesCallback({ doc: someContact }),
                ]).then(() => {
                  assert.equal(searchService.callCount, 6);

                  for (let i = 1; i < 6; i++) {
                    assert.deepEqual(searchService.args[2], [
                      'contacts',
                      { types: { selected: ['childType'] } },
                      { limit: 49, withIds: false, silent: true, reuseExistingDom: true },
                      {},
                      undefined,
                    ]);
                  }
                });
              });
          });
        });
      });

      describe('uhc disabled for DB admins', () => {
        it('should disable UHC for DB admins', () => {
          settings.resolves({ uhc: { contacts_default_sort: 'last_visited_date' }});
          isDbAdmin.returns(true);

          return createController()
            .getSetupPromiseForTesting()
            .then(() => {
              assert.equal(auth.callCount, 0);
              assert.equal(searchService.callCount, 1);
              assert.deepEqual(searchService.args[0], [
                'contacts',
                { types: { selected: ['childType'] } },
                { limit: 50 },
                {},
                undefined,
              ]);
            });
        });
      });
    });
  });

  describe('destroy', () => {
    it('should reset liveList when destroyed', () => {
      createController();
      scope.$destroy();
      assert.equal(liveListReset.callCount, 1);
      assert.deepEqual(liveListReset.args[0], ['contacts', 'contact-search']);
    });
  });
});
