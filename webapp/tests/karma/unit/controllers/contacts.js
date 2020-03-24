describe('Contacts controller', () => {
  'use strict';

  const assert = chai.assert;

  let contactsLiveList;
  let childType;
  let contactTypes;
  let createController;
  let district;
  let forms;
  let icon;
  let isAdmin = false;
  let scope;
  let userSettings;
  let searchResults;
  let searchService;
  let getDataRecords;
  let xmlForms;
  let $rootScope;
  let scrollLoaderStub;
  let scrollLoaderCallback;
  let changes;
  let changesCallback;
  let changesFilter;
  let contactSearchLiveList;
  let deadListFind;
  let settings;
  let hasAuth;
  let deadListContains;
  let deadList;
  let contactSummary;
  let isDbAdmin;
  let liveListInit;
  let liveListReset;
  let tasksForContact;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, GlobalActions) => {
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
    childType = 'childType';
    icon = 'fa-la-la-la-la';
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.clearSelection = sinon.stub();
    contactTypes = {
      getChildren: sinon.stub(),
      includes: sinon.stub()
    };
    contactTypes.getChildren.resolves([{
      id: childType,
      icon: icon
    }]);
    contactTypes.includes.returns(false);
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
    const $translate = key => Promise.resolve(key + 'translated');
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
    hasAuth = sinon.stub().resolves(false);
    isDbAdmin = sinon.stub();
    liveListInit = sinon.stub();
    liveListReset = sinon.stub();

    const globalActions = GlobalActions($ngRedux.dispatch);
    const stubbedGlobalActions = {
      clearRightActionBar: sinon.stub(),
      setLeftActionBar: sinon.stub(),
      setRightActionBar: sinon.stub(),
      setTitle: sinon.stub()
    };
    const stubbedContactsActions = {
      loadSelectedContactChildren: sinon.stub().returns(Promise.resolve()),
      loadSelectedContactReports: sinon.stub().returns(Promise.resolve()),
      setSelectedContact: sinon.stub().returns(Promise.resolve()),
      clearSelection: sinon.stub()
    };

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
        Auth: {
          has: hasAuth
        },
        Changes: changes,
        ContactTypes: contactTypes,
        ContactSummary: contactSummary,
        ContactsActions: () => stubbedContactsActions,
        Export: () => {},
        GetDataRecords: getDataRecords,
        GlobalActions: () => Object.assign({}, globalActions, stubbedGlobalActions),
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
        XmlForms: { listen: xmlForms },
      });
    };
  }));


  describe('sets left actionBar', () => {
    it('when user has facility_id', () => {
      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert(ctrl.setLeftActionBar.called, 'left actionBar should be set');
          const actionBarArgs = ctrl.setLeftActionBar.getCall(0).args[0];
          assert.equal(actionBarArgs.userFacilityId, district._id);
        });
    });

    it(`when user doesn't have facility_id`, () => {
      userSettings = KarmaUtils.promiseService(null, {});
      getDataRecords = KarmaUtils.promiseService();
      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert(ctrl.setLeftActionBar.called);
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
            types: { selected: ['childType'] },
          });
          assert.equal(contactTypes.getChildren.args[0].length, 0);
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

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting({ scrollLoaderStub })
        .then(() => {
          lhs = contactsLiveList.getList();
          assert.equal(lhs.length, 11);
          ctrl.filters = { search: true };
          searchResults = Array(50).fill(searchResult);
          searchService.returns(Promise.resolve(searchResults));
          ctrl.search();
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
          contactTypes.includes.returns(true);
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
          // 50 is the minimum size just in case it's a new contact at the end of the list
          assert.equal(searchService.args[1][2].limit, 50);
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
      hasAuth.resolves(false);

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(hasAuth.callCount, 1);
          assert.deepEqual(hasAuth.args[0], ['can_view_last_visited_date']);
          assert.equal(ctrl.lastVisitedDateExtras, false);
          assert.deepEqual(ctrl.visitCountSettings, {});
          assert.equal(ctrl.sortDirection, 'alpha');
          assert.equal(ctrl.defaultSortDirection, 'alpha');
          assert.equal(settings.callCount, 1);

          assert.equal(searchService.callCount, 1);
          assert.deepEqual(searchService.args[0], [
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {},
            undefined,
          ]);

          ctrl.sortDirection = 'something';
          ctrl.resetFilterModel();
          assert.equal(ctrl.sortDirection, 'alpha');
        });
    });

    it('enables LastVisitedDate features when allowed', function() {
      hasAuth.resolves(true);

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(hasAuth.callCount, 1);
          assert.deepEqual(hasAuth.args[0], ['can_view_last_visited_date']);
          assert.equal(ctrl.lastVisitedDateExtras, true);
          assert.deepEqual(ctrl.visitCountSettings, {});
          assert.equal(ctrl.sortDirection, 'alpha');
          assert.equal(ctrl.defaultSortDirection, 'alpha');
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
      hasAuth.resolves(true);
      settings.resolves({
        uhc: {
          contacts_default_sort: false,
          visit_count: {
            month_start_date: false,
            visit_count_goal: 1,
          },
        },
      });

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(hasAuth.callCount, 1);
          assert.deepEqual(hasAuth.args[0], ['can_view_last_visited_date']);

          assert.equal(ctrl.lastVisitedDateExtras, true);
          assert.deepEqual(ctrl.visitCountSettings, {
            monthStartDate: false,
            visitCountGoal: 1,
          });
          assert.equal(ctrl.sortDirection, 'alpha');
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
      hasAuth.resolves(true);
      settings.resolves({
        uhc: {
          contacts_default_sort: 'something',
          visit_count: {
            month_start_date: false,
            visit_count_goal: 1,
          },
        },
      });

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(hasAuth.callCount, 1);
          assert.deepEqual(hasAuth.args[0], ['can_view_last_visited_date']);

          assert.equal(ctrl.lastVisitedDateExtras, true);
          assert.deepEqual(ctrl.visitCountSettings, {
            monthStartDate: false,
            visitCountGoal: 1,
          });
          assert.equal(ctrl.sortDirection, 'something');
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

          ctrl.sortDirection = 'somethingElse';
          ctrl.resetFilterModel();
          assert.equal(ctrl.sortDirection, 'something');
        });
    });

    it('saves uhc default sorting', function() {
      hasAuth.resolves(true);
      settings.resolves({
        uhc: {
          contacts_default_sort: 'last_visited_date',
          visit_count: {
            month_start_date: 25,
            visit_count_goal: 125,
          },
        },
      });

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          assert.equal(hasAuth.callCount, 1);
          assert.deepEqual(hasAuth.args[0], ['can_view_last_visited_date']);

          assert.equal(ctrl.lastVisitedDateExtras, true);
          assert.deepEqual(ctrl.visitCountSettings, {
            monthStartDate: 25,
            visitCountGoal: 125,
          });
          assert.equal(ctrl.sortDirection, 'last_visited_date');
          assert.equal(ctrl.defaultSortDirection, 'last_visited_date');
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

          ctrl.sortDirection = 'something';
          ctrl.resetFilterModel();
          assert.equal(ctrl.sortDirection, 'last_visited_date');
        });
    });

    it('changes listener filters relevant last visited reports when feature is enabled', () => {
      hasAuth.resolves(true);
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
      hasAuth.resolves(true);
      const deletedReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 'deleted' },
        _deleted: true,
      };
      deadListContains.returns(false);

      const ctrl = createController();
      return ctrl
        .getSetupPromiseForTesting()
        .then(() => {
          ctrl.sortDirection = 'last_visited_date';
          assert.equal(
            !!changesFilter({ doc: deletedReport, deleted: true }),
            true
          );
        });
    });

    it('changes listener does not filter last visited reports when feature is disabled', () => {
      hasAuth.resolves(false);
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
      };
      const irrelevantReport = {
        type: 'data_record',
        form: 'somethibg',
        fields: {},
      };
      const irrelevantVisitReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 122 },
      };
      const deletedVisitReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 122 },
        _deleted: true,
      };
      const someContact = { type: 'person', _id: 1 };

      describe('uhc visits enabled', () => {
        beforeEach(() => {
          hasAuth.resolves(true);
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
            const ctrl = createController();
            return ctrl
              .getSetupPromiseForTesting()
              .then(() => {
                Array.apply(null, Array(5)).forEach((k, i) =>
                  contactsLiveList.insert({ _id: i })
                );
                assert.equal(searchService.callCount, 1);
                ctrl.sortDirection = 'last_visited_date';

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
            const ctrl = createController();
            return ctrl
              .getSetupPromiseForTesting()
              .then(() => {
                ctrl.sortDirection = 'alpha';
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
          hasAuth.resolves(false);
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
              assert.equal(hasAuth.callCount, 0);
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
