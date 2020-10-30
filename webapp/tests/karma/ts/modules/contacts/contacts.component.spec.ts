import { async, TestBed, ComponentFixture, fakeAsync, flush } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
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

describe('Contacts component', () => {
  let searchResults;
  let component; ContactsComponent;
  let store: MockStore;
  let fixture: ComponentFixture<ContactsComponent>;
  let changesService;
  let searchService;
  let simprintsService;
  let settingsService;
  let userSettingsService;
  let getDataRecordsService;
  let sessionService;
  let authService;
  let contactTypesService;
  let scrollLoaderProvider;
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
    TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule
        ],
        declarations: [
          ContactsComponent
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
            get: sinon.stub().resolves({ facility_id: 'abcde' })
          }},
          { provide: GetDataRecordsService, useValue: {
            get: sinon.stub().resolves({
              _id: 'abcde',
              name: 'My District',
              type: 'district_hospital'
            })
          }},
          { provide: SessionService, useValue: { isDbAdmin: sinon.stub().returns(false) } },
          { provide: AuthService, useValue: { has: sinon.stub().resolves(false) } },
          { provide: ContactTypesService, useValue: {
            getChildren: sinon.stub().resolves([
              {
                id: 'childType',
                icon: 'icon'
              }
            ]),
            getAll: sinon.stub().resolves([])
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
        simprintsService = TestBed.inject(SimprintsService);
        settingsService = TestBed.inject(SettingsService);
        userSettingsService = TestBed.inject(UserSettingsService);
        getDataRecordsService = TestBed.inject(GetDataRecordsService);
        sessionService = TestBed.inject(SessionService);
        authService = TestBed.inject(AuthService);
        contactTypesService = TestBed.inject(ContactTypesService);
        scrollLoaderProvider = TestBed.inject(ScrollLoaderProvider);
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
      const argument = component.contactsActions.updateContactsList.args[1][0];

      expect(argument.length).to.equal(2);
      expect(argument[0]._id).to.equal('abcde');
      expect(argument[1]._id).to.equal('search-result');
    }));

    it('Only displays the home place once', fakeAsync(() => {
      searchResults = [
        {
          _id: 'search-result',
        },
        {
          _id: 'abcde',
        },
      ];

      sinon.stub(ContactsActions.prototype, 'updateContactsList');
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[1][0];

      expect(argument.length).to.equal(2);
      expect(argument[0]._id).to.equal('abcde');
      expect(argument[1]._id).to.equal('search-result');
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
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();

      expect(contactTypesService.getChildren.args[1].length).to.equal(0);
      expect(searchService.search.args[1][1]).to.deep.equal(
        {
          types: { selected: ['childType'] },
        }
      );
      const argument = component.contactsActions.updateContactsList.args[1][0];
      expect(argument.length).to.equal(1);
    }));

    it('when paginating, does not skip the extra place for admins #4085', fakeAsync(() => {
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);
      searchService.search.resolves(searchResults);
      store.overrideSelector(Selectors.getContactsList, searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[1][0];
      scrollLoaderCallback();

      expect(argument.length).to.equal(50);
      expect(searchService.search.args[2][2]).to.deep.equal({
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
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[1][0];
      scrollLoaderCallback();

      expect(argument.length).to.equal(51);
      expect(searchService.search.args[2][2]).to.deep.equal({
        paginating: true,
        limit: 50,
        skip: 50,
      });
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

    it('refreshes contacts list when receiving a contact change #4080', () => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      changesCallback({ doc: { _id: '123' } });
      expect(searchService.search.callCount).to.equal(2);
      expect(searchService.search.args[1][2].limit).to.equal(50);
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
      component.ngOnInit();
      flush();
      expect(authService.has.callCount).equal(2);
      expect(authService.has.args[1]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({});
      expect(component.sortDirection).to.equal('alpha');
      expect(component.defaultSortDirection).to.equal('alpha');
      expect(userSettingsService.get.callCount).to.equal(2);
      expect(searchService.search.callCount).to.equal(2);
      expect(searchService.search.args[1]).to.deep.equal(
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
      component.ngOnInit();
      flush();

      expect(authService.has.callCount).equal(2);
      expect(authService.has.args[1]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({
        monthStartDate: false,
        visitCountGoal: 1,
      });
      expect(component.sortDirection).to.equal('alpha');
      expect(searchService.search.callCount).to.equal(2);
      expect(searchService.search.args[1]).to.deep.equal(
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
      component.ngOnInit();
      flush();

      expect(authService.has.callCount).equal(2);
      expect(authService.has.args[1]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({
        monthStartDate: false,
        visitCountGoal: 1,
      });
      expect(component.sortDirection).to.equal('something');
      expect(searchService.search.callCount).to.equal(2);
      expect(searchService.search.args[1]).to.deep.equal(
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
      component.ngOnInit();
      flush();

      expect(authService.has.callCount).equal(2);
      expect(authService.has.args[1]).to.deep.equal(['can_view_last_visited_date']);
      expect(component.lastVisitedDateExtras).to.equal(true);
      expect(component.visitCountSettings).to.deep.equal({
        monthStartDate: 25,
        visitCountGoal: 125,
      });
      expect(component.sortDirection).to.equal('last_visited_date');
      expect(component.defaultSortDirection).to.equal('last_visited_date');
      expect(searchService.search.callCount).to.equal(2);
      expect(searchService.search.args[1]).to.deep.equal(
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
  });
});
