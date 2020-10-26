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
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { ContactsActions } from '@mm-actions/contacts';

describe('Contacts component', () => {
  let searchResults;
  let component; ContactsComponent;
  let store: MockStore;
  let fixture: ComponentFixture<ContactsComponent>;
  let changesService;
  let searchService;
  let simprintsService;
  let UHCSettings;
  let settingsService;
  let userSettingsService;
  let getDataRecordsService;
  let sessionService;
  let authService;
  let contactTypesService;
  let district;

  beforeEach(async(() => {
    district = { _id: 'abcde', name: 'My District', type: 'district_hospital' };
    const userSettingsServiceMock = {
      get: sinon.stub().resolves({})
    };

    const mockedSelectors = [
      { selector: Selectors.getContactsList, value: [] },
      { selector: Selectors.getFilters, value: {} },
      { selector: Selectors.getIsAdmin, value: false },
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
          } },
          { provide: UHCSettingsService, useValue: {
            getVisitCountSettings: sinon.stub().resolves([]),
            getContactsDefaultSort: sinon.stub().resolves([]),
          }},
          { provide: SettingsService, useValue: { get: sinon.stub().resolves([]) } },
          { provide: UserSettingsService, useValue: userSettingsServiceMock },
          { provide: GetDataRecordsService, useValue: { get: sinon.stub().resolves({}) } },
          { provide: SessionService, useValue: { isDbAdmin: sinon.stub().resolves([]) } },
          { provide: AuthService, useValue: { has: sinon.stub().resolves([]) } },
          { provide: ContactTypesService, useValue: {
            getChildren: sinon.stub().resolves([]),
            getAll: sinon.stub().resolves([])
          }},
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
        UHCSettings = TestBed.inject(UHCSettingsService);
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

  describe('Search', () => {
    it('Puts the home place at the top of the list', fakeAsync(() => {
      searchResults = [
        {
          _id: 'search-result',
        },
      ];
      userSettingsService.get.resolves({ facility_id: 'abcde' });
      getDataRecordsService.get.resolves(
        { _id: 'abcde', name: 'My District', type: 'district_hospital' }
      );
      sinon.stub(ContactsActions.prototype, 'updateContactsList');
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[0][0];

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

      userSettingsService.get.resolves({ facility_id: 'abcde' });
      getDataRecordsService.get.resolves(
        { _id: 'abcde', name: 'My District', type: 'district_hospital' }
      );
      sinon.stub(ContactsActions.prototype, 'updateContactsList');
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[0][0];

      expect(argument.length).to.equal(2);
      expect(argument[0]._id).to.equal('abcde');
      expect(argument[1]._id).to.equal('search-result');
    }));

    it('Only searches for top-level places as an admin', fakeAsync(() => {
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      searchResults = [
        {
          _id: 'search-result',
        },
      ];
      component.ngOnInit();
      flush();

      expect(contactTypesService.getChildren.args[0].length).to.equal(0);
    }));

    it('when paginating, does not skip the extra place for admins #4085', fakeAsync(() => {
      store.overrideSelector(Selectors.getIsAdmin, true);
      userSettingsService.get.resolves({ facility_id: undefined });
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[0][0];

      expect(argument.length).to.equal(50);
      // expect(searchService.search.args[1][2]).to.deep.equal({
      //   paginating: true,
      //   limit: 50,
      //   skip: 50,
      // });
    }));

    it('when paginating, does modify skip for non-admins #4085', fakeAsync(() => {
      userSettingsService.get.resolves({ facility_id: 'abcde' });
      getDataRecordsService.get.resolves(
        { _id: 'abcde', name: 'My District', type: 'district_hospital' }
      );
      const searchResult = { _id: 'search-result' };
      searchResults = Array(50).fill(searchResult);
      searchService.search.resolves(searchResults);
      component.contactsActions.updateContactsList = sinon.stub();
      component.ngOnInit();
      flush();
      const argument = component.contactsActions.updateContactsList.args[0][0];

      expect(argument.length).to.equal(51);
      // TODO: fix this test
      // expect(searchService.search.args[1][2]).to.deep.equal({
      //   paginating: true,
      //   limit: 50,
      //   skip: 50,
      // });
    }));
  });
});
