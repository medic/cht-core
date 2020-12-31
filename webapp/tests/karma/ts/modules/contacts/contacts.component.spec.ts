import { async, TestBed, ComponentFixture, fakeAsync, flush } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { of } from 'rxjs';

import { ContactsComponent } from '@mm-modules/contacts/contacts.component';
import { Selectors } from '@mm-selectors/index';
import { ChangesService } from '@mm-services/changes.service';
import { SearchService } from '@mm-services/search.service';
import { SimprintsService } from '@mm-services/simprints.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { ContactsActions } from '@mm-actions/contacts';
import { ScrollLoaderProvider } from '@mm-providers/scroll-loader.provider';
import { ContactsFiltersComponent } from '@mm-modules/contacts/contacts-filters.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { SimprintsFilterComponent } from '@mm-components/filters/simprints-filter/simprints-filter.component';
import { SortFilterComponent } from '@mm-components/filters/sort-filter/sort-filter.component';
import { ResetFiltersComponent } from '@mm-components/filters/reset-filters/reset-filters.component';
import { TourService } from '@mm-services/tour.service';

describe('Contacts component', () => {
  let searchResults;
  let component;
  let store: MockStore;
  let fixture: ComponentFixture<ContactsComponent>;
  let changesService;
  let searchService;
  let settingsService;
  let userSettingsService;
  let getDataRecordsService;
  let sessionService;
  let authService;
  let contactTypesService;
  let scrollLoaderCallback;
  let contactListContains;

  beforeEach(async(() => {
    contactListContains = sinon.stub();
    const mockedSelectors = [
      { selector: Selectors.getContactsList, value: [] },
      { selector: Selectors.getFilters, value: {} },
      { selector: Selectors.getIsAdmin, value: false },
      { selector: Selectors.contactListContains, value: contactListContains },
    ];
    const changesServiceMock = {
      subscribe: sinon.stub().resolves(of({}))
    };
    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
        ],
        declarations: [
          ContactsComponent,
          ContactsFiltersComponent,
          FreetextFilterComponent,
          NavigationComponent,
          SimprintsFilterComponent,
          ResetFiltersComponent,
          SortFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ChangesService, useValue: changesServiceMock },
          { provide: SearchService, useValue: { search: sinon.stub().resolves([]) } },
          { provide: SimprintsService, useValue: {
            enabled: sinon.stub().resolves([]),
            identify: sinon.stub().resolves([])
          }},
          { provide: SettingsService, useValue: { get: sinon.stub().resolves([]) } },
          { provide: UserSettingsService, useValue: {
            get: sinon.stub().resolves({ facility_id: 'district-id' })
          }},
          { provide: GetDataRecordsService, useValue: {
            get: sinon.stub().resolves({
              _id: 'district-id',
              name: 'My District',
              type: 'district_hospital'
            })
          }},
          { provide: SessionService, useValue: { isDbAdmin: sinon.stub().returns(false) } },
          { provide: TourService, useValue: { startIfNeeded: sinon.stub() } },
          { provide: AuthService, useValue: { has: sinon.stub().resolves(false) } },
          { provide: ContactTypesService, useValue: {
            getChildren: sinon.stub().resolves([
              {
                id: 'childType',
                icon: 'icon'
              }
            ]),
            getAll: sinon.stub().resolves([]),
            includes: sinon.stub()
          }},
          { provide: ScrollLoaderProvider, useValue: { init: (callback) => {
            scrollLoaderCallback = callback;
          } }},
        ]
      })
      .compileComponents().then(() => {
        fixture = TestBed.createComponent(ContactsComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
        changesService = TestBed.inject(ChangesService);
        searchService = TestBed.inject(SearchService);
        settingsService = TestBed.inject(SettingsService);
        userSettingsService = TestBed.inject(UserSettingsService);
        getDataRecordsService = TestBed.inject(GetDataRecordsService);
        sessionService = TestBed.inject(SessionService);
        authService = TestBed.inject(AuthService);
        contactTypesService = TestBed.inject(ContactTypesService);
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create ContactsComponent', () => {
    expect(component).to.exist;
  });
  
  it('ngOnInit() should load and filter contacts and watch for changes', () => {
    changesService.subscribe.reset();
    const spySubscriptionsAdd = sinon.spy(component.subscription, 'add');
    component.filters = {};

    component.ngOnInit();

    expect(searchService.search.callCount).to.equal(1);
    expect(changesService.subscribe.callCount).to.equal(1);
    expect(spySubscriptionsAdd.callCount).to.equal(2);
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  // TODO: Migrate these tests
  // describe('sets left actionBar', () => {
  //   it('when user has facility_id', () => {
  //     const ctrl = createController();
  //     return ctrl
  //       .getSetupPromiseForTesting()
  //       .then(() => {
  //         assert(ctrl.setLeftActionBar.called, 'left actionBar should be set');
  //         const actionBarArgs = ctrl.setLeftActionBar.getCall(0).args[0];
  //         assert.equal(actionBarArgs.userFacilityId, district._id);
  //       });
  //   });

  //   it(`when user doesn't have facility_id`, () => {
  //     userSettings = KarmaUtils.promiseService(null, {});
  //     getDataRecords = KarmaUtils.promiseService();
  //     const ctrl = createController();
  //     return ctrl
  //       .getSetupPromiseForTesting()
  //       .then(() => {
  //         assert(ctrl.setLeftActionBar.called);
  //       });
  //   });

  //   it('should filter contact types to allowed ones', () => {
  //     contactTypes.getChildren.resolves([
  //       {
  //         id: 'type1',
  //         create_form: 'form:contact:create:type1',
  //       },
  //       {
  //         id: 'type2',
  //         create_form: 'form:contact:create:type2',
  //       },
  //       {
  //         id: 'type3',
  //         create_form: 'form:contact:create:type3',
  //       },
  //     ]);
  //     const forms = [
  //       { _id: 'form:contact:create:type3' },
  //       { _id: 'form:contact:create:type2' },
  //     ];
  //     xmlForms.listen.callsArgWith(2, null, forms);

  //     const ctrl = createController();
  //     return ctrl
  //       .getSetupPromiseForTesting()
  //       .then(() => {
  //         assert.equal(xmlForms.listen.callCount, 1);
  //         assert.deepEqual(xmlForms.listen.args[0][1], { contactForms: true });
  //         assert.deepEqual(ctrl.setLeftActionBar.args[0][0].childPlaces, [
  //           {
  //             id: 'type2',
  //             create_form: 'form:contact:create:type2',
  //           },
  //           {
  //             id: 'type3',
  //             create_form: 'form:contact:create:type3',
  //           },
  //         ]);

  //         //search still searches with all types
  //         assert.deepEqual(searchService.args[0][1], { types: { selected: ['type1', 'type2', 'type3'] } });
  //       });
  //   });

  // });

  describe('Search', () => {
    it('Puts the home place at the top of the list', fakeAsync(() => {
      searchResults = [
        {
          _id: 'search-result',
        },
      ];
      sinon.stub(ContactsActions.prototype, 'updateContactsList');
      searchService.search.resolves(searchResults);
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];

      expect(contacts.length).to.equal(2);
      expect(contacts[0]._id).to.equal('district-id');
      expect(contacts[1]._id).to.equal('search-result');
    }));

    it('Only displays the home place once', fakeAsync(() => {
      searchResults = [
        {
          _id: 'search-result',
        },
        {
          _id: 'district-id',
        },
      ];

      sinon.stub(ContactsActions.prototype, 'updateContactsList');
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];

      expect(contacts.length).to.equal(2);
      expect(contacts[0]._id).to.equal('district-id');
      expect(contacts[1]._id).to.equal('search-result');
    }));

    it('Only searches for top-level places as an admin', fakeAsync(() => {
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      getDataRecordsService.get.resolves({});
      searchResults = [
        {
          _id: 'search-result',
        },
      ];
      contactTypesService.getChildren.resetHistory();
      searchService.search.resetHistory();
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();

      expect(contactTypesService.getChildren.args[0].length).to.equal(0);
      expect(searchService.search.args[0][1]).to.deep.equal(
        {
          types: { selected: ['childType'] },
        }
      );
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      expect(contacts.length).to.equal(1);
    }));

    it('when paginating, does not skip the extra place for admins #4085', fakeAsync(() => {
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      expect(contacts.length).to.equal(50);

      scrollLoaderCallback();
      expect(searchService.search.args[1][2]).to.deep.equal({
        paginating: true,
        limit: 50,
        skip: 50,
      });
    }));

    it('when paginating, does modify skip for non-admins #4085', fakeAsync(() => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      scrollLoaderCallback();

      expect(contacts.length).to.equal(51);
      expect(searchService.search.args[1][2]).to.deep.equal({
        paginating: true,
        limit: 50,
        skip: 50,
      });
    }));

    it('when refreshing list as admin, does not modify limit #4085', fakeAsync(() => {
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(60).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      const changesCallback = changesService.subscribe.args[0][0].callback;
      changesCallback({});

      expect(contacts.length).to.equal(60);
      expect(searchService.search.args[1][2]).to.deep.equal({
        limit: 60,
        silent: true,
        withIds: false,
      });
    }));

    it('when refreshing list as non-admin, does modify limit #4085', fakeAsync(() => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(60).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      const changesCallback = changesService.subscribe.args[0][0].callback;
      changesCallback({});

      expect(contacts.length).to.equal(61);
      expect(searchService.search.args[1][2].limit).to.equal(60);
      expect(searchService.search.args[1][2].skip).to.equal(undefined);
    }));

    it('resets limit/skip modifier when filtering #4085', fakeAsync(() => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(10).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();

      const contacts = component.contactsActions.updateContactsList.args[0][0];

      expect(contacts.length).to.equal(11);
      searchResults = Array(50).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      store.refreshState();
      component.filters = { search: true };
      component.router.navigate = sinon.stub().returns(true);
      component.search();
      flush();

      expect(searchService.search.args[1][2]).to.deep.equal({ limit: 50 });

      const updatedContacts = component.contactsActions.updateContactsList.args[1][0].length;
      expect(updatedContacts).to.equal(50);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      scrollLoaderCallback();
      store.overrideSelector(Selectors.getContactsList, searchResults);

      expect(searchService.search.args[2][2]).to.deep.equal({
        limit: 50,
        paginating: true,
        skip: 50,
      });
    }));

    it('when paginating, does not modify the skip when it finds homeplace #4085', fakeAsync(() => {
      const searchResult = { _id: 'search-result' };
      searchResults = Array(49).fill(searchResult);
      searchResults.push({ _id: 'district-id' });
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      scrollLoaderCallback();

      expect(contacts.length).to.equal(50);
      expect(searchService.search.args[1][2]).to.deep.equal({
        limit: 50,
        paginating: true,
        skip: 50,
      });
    }));

    it('when paginating, does not modify the skip when it finds homeplace on subsequent pages #4085', fakeAsync(() => {
      const mockResults = (count, startAt = 0) => {
        const result = [];
        for (let i = startAt; i < startAt + count; i++) {
          result.push({ _id: `search-result${i}` });
        }
        return result;
      };
      searchResults = mockResults(50);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      const contacts = component.contactsActions.updateContactsList.args[0][0];
      expect(contacts.length).to.equal(51);

      store.refreshState();
      searchResults = mockResults(49, 50);
      searchService.search.resolves(searchResults.concat(contacts));
      store.overrideSelector(Selectors.getContactsList, searchResults.concat(contacts));
      
      scrollLoaderCallback();
      flush();
      const updatedContacts = component.contactsActions.updateContactsList.args[1][0];
      expect(updatedContacts.length).to.equal(100);
      expect(searchService.search.args[1][2]).to.deep.equal({
        limit: 50,
        paginating: true,
        skip: 50,
      });

      store.refreshState();
      searchResults = mockResults(50, 100);
      searchService.search.resolves(searchResults.concat(updatedContacts));
      store.overrideSelector(Selectors.getContactsList, searchResults.concat(updatedContacts));
      scrollLoaderCallback();
      flush();
      expect(searchService.search.args[2][2]).to.deep.equal({
        limit: 50,
        paginating: true,
        skip: 100,
      });
      const updateContactsList = component.contactsActions.updateContactsList.args[2][0];
      expect(updateContactsList.length).to.equal(150);
    }));
  });

  describe('Changes feed filtering', () => {
    it('filtering returns true for `contact` type documents #4080', () => {
      contactListContains.returns(true);
      expect(changesService.subscribe.callCount).to.equal(1);
      const changesFilter = changesService.subscribe.args[0][0].filter;
      expect(!!changesFilter({ doc: { type: 'person' } })).to.equal(true);
      expect(!!changesFilter({ doc: { type: 'clinic' } })).to.equal(true);
      expect(!!changesFilter({ doc: { type: 'health_center' } })).to.equal(true);
      expect(!!changesFilter({ doc: { type: 'district_hospital' } })).to.equal(true);
    });

    it('filtering returns false for non-`contact` type documents #4080', () => {
      const changesFilter = changesService.subscribe.args[0][0].filter;
      expect(!!changesFilter({ doc: {} })).to.equal(false);
      expect(!!changesFilter({ doc: { type: 'data_record' } })).to.equal(false);
      expect(!!changesFilter({ doc: { type: '' } })).to.equal(false);
    });

    it('refreshes contacts list when receiving a contact change #4080', fakeAsync(() => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      searchResults = [
        {
          _id: 'search-result',
        },
        {
          _id: 'district-id',
        },
      ];
      searchService.search.onCall(0).resolves(searchResults);
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      changesCallback({ doc: { _id: '123' } });
      expect(searchService.search.callCount).to.equal(2);
      expect(searchService.search.args[1][2].limit).to.equal(50);
    }));

    it('when handling deletes, does not shorten the list #4080', fakeAsync(() => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(60).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.removeContactFromList = sinon.stub();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();
      expect(searchService.search.callCount).to.equal(1);
      changesCallback({ deleted: true, doc: {}, id: 'deleted doc' });
      store.overrideSelector(Selectors.getContactsList, searchResults.slice(0, -1));
      store.refreshState();

      expect(component.contactsActions.removeContactFromList.callCount).to.equal(1);
      expect(searchService.search.callCount).to.equal(2);
      expect(component.contactsActions.removeContactFromList.args[0][0]).to.deep.equal(
        { _id: 'deleted doc' }
      );
      expect(searchService.search.args[1][2].limit).to.equal(60);
    }));

    it('filtering returns true for contained deletions', () => {
      contactListContains.returns(true);
      const changesFilter = changesService.subscribe.args[0][0].filter;
      expect(!!changesFilter({ deleted: true, id: 'some_id' })).to.equal(true);
    });
  });

  describe('last visited date', () => {
    it('does not enable LastVisitedDate features not allowed', () => {
      expect(authService.has.callCount).equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(false);
      expect(component.visitCountSettings).to.deep.equal({});
      expect(component.sortDirection).to.equal('alpha');
      expect(component.defaultSortDirection).to.equal('alpha');
      expect(userSettingsService.get.callCount).to.equal(1);
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal(
        [
          'contacts',
          { types: { selected: ['childType'] } },
          { limit: 50 },
          {},
          undefined,
        ]
      );
    });

    it('enables LastVisitedDate features when allowed', fakeAsync(() => {
      authService.has.resolves(true);
      searchService.search.resetHistory();
      userSettingsService.get.resetHistory();
      component.ngOnInit();
      flush();
      expect(authService.has.callCount).equal(2);
      expect(authService.has.args[1]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({});
      expect(component.sortDirection).to.equal('alpha');
      expect(component.defaultSortDirection).to.equal('alpha');
      expect(userSettingsService.get.callCount).to.equal(1);
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal(
        [
          'contacts',
          { types: { selected: ['childType'] } },
          { limit: 50 },
          {
            displayLastVisitedDate: true,
            visitCountSettings: {},
          },
          undefined,
        ]
      );
    }));

    it('saves uhc home_visits settings and default sort when correct', fakeAsync(() => {
      authService.has.resolves(true);
      settingsService.get.resolves({
        uhc: {
          contacts_default_sort: false,
          visit_count: {
            month_start_date: false,
            visit_count_goal: 1,
          },
        },
      });
      authService.has.resetHistory();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();

      expect(authService.has.callCount).equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({
        monthStartDate: false,
        visitCountGoal: 1,
      });
      expect(component.sortDirection).to.equal('alpha');
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal(
        [
          'contacts',
          { types: { selected: ['childType'] } },
          { limit: 50 },
          {
            displayLastVisitedDate: true,
            visitCountSettings: { monthStartDate: false, visitCountGoal: 1 },
          },
          undefined,
        ]
      );
    }));

    it('always saves default sort', fakeAsync(() => {
      authService.has.resolves(true);
      settingsService.get.resolves({
        uhc: {
          contacts_default_sort: 'something',
          visit_count: {
            month_start_date: false,
            visit_count_goal: 1,
          },
        },
      });
      authService.has.resetHistory();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();

      expect(authService.has.callCount).equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({
        monthStartDate: false,
        visitCountGoal: 1,
      });
      expect(component.sortDirection).to.equal('something');
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal(
        [
          'contacts',
          { types: { selected: ['childType'] } },
          { limit: 50 },
          {
            displayLastVisitedDate: true,
            visitCountSettings: { monthStartDate: false, visitCountGoal: 1 },
          },
          undefined,
        ]
      );
      component.sortDirection = 'somethingElse';
      component.sort();
      expect(component.sortDirection).to.equal('something');
    }));

    it('saves uhc default sorting', fakeAsync(() => {
      authService.has.resolves(true);
      settingsService.get.resolves({
        uhc: {
          contacts_default_sort: 'last_visited_date',
          visit_count: {
            month_start_date: 25,
            visit_count_goal: 125,
          },
        },
      });
      authService.has.resetHistory();
      searchService.search.resetHistory();
      component.ngOnInit();
      flush();

      expect(authService.has.callCount).equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({
        monthStartDate: 25,
        visitCountGoal: 125,
      });
      expect(component.sortDirection).to.equal('last_visited_date');
      expect(component.defaultSortDirection).to.equal('last_visited_date');
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal(
        [
          'contacts',
          { types: { selected: ['childType'] } },
          { limit: 50 },
          {
            displayLastVisitedDate: true,
            visitCountSettings: { monthStartDate: 25, visitCountGoal: 125 },
            sortByLastVisitedDate: true,
          },
          undefined,
        ]
      );
      component.sortDirection = 'somethingElse';
      component.sort();
      expect(component.sortDirection).to.equal('last_visited_date');
    }));

    it('changes listener filters relevant last visited reports when feature is enabled', fakeAsync(() => {
      authService.has.resolves(true);
      component.ngOnInit();
      flush();
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
      contactListContains.returns(false);
      contactListContains.withArgs('something').returns(true);
      const changesFilter = changesService.subscribe.args[1][0].filter;

      expect(!!changesFilter({ doc: relevantReport, id: 'relevantReport' })).to.equal(true);
      expect(!!changesFilter({ doc: irrelevantReports[0], id: 'irrelevant1' })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[1], id: 'irrelevant2' })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[2], id: 'irrelevant3' })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[3], id: 'irrelevant4' })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[4], id: 'irrelevant5' })).to.equal(false);
      expect(!!changesFilter({ doc: deletedReport, deleted: true })).to.equal(true);
    }));

    it('changes listener filters deleted visit reports when sorting by last visited date', fakeAsync(() => {
      authService.has.resolves(true);
      component.ngOnInit();
      flush();
      const deletedReport = {
        type: 'data_record',
        form: 'home_visit',
        fields: { visited_contact_uuid: 'deleted' },
        _deleted: true,
      };
      component.sortDirection = 'last_visited_date';
      contactListContains.returns(false);
      const changesFilter = changesService.subscribe.args[1][0].filter;

      expect(!!changesFilter({ doc: deletedReport, deleted: true })).to.equal(true);
    }));

    it('changes listener does not filter last visited reports when feature is disabled', fakeAsync(() => {
      authService.has.resolves(false);
      component.ngOnInit();
      flush();

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

      contactListContains.returns(false);
      contactListContains.withArgs('something').returns(true);
      const changesFilter = changesService.subscribe.args[1][0].filter;

      expect(!!changesFilter({ doc: relevantReport })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[0] })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[1] })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[2] })).to.equal(false);
      expect(!!changesFilter({ doc: irrelevantReports[3] })).to.equal(false);
    }));

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
          authService.has.resolves(true);
          contactListContains.withArgs(4).returns(true);
        });

        describe('alpha default sorting', () => {
          it('does not require refreshing when sorting is `alpha` and visit report is received', fakeAsync(() => {
            const searchResult = { _id: 'search-result' };
            searchResults = Array(60).fill(searchResult);
            searchService.search.resolves(searchResults);
            store.overrideSelector(Selectors.getContactsList, searchResults);
            searchService.search.resetHistory();
            component.ngOnInit();
            flush();
            const changesCallback = changesService.subscribe.args[1][0].callback;

            return Promise.all([
              changesCallback({ doc: relevantVisitReport }),
              changesCallback({ doc: irrelevantReport }),
              changesCallback({ doc: irrelevantVisitReport }),
              changesCallback({ doc: deletedVisitReport, deleted: true }),
              changesCallback({ doc: someContact }),
            ]).then(() => {
              expect(searchService.search.callCount).to.equal(6);

              for (let i = 1; i < 6; i++) {
                expect(searchService.search.args[i]).to.deep.equal(
                  [
                    'contacts',
                    { types: { selected: ['childType'] } },
                    { limit: 60, withIds: false, silent: true },
                    { displayLastVisitedDate: true, visitCountSettings: {} },
                    undefined,
                  ]
                );
              }
            });
          }));

          it(
            'does require refreshing when sorting is `last_visited_date` and visit report is received',
            fakeAsync(() => {
              searchResults = [];
              Array.apply(null, Array(5)).forEach((k, i) =>
                searchResults.push({ _id: i })
              );
              searchService.search.resolves(searchResults);
              store.overrideSelector(Selectors.getContactsList, searchResults);
              searchService.search.resetHistory();
              component.ngOnInit();
              flush();
              component.sortDirection = 'last_visited_date';
              const changesCallback = changesService.subscribe.args[1][0].callback;

              return Promise.all([
                changesCallback({ doc: relevantVisitReport }),
                changesCallback({ doc: irrelevantReport }),
                changesCallback({ doc: irrelevantVisitReport }),
                changesCallback({ doc: deletedVisitReport, deleted: true }),
                changesCallback({ doc: someContact }),
              ]).then(() => {
                expect(searchService.search.callCount).to.equal(6);
                expect(searchService.search.args[1]).to.deep.equal([
                  'contacts',
                  { types: { selected: ['childType'] } },
                  { limit: 49, withIds: true, silent: true },
                  {
                    displayLastVisitedDate: true,
                    visitCountSettings: {},
                    sortByLastVisitedDate: true,
                  },
                  ['district-id', 0, 1, 2, 3, 4],
                ]);

                for (let i = 2; i < 6; i++) {
                  expect(searchService.search.args[i]).to.deep.equal([
                    'contacts',
                    { types: { selected: ['childType'] } },
                    { limit: 49, withIds: false, silent: true },
                    {
                      displayLastVisitedDate: true,
                      visitCountSettings: {},
                      sortByLastVisitedDate: true,
                    },
                    undefined,
                  ]);
                }
              });
            }));
        });

        describe('last_visited_date default sorting', () => {

          it('does not require refreshing when sorting is `alpha` and visit report is received', fakeAsync(() => {
            searchResults = [];
            Array.apply(null, Array(5)).forEach((k, i) =>
              searchResults.push({ _id: i })
            );
            searchService.search.resolves(searchResults);
            store.overrideSelector(Selectors.getContactsList, searchResults);
            authService.has.resolves(true);
            searchService.search.resetHistory();
            component.ngOnInit();
            flush();
            component.sortDirection = 'alpha';
            const changesCallback = changesService.subscribe.args[0][0].callback;
            return Promise.all([
              changesCallback({ doc: relevantVisitReport }),
              changesCallback({ doc: irrelevantReport }),
              changesCallback({ doc: irrelevantVisitReport }),
              changesCallback({ doc: deletedVisitReport, deleted: true }),
              changesCallback({ doc: someContact }),
            ]).then(() => {
              expect(searchService.search.callCount).to.equal(6);

              for (let i = 2; i < 6; i++) {
                expect(searchService.search.args[i]).to.deep.equal([
                  'contacts',
                  { types: { selected: ['childType'] } },
                  { limit: 49, withIds: false, silent: true },
                  {
                    displayLastVisitedDate: true,
                    visitCountSettings: {},
                  },
                  undefined,
                ]);
              }
            });
          }));

          it(
            'does require refreshing when sorting is `last_visited_date` and visit report is received',
            fakeAsync(() => {
              settingsService.get.resolves({
                uhc: { contacts_default_sort: 'last_visited_date' },
              });
              searchResults = [];
              Array.apply(null, Array(5)).forEach((k, i) =>
                searchResults.push({ _id: i })
              );
              searchService.search.resolves(searchResults);
              store.overrideSelector(Selectors.getContactsList, searchResults);
              authService.has.resolves(true);
              searchService.search.resetHistory();
              component.ngOnInit();
              flush();
              const changesCallback = changesService.subscribe.args[1][0].callback;
              return Promise.all([
                changesCallback({ doc: relevantVisitReport }),
                changesCallback({ doc: irrelevantReport }),
                changesCallback({ doc: irrelevantVisitReport }),
                changesCallback({ doc: deletedVisitReport, deleted: true }),
                changesCallback({ doc: someContact }),
              ]).then(() => {
                expect(searchService.search.callCount).to.equal(6);
                expect(searchService.search.args[1]).to.deep.equal([
                  'contacts',
                  { types: { selected: ['childType'] } },
                  { limit: 49, withIds: true, silent: true },
                  {
                    displayLastVisitedDate: true,
                    visitCountSettings: {},
                    sortByLastVisitedDate: true,
                  },
                  ['district-id', 0, 1, 2, 3, 4],
                ]);

                for (let i = 2; i < 6; i++) {
                  expect(searchService.search.args[i]).to.deep.equal([
                    'contacts',
                    { types: { selected: ['childType'] } },
                    { limit: 49, withIds: false, silent: true },
                    {
                      displayLastVisitedDate: true,
                      visitCountSettings: {},
                      sortByLastVisitedDate: true,
                    },
                    undefined,
                  ]);
                }
              });
            }));
        });
      });

      describe('uhc visits disabled', () => {
        describe('alpha default sorting', () => {
          it('does not require refreshing when sorting is `alpha` and visit report is received', fakeAsync(() => {
            const searchResults = [];
            Array.apply(null, Array(5)).forEach((k, i) =>
              searchResults.push({ _id: i })
            );
            searchService.search.resolves(searchResults);
            store.overrideSelector(Selectors.getContactsList, searchResults);
            authService.has.resolves(false);
            contactListContains.withArgs(4).returns(true);
            searchService.search.resetHistory();
            component.ngOnInit();
            flush();
            const changesCallback = changesService.subscribe.args[1][0].callback;

            return Promise.all([
              changesCallback({ doc: relevantVisitReport }),
              changesCallback({ doc: irrelevantReport }),
              changesCallback({ doc: irrelevantVisitReport }),
              changesCallback({ doc: deletedVisitReport, deleted: true }),
              changesCallback({ doc: someContact }),
            ]).then(() => {
              expect(searchService.search.callCount).to.equal(6);

              for (let i = 1; i < 6; i++) {
                expect(searchService.search.args[i]).to.deep.equal([
                  'contacts',
                  { types: { selected: ['childType'] } },
                  { limit: 49, withIds: false, silent: true },
                  {},
                  undefined,
                ]);
              }
            });
          }));
        });

        describe('last_visited_date default sorting', () => {
          it(
            'does require refreshing when sorting is `last_visited_date` and visit report is received',
            fakeAsync(() => {
              const searchResults = [];
              Array.apply(null, Array(5)).forEach((k, i) => searchResults.push({ _id: i }));
              searchService.search.resolves(searchResults);
              store.overrideSelector(Selectors.getContactsList, searchResults);
              authService.has.resolves(false);
              contactListContains.withArgs(4).returns(true);
              settingsService.get.resolves({
                uhc: { contacts_default_sort: 'last_visited_date' },
              });
              searchService.search.resetHistory();
              component.ngOnInit();
              flush();
              const changesCallback = changesService.subscribe.args[1][0].callback;

              return Promise.all([
                changesCallback({ doc: relevantVisitReport }),
                changesCallback({ doc: irrelevantReport }),
                changesCallback({ doc: irrelevantVisitReport }),
                changesCallback({ doc: deletedVisitReport, deleted: true }),
                changesCallback({ doc: someContact }),
              ]).then(() => {
                expect(searchService.search.callCount).to.equal(6);

                for (let i = 1; i < 6; i++) {
                  expect(searchService.search.args[i]).to.deep.equal([
                    'contacts',
                    { types: { selected: ['childType'] } },
                    { limit: 49, withIds: false, silent: true },
                    {},
                    undefined,
                  ]);
                }
              });
            }));
        });
      });

      describe('uhc disabled for DB admins', () => {
        it('should disable UHC for DB admins', fakeAsync(() => {
          settingsService.get.resolves({
            uhc: { contacts_default_sort: 'last_visited_date' },
          });
          sessionService.isDbAdmin.returns(true);
          authService.has.resetHistory();
          searchService.search.resetHistory();
          component.ngOnInit();
          flush();

          expect(authService.has.callCount).to.equal(0);
          expect(searchService.search.callCount).to.equal(1);
          expect(searchService.search.args[0]).to.deep.equal([
            'contacts',
            { types: { selected: ['childType'] } },
            { limit: 50 },
            {},
            undefined,
          ]);
        }));
      });
    });
  });
});
