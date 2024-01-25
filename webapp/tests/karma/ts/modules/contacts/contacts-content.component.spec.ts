import { ComponentFixture, TestBed, fakeAsync, flush, waitForAsync } from '@angular/core/testing';
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
import { TranslateFromService } from '@mm-services/translate-from.service';
import { ModalService } from '@mm-services/modal.service';
import { GlobalActions } from '@mm-actions/global';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { SessionService } from '@mm-services/session.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
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
  let translateFromService;
  let modalService;
  let globalActions;
  let settingsService;
  let userSettingsService;
  let sessionService;
  let contactTypesService;
  let responsiveService;
  let contactMutedService;
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
    translateFromService = { get: sinon.stub().returnsArg(0) };
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
      setRightActionBar: sinon.spy(GlobalActions.prototype, 'setRightActionBar'),
      updateRightActionBar: sinon.spy(GlobalActions.prototype, 'updateRightActionBar'),
      unsetSelected: sinon.spy(GlobalActions.prototype, 'unsetSelected'),
    };
    mutingTransition = { isUnmuteForm: sinon.stub() };
    contactMutedService = { getMuted: sinon.stub() };
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
          { provide: TranslateFromService, useValue: translateFromService },
          { provide: ModalService, useValue: modalService },
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: ContactMutedService, useValue: contactMutedService },
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
    const unsubscribeSpy = sinon.spy(component.subscription, 'unsubscribe');
    const clearSelectionStub = sinon.stub(ContactsActions.prototype, 'clearSelection');
    sinon.resetHistory();

    component.ngOnDestroy();

    expect(unsubscribeSpy.calledOnce).to.be.true;
    expect(clearSelectionStub.calledOnce).to.be.true;
    expect(globalActions.setRightActionBar.calledOnce).to.be.true;
    expect(globalActions.setRightActionBar.args[0][0]).to.deep.equal({});
  });

  describe('load the user home place on mobile', () => {
    it(`should not load the user's home place when on mobile`, fakeAsync(() => {
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      store.overrideSelector(Selectors.getUserFacilityId, 'homeplace');
      responsiveService.isMobile.returns(true);
      activatedRoute.params = of({});
      activatedRoute.snapshot.params = {};
      component.ngOnInit();
      flush();

      expect(selectContact.callCount).to.equal(0);
    }));
  });

  it(`should not load the user's home place when a param id is set`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityId, 'homeplace');
    activatedRoute.params = of({ id: 'contact-1234' });
    activatedRoute.snapshot.params = { id: 'contact-1234' };

    component.ngOnInit();
    flush();

    expect(selectContact.calledOnce).to.be.true;
    expect(selectContact.args[0][0]).to.equal('contact-1234');
  }));

  it(`should not load the user's home place when a search term exists`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityId, 'homeplace');
    store.overrideSelector(Selectors.getFilters, { search: 'text' });
    component.ngOnInit();
    flush();

    expect(selectContact.notCalled).to.be.true;
  }));

  it(`should load the user's home place when a param id not set and no search term exists`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityId, 'homeplace');
    store.overrideSelector(Selectors.getFilters, undefined);
    activatedRoute.params = of({});
    activatedRoute.snapshot.params = {};
    component.ngOnInit();
    flush();

    expect(selectContact.callCount).to.equal(1);
    expect(selectContact.args[0][0]).to.equal('homeplace');
  }));

  it('should unset selected contact when a param id not set and no search term exists', fakeAsync(() => {
    const clearSelectionStub = sinon.stub(ContactsActions.prototype, 'clearSelection');
    store.overrideSelector(Selectors.getFilters, undefined);
    sinon.resetHistory();

    component.ngOnInit();
    flush();

    expect(globalActions.unsetSelected.calledOnce).to.be.true;
    expect(clearSelectionStub.calledOnce).to.be.true;
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
    });
  });

  describe('Action bar', () => {
    it('should initialise action bar', fakeAsync(() => {
      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123', muted: true },
        type: { person: true },
        summary: { context: 'test' },
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      fixture.detectChanges();

      component.ngOnInit();
      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(false);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(false);
      expect(globalActions.setRightActionBar.args[0][0].openContactMutedModal).to.be.a('function');
      expect(globalActions.setRightActionBar.args[0][0].openSendMessageModal).to.be.a('function');
      expect(globalActions.setRightActionBar.args[0][0].relevantForms.length).to.equal(0);
      expect(globalActions.setRightActionBar.args[0][0].sendTo).to.deep.equal({
        _id: 'district-123',
        phone: '123',
        muted: true
      });

      expect(fastActionButtonService.getContactRightSideActions.calledOnce).to.be.true;
      expect(fastActionButtonService.getContactRightSideActions.args[0][0].xmlReportForms).to.be.undefined;
      expect(fastActionButtonService.getContactRightSideActions.args[0][0].childContactTypes).to.be.undefined;
      expect(fastActionButtonService.getContactRightSideActions.args[0][0].parentFacilityId).to.equal('district-123');
      expect(fastActionButtonService.getContactRightSideActions.args[0][0].communicationContext.sendTo).to.deep.equal({
        _id: 'district-123',
        phone: '123',
        muted: true
      });
    }));

    it('should not initialise action bar when there is not selected contact', fakeAsync(() => {
      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContactDoc, undefined);
      store.refreshState();
      fixture.detectChanges();

      flush();

      expect(globalActions.setRightActionBar.notCalled).to.be.true;
      expect(fastActionButtonService.getContactRightSideActions.notCalled).to.be.true;
      expect(xmlFormsService.subscribe.notCalled).to.be.true;
      expect(userSettingsService.get.notCalled).to.be.true;
      expect(settingsService.get.notCalled).to.be.true;
      expect(contactTypesService.getChildren.notCalled).to.be.true;
    }));

    it('should enable edit and delete in the right action bar when user is online only', fakeAsync(() => {
      sinon.resetHistory();
      sessionService.isOnlineOnly.returns(true);
      store.overrideSelector(Selectors.getSelectedContact, {
        type: { person: true },
        doc: { phone: '11', muted: true },
        summary: { context: 'test' },
        children: [
          { _id: '1', contacts: [], type: {} },
          { _id: '2', type: {} }
        ]
      });
      store.overrideSelector(Selectors.getSelectedContactDoc, { phone: '11', muted: true });
      store.overrideSelector(Selectors.getSelectedContactChildren, [
        { contacts: [], type: { id: 'type1', person: true } },
        { contact: [], type: { id: 'type2', person: false } },
      ]);
      store.refreshState();
      fixture.detectChanges();

      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(true);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(true);
    }));

    it('should disable edit when user is not online only and facility is home place ', fakeAsync(() => {
      sinon.resetHistory();
      sessionService.isOnlineOnly.returns(false);
      userSettingsService.get.resolves({ facility_id: 'district-123' });
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123', muted: true },
        type: { person: true },
        summary: { context: 'test' },
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      fixture.detectChanges();

      component.ngOnInit();
      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(false);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(false);
    }));

    it('should enable edit when user is not online only and facility is not home place ', fakeAsync(() => {
      sinon.resetHistory();
      sessionService.isOnlineOnly.returns(false);

      component.userSettings = { facility_id: 'district-9' };
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123', muted: true },
        type: { person: true },
        summary: { context: 'test' },
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      fixture.detectChanges();

      component.ngOnInit();
      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(false);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(true);
    }));

    it('should enable delete when selected contact has no children', fakeAsync(() => {
      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContactChildren, [
        { contacts: [], type: { id: 'type1', person: true } },
        { contact: [], type: { id: 'type2', person: false } },
      ]);
      component.userSettings = { facility_id: 'other-district' };
      store.refreshState();
      fixture.detectChanges();

      component.ngOnInit();
      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(true);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(true);
    }));

    it('should filter contact types to allowed ones from all contact forms', fakeAsync(() => {
      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123', muted: true },
        type: { person: true },
        summary: { context: 'test' },
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      contactTypesService.getChildren.resolves([
        {
          id: 'type1',
          create_form: 'form:contact:create:type1',
        },
        {
          id: 'type2',
          create_form: 'form:contact:create:type2',
        },
        {
          id: 'type3',
          create_form: 'form:contact:create:type3',
        },
      ]);
      const forms = [
        { _id: 'form:contact:create:type3' },
        { _id: 'form:contact:create:type2' },
      ];

      component.ngOnInit();
      flush();

      expect(xmlFormsService.subscribe.callCount).to.equal(2);
      expect(xmlFormsService.subscribe.args[0][0]).to.equal('SelectedContactChildrenForms');
      expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ contactForms: true });

      xmlFormsService.subscribe.args[0][2](null, forms);

      expect(globalActions.updateRightActionBar.callCount).to.equal(1);
      expect(globalActions.updateRightActionBar.args[0][0]).to.deep.equal({
        childTypes: [
          {
            menu_icon: 'fa-building',
            menu_key: 'Add place',
            permission: 'can_create_places',
            types: [
              {
                create_form: 'form:contact:create:type2',
                id: 'type2'
              },
              {
                create_form: 'form:contact:create:type3',
                id: 'type3'
              }
            ]
          }
        ]
      });

      expect(fastActionButtonService.getContactRightSideActions.calledTwice).to.be.true;
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].xmlReportForms).to.be.undefined;
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].parentFacilityId).to.equal('district-123');
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].communicationContext.sendTo).to.deep.equal({
        _id: 'district-123',
        phone: '123',
        muted: true
      });
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].childContactTypes).to.have.deep.members([
        { create_form: 'form:contact:create:type2', id: 'type2', permission: 'can_create_places' },
        { create_form: 'form:contact:create:type3', id: 'type3', permission: 'can_create_places' },
      ]);
    }));

    it('should set relevant report forms based on the selected contact when muted', fakeAsync(() => {
      sinon.resetHistory();
      const forms = [
        { _id: 'form:test_report_type3', title: 'Type 3', internalId: 3, icon: 'a' },
        { _id: 'form:test_report_type2', title: 'Type 2', internalId: 2, icon: 'b' },
      ];
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123', muted: true },
        type: { person: true },
        summary: { context: 'test' },
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      fixture.detectChanges();
      contactMutedService.getMuted.returns(true);
      mutingTransition.isUnmuteForm
        .withArgs(2).returns(true)
        .withArgs(3).returns(false);

      component.ngOnInit();
      flush();

      expect(xmlFormsService.subscribe.callCount).to.equal(2);
      expect(xmlFormsService.subscribe.args[1][0]).to.equal('SelectedContactReportForms');
      expect(xmlFormsService.subscribe.args[1][1]).to.deep.equal({
        reportForms: true,
        contactSummary: 'test',
        doc: { _id: 'district-123', phone: '123', muted: true }
      });

      xmlFormsService.subscribe.args[1][2](null, forms);

      expect(globalActions.updateRightActionBar.callCount).to.equal(1);
      expect(globalActions.updateRightActionBar.args[0][0]).to.deep.equal({
        relevantForms: [
          {
            id: 'form:test_report_type2',
            code: 2,
            icon: 'b',
            showUnmuteModal: false,
            title: 'Type 2',
            titleKey: undefined,
          },
          {
            id: 'form:test_report_type3',
            code: 3,
            icon: 'a',
            showUnmuteModal: true,
            title: 'Type 3',
            titleKey: undefined,
          }
        ]
      });
      expect(mutingTransition.isUnmuteForm.callCount).to.equal(2);
      expect(mutingTransition.isUnmuteForm.args).to.have.deep.members([
        [2, settings],
        [3, settings],
      ]);

      expect(fastActionButtonService.getContactRightSideActions.calledTwice).to.be.true;
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].parentFacilityId).to.equal('district-123');
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].childContactTypes).to.be.undefined;
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].xmlReportForms).to.have.deep.members([
        {
          id: 'form:test_report_type2',
          code: 2,
          icon: 'b',
          showUnmuteModal: false,
          title: 'Type 2',
          titleKey: undefined,
        },
        {
          id: 'form:test_report_type3',
          code: 3,
          icon: 'a',
          showUnmuteModal: true,
          title: 'Type 3',
          titleKey: undefined,
        }
      ]);
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].communicationContext.sendTo).to.deep.equal({
        _id: 'district-123',
        phone: '123',
        muted: true
      });
    }));

    it('should set relevant report forms based on the selected contact when not muted', fakeAsync(() => {
      sinon.resetHistory();
      const forms = [
        { _id: 'form:test_report_type3', title: 'Type 3', internalId: 3, icon: 'a' },
        { _id: 'form:test_report_type2', title: 'Type 2', internalId: 2, icon: 'b' },
      ];
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123' },
        type: { person: true },
        summary: { context: 'test' },
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      fixture.detectChanges();
      contactMutedService.getMuted.returns(false);
      mutingTransition.isUnmuteForm
        .withArgs(2).returns(true)
        .withArgs(3).returns(false);

      component.ngOnInit();
      flush();

      expect(xmlFormsService.subscribe.callCount).to.equal(2);
      expect(xmlFormsService.subscribe.args[1][0]).to.equal('SelectedContactReportForms');
      expect(xmlFormsService.subscribe.args[1][1]).to.deep.equal({
        reportForms: true,
        contactSummary: 'test',
        doc: { _id: 'district-123', phone: '123' }
      });

      xmlFormsService.subscribe.args[1][2](null, forms);

      expect(globalActions.updateRightActionBar.callCount).to.equal(1);
      expect(globalActions.updateRightActionBar.args[0][0]).to.deep.equal({
        relevantForms: [
          {
            id: 'form:test_report_type2',
            code: 2,
            icon: 'b',
            showUnmuteModal: false,
            title: 'Type 2',
            titleKey: undefined,
          },
          {
            id: 'form:test_report_type3',
            code: 3,
            icon: 'a',
            showUnmuteModal: false,
            title: 'Type 3',
            titleKey: undefined,
          }
        ]
      });

      expect(fastActionButtonService.getContactRightSideActions.calledTwice).to.be.true;
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].parentFacilityId).to.equal('district-123');
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].childContactTypes).to.be.undefined;
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].xmlReportForms).to.have.deep.members([
        {
          id: 'form:test_report_type2',
          code: 2,
          icon: 'b',
          showUnmuteModal: false,
          title: 'Type 2',
          titleKey: undefined,
        },
        {
          id: 'form:test_report_type3',
          code: 3,
          icon: 'a',
          showUnmuteModal: false,
          title: 'Type 3',
          titleKey: undefined,
        }
      ]);
      expect(fastActionButtonService.getContactRightSideActions.args[1][0].communicationContext.sendTo).to.deep.equal({
        _id: 'district-123',
        phone: '123',
      });
    }));

    it('should update action bar forms list when contact summary changes', fakeAsync(() => {
      flush();

      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContactSummary, {});
      store.refreshState();

      expect(globalActions.setRightActionBar.callCount).to.equal(0);
      expect(fastActionButtonService.getContactRightSideActions.notCalled).to.be.true;
      expect(xmlFormsService.subscribe.callCount).to.equal(1);
      expect(xmlFormsService.subscribe.args[0][0]).to.equal('SelectedContactReportForms');

      const forms = [
        { _id: 'form:test_report_type3', title: 'Type 3', internalId: 3, icon: 'a' },
        { _id: 'form:test_report_type2', title: 'Type 2', internalId: 2, icon: 'b' },
      ];

      xmlFormsService.subscribe.args[0][2](null, forms);

      expect(globalActions.updateRightActionBar.callCount).to.equal(1);
      expect(globalActions.updateRightActionBar.args[0][0]).to.deep.equal({
        relevantForms: [
          {
            id: 'form:test_report_type2',
            code: 2,
            icon: 'b',
            showUnmuteModal: undefined,
            title: 'Type 2',
            titleKey: undefined,
          },
          {
            id: 'form:test_report_type3',
            code: 3,
            icon: 'a',
            showUnmuteModal: undefined,
            title: 'Type 3',
            titleKey: undefined,
          }
        ]
      });

      expect(fastActionButtonService.getContactRightSideActions.calledOnce).to.be.true;
      expect(fastActionButtonService.getContactRightSideActions.args[0][0].xmlReportForms).to.have.deep.members([
        {
          id: 'form:test_report_type2',
          code: 2,
          icon: 'b',
          showUnmuteModal: undefined,
          title: 'Type 2',
          titleKey: undefined,
        },
        {
          id: 'form:test_report_type3',
          code: 3,
          icon: 'a',
          showUnmuteModal: undefined,
          title: 'Type 3',
          titleKey: undefined,
        }
      ]);
    }));

    it('should not set relevant report forms when summary is not loaded yet', fakeAsync(() => {
      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContact, {
        doc: { _id: 'district-123', phone: '123', muted: true },
        type: { person: true },
        summary: undefined,
        children: [],
        tasks: [],
        reports: []
      });
      store.refreshState();
      fixture.detectChanges();

      component.ngOnInit();
      flush();

      expect(xmlFormsService.subscribe.callCount).to.equal(1);
      expect(xmlFormsService.subscribe.args[0][0]).to.equal('SelectedContactChildrenForms');
    }));
  });

});
