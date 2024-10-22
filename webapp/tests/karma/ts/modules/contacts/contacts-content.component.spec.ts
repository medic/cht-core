import { ComponentFixture, TestBed, fakeAsync, flush, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
import { ContactsActions } from '@mm-actions/contacts';
import { Selectors } from '@mm-selectors/index';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ModalService } from '@mm-services/modal.service';
import { GlobalActions } from '@mm-actions/global';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { SessionService } from '@mm-services/session.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { MutingTransition } from '@mm-services/transitions/muting.transition';
import { FastActionButtonService } from '@mm-services/fast-action-button.service';
import { FastActionButtonComponent } from '@mm-components/fast-action-button/fast-action-button.component';
import { AuthService } from '@mm-services/auth.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';

describe('Contacts content component', () => {
  let component: ContactsContentComponent;
  let fixture: ComponentFixture<ContactsContentComponent>;
  let store: MockStore;
  let activatedRoute;
  let router;
  let changesService;
  let contactChangeFilterService;
  let selectedContact;
  let xmlFormsService;
  let modalService;
  let globalActions;
  let settingsService;
  let userSettingsService;
  let sessionService;
  let contactTypesService;
  let responsiveService;
  let contactMutedService;
  let telemetryService: Partial<TelemetryService>;
  let fastActionButtonService;
  let mutingTransition;
  let settings;

  beforeEach(waitForAsync(() => {
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    contactChangeFilterService = {
      matchContact: sinon.stub(),
      isRelevantContact: sinon.stub(),
      isRelevantReport: sinon.stub(),
      isDeleted: sinon.stub(),
    };
    settings = {};
    settingsService = { get: sinon.stub().resolves(settings) };
    xmlFormsService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    modalService = { show: sinon.stub() };
    sessionService = {
      isAdmin: sinon.stub().returns(false),
      isOnlineOnly: sinon.stub().returns(false),
    };
    userSettingsService = {
      get: sinon.stub().resolves({ facility_id: 'district-123' })
    };
    contactTypesService = {
      getChildren: sinon.stub().resolves([
        {
          id: 'childType',
          icon: 'icon'
        }
      ]),
      getAll: sinon.stub().resolves([]),
      includes: sinon.stub()
    };
    globalActions = {
      unsetSelected: sinon.spy(GlobalActions.prototype, 'unsetSelected'),
    };
    mutingTransition = { isUnmuteForm: sinon.stub() };
    contactMutedService = { getMuted: sinon.stub() };
    telemetryService = { record: sinon.stub() };
    fastActionButtonService = { getContactRightSideActions: sinon.stub() };

    selectedContact = {
      doc: {},
      type: {},
      summary: {},
      children: [],
      tasks: [],
      reports: []
    };
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: selectedContact },
      { selector: Selectors.getForms, value: [] },
      { selector: Selectors.getLoadingContent, value: false },
      { selector: Selectors.getLoadingSelectedContactReports, value: false },
      { selector: Selectors.getContactsLoadingSummary, value: false },
      { selector: Selectors.getSelectedContactDoc, value: selectedContact.doc },
      { selector: Selectors.getSelectedContactChildren, value: null },
      { selector: Selectors.getFilters, value: {} },
    ];
    activatedRoute = { params: of({}), snapshot: { params: {} } };
    router = { navigate: sinon.stub(), events: { pipe: sinon.stub().returns({ subscribe: sinon.stub() }) } };
    responsiveService = { isMobile: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          MatIconModule,
        ],
        declarations: [
          ContactsContentComponent,
          ResourceIconPipe,
          FastActionButtonComponent
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ActivatedRoute, useValue: activatedRoute },
          { provide: Router, useValue: router },
          { provide: ResourceIconPipe, useValue: { transform: sinon.stub() } },
          { provide: ResourceIconsService, useValue: { getImg: sinon.stub() } },
          { provide: ContactChangeFilterService, useValue: contactChangeFilterService },
          { provide: ChangesService, useValue: changesService },
          { provide: ChangesService, useValue: changesService },
          { provide: SettingsService, useValue: settingsService },
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: SessionService, useValue: sessionService },
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: ModalService, useValue: modalService },
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: ContactMutedService, useValue: contactMutedService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: MutingTransition, useValue: mutingTransition },
          { provide: FastActionButtonService, useValue: fastActionButtonService },
          { provide: AuthService, useValue: { has: sinon.stub() } },
          { provide: MatBottomSheet, useValue: { open: sinon.stub() } },
          { provide: MatDialog, useValue: { open: sinon.stub() } },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactsContentComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create ContactsContentComponent', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables and reset state', () => {
    const unsubscribeSpy = sinon.spy(component.subscriptions, 'unsubscribe');
    const clearSelectionStub = sinon.stub(ContactsActions.prototype, 'clearSelection');
    sinon.resetHistory();

    component.ngOnDestroy();

    expect(unsubscribeSpy.calledOnce).to.be.true;
    expect(clearSelectionStub.calledOnce).to.be.true;
  });

  describe('load the user home place on mobile', () => {
    it(`should not load the user's home place when on mobile`, fakeAsync(() => {
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      store.overrideSelector(Selectors.getUserFacilityIds, [ 'homeplace' ]);
      responsiveService.isMobile.returns(true);
      activatedRoute.params = of({});
      activatedRoute.snapshot.params = {};
      component.ngOnInit();
      flush();

      expect(selectContact.callCount).to.equal(0);
      expect(!!component.summaryErrorStack).to.be.false;
    }));
  });

  it(`should not load the user's home place when a param id is set`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityIds, [ 'homeplace' ]);
    activatedRoute.params = of({ id: 'contact-1234' });
    activatedRoute.snapshot.params = { id: 'contact-1234' };

    component.ngOnInit();
    flush();

    expect(selectContact.calledOnce).to.be.true;
    expect(selectContact.args[0][0]).to.equal('contact-1234');
    expect(!!component.summaryErrorStack).to.be.false;
  }));

  it(`should not load the user's home place when a search term exists`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityIds, [ 'homeplace' ]);
    store.overrideSelector(Selectors.getFilters, { search: 'text' });
    component.ngOnInit();
    flush();

    expect(selectContact.notCalled).to.be.true;
    expect(!!component.summaryErrorStack).to.be.false;
  }));

  it(`should load the user's home place when a param id not set and no search term exists`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityIds, ['homeplace']);
    store.overrideSelector(Selectors.getFilters, { });
    activatedRoute.params = of({});
    activatedRoute.snapshot.params = {};
    component.ngOnInit();
    flush();

    expect(selectContact.callCount).to.equal(1);
    expect(selectContact.args[0][0]).to.equal('homeplace');
    expect(!!component.summaryErrorStack).to.be.false;
  }));

  it('should unset selected contact when a param id not set and no search term exists', fakeAsync(() => {
    const clearSelectionStub = sinon.stub(ContactsActions.prototype, 'clearSelection');
    store.overrideSelector(Selectors.getFilters, {});
    sinon.resetHistory();

    component.ngOnInit();
    flush();

    expect(globalActions.unsetSelected.calledOnce).to.be.true;
    expect(clearSelectionStub.calledOnce).to.be.true;
    expect(!!component.summaryErrorStack).to.be.false;
  }));

  describe('Change feed process', () => {
    let change;

    beforeEach(() => {
      selectedContact.doc = {
        _id: 'districtsdistrict',
        type: 'clinic',
        contact: { _id: 'mario' },
        children: { persons: [ ] }
      };
      change = { doc: {} };
    });

    it('should update information when selected contact is updated', () => {
      selectedContact._id = 'load contact';
      const changesFilter = changesService.subscribe.args[0][0].filter;
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      contactChangeFilterService.matchContact.returns(true);
      contactChangeFilterService.isDeleted.returns(false);

      expect(changesFilter(change)).to.equal(true);
      expect(selectContact.callCount).to.equal(0);

      changesCallback(change);

      expect(contactChangeFilterService.matchContact.callCount).to.equal(2);
      expect(selectContact.callCount).to.equal(1);
      expect(selectContact.args[0][0]).to.equal('load contact');
      expect(!!component.summaryErrorStack).to.be.false;
    });

    it('should redirect to parent when selected contact is deleted', () => {
      selectedContact.doc.parent = { _id: 'parent_id' };
      contactChangeFilterService.matchContact.returns(true);
      contactChangeFilterService.isDeleted.returns(true);
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const changesFilter = changesService.subscribe.args[0][0].filter;
      store.overrideSelector(Selectors.getSelectedContact, selectedContact);
      store.refreshState();
      fixture.detectChanges();

      expect(changesFilter(change)).to.equal(true);
      changesCallback(change);

      expect(contactChangeFilterService.matchContact.callCount).to.equal(2);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'parent_id']]);
      expect(!!component.summaryErrorStack).to.be.false;
    });

    it('shoul clear when selected contact is deleted and has no parent', () => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const changesFilter = changesService.subscribe.args[0][0].filter;
      contactChangeFilterService.matchContact.returns(true);
      contactChangeFilterService.isDeleted.returns(true);

      expect(changesFilter(change)).to.equal(true);
      changesCallback(change);
      expect(contactChangeFilterService.matchContact.callCount).to.equal(2);
      expect(router.navigate.callCount).to.equal(1);
      expect(!!component.summaryErrorStack).to.be.false;
    });

    it('should update information when relevant contact change is received', () => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const changesFilter = changesService.subscribe.args[0][0].filter;
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      contactChangeFilterService.matchContact.returns(false);
      contactChangeFilterService.isRelevantContact.returns(true);

      expect(changesFilter(change)).to.equal(true);
      expect(selectContact.callCount).to.equal(0);
      changesCallback(change);
      expect(contactChangeFilterService.matchContact.callCount).to.equal(2);
      expect(contactChangeFilterService.isRelevantContact.callCount).to.equal(1);
      expect(selectContact.callCount).to.equal(1);
      expect(!!component.summaryErrorStack).to.be.false;
    });

    it('should update information when relevant report change is received', () => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const changesFilter = changesService.subscribe.args[0][0].filter;
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      contactChangeFilterService.matchContact.returns(false);
      contactChangeFilterService.isRelevantReport.returns(true);
      contactChangeFilterService.isRelevantContact.returns(false);

      expect(changesFilter(change)).to.equal(true);
      expect(selectContact.callCount).to.equal(0);
      changesCallback(change);
      expect(contactChangeFilterService.matchContact.callCount).to.equal(2);
      expect(contactChangeFilterService.isRelevantContact.callCount).to.equal(1);
      expect(contactChangeFilterService.isRelevantReport.callCount).to.equal(1);
      expect(selectContact.callCount).to.equal(1);
      expect(!!component.summaryErrorStack).to.be.false;
    });

    it('does not update information when irrelevant change is received', () => {
      const changesFilter = changesService.subscribe.args[0][0].filter;
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      contactChangeFilterService.matchContact.returns(false);
      contactChangeFilterService.isRelevantReport.returns(false);
      contactChangeFilterService.isRelevantContact.returns(false);

      expect(changesFilter(change)).to.equal(false);
      expect(selectContact.callCount).to.equal(0);
      expect(contactChangeFilterService.matchContact.callCount).to.equal(1);
      expect(contactChangeFilterService.isRelevantContact.callCount).to.equal(1);
      expect(contactChangeFilterService.isRelevantReport.callCount).to.equal(1);
      expect(selectContact.callCount).to.equal(0);
      expect(!!component.summaryErrorStack).to.be.false;
    });
  });
});
