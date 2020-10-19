import { async, TestBed, ComponentFixture } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect, assert } from 'chai';
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
  let district;

  beforeEach(async(() => {
    district = { _id: 'abcde', name: 'My District', type: 'district_hospital' };
    const userSettingsServiceMock = {
      get: sinon.stub().resolves({})
    };

    const mockedSelectors = [
      { selector: Selectors.getContactsList, value: [] },
      { selector: Selectors.getFilters, value: {} },
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
          { provide: GetDataRecordsService, useValue: { get: sinon.stub().resolves([]) } },
          { provide: SessionService, useValue: { isDbAdmin: sinon.stub().resolves([]) } },
          { provide: AuthService, useValue: { has: sinon.stub().resolves([]) } },
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
    it('Puts the home place at the top of the list', () => {
      userSettingsService.get.reset();
      userSettingsService.get.resolves({ facility_id: 'abcde' });
      fixture.detectChanges();

      searchResults = [
        {
          _id: 'search-result',
        },
      ];
      store.overrideSelector(Selectors.getContactsList, searchResults);
      store.refreshState();
      // TestBed.overrideProvider(
      //   UserSettingsService,
      //   { useValue: { get: sinon.stub().resolves({ facility_id: 'abcde' }) } }
      // );
      // TestBed.compileComponents();
      // fixture = TestBed.createComponent(ContactsComponent);
      // component = fixture.componentInstance;
      // fixture.detectChanges();

      // getDataRecordsService.get.resolves(
      //   { _id: 'abcde', name: 'My District', type: 'district_hospital' }
      // );

      const lhs = component.contactsList;
      console.log('LHS::');
      console.log(lhs);
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
});
