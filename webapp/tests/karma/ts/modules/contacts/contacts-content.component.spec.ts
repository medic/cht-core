import { async, ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
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
import { FilterReportsPipe } from '@mm-pipes/contacts.pipe';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { GlobalActions } from '@mm-actions/global';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { SessionService } from '@mm-services/session.service';
import { ContactTypesService } from '@mm-services/contact-types.service';

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


  beforeEach(async(() => {
    changesService = { subscribe: sinon.stub().resolves(of({})) };
    contactChangeFilterService = {
      matchContact: sinon.stub(),
      isRelevantContact: sinon.stub(),
      isRelevantReport: sinon.stub(),
      isDeleted: sinon.stub(),
    };
    settingsService = { get: sinon.stub().resolves([]) };
    xmlFormsService = { subscribe: sinon.stub() };
    translateFromService = { get: sinon.stub().returnsArg(0) };
    modalService = { show: sinon.stub().resolves() };
    sessionService = {
      isDbAdmin: sinon.stub().returns(false),
      isAdmin: sinon.stub().returns(false)
    };
    changesService = {
      subscribe: sinon.stub().resolves(of({}))
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
      updateRightActionBar: sinon.spy(GlobalActions.prototype, 'updateRightActionBar')
    };

    selectedContact = {
      doc: { _id: 'district-123', phone: '123', muted: true },
      type: { person: true },
      summary: { context: 'test' },
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
    ];
    activatedRoute = { params: of({ id: 'load contact' }), snapshot: { params: { id: 'load contact'} } };
    router = { navigate: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [ ContactsContentComponent, ResourceIconPipe, FilterReportsPipe ],
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
    sinon.restore();
  });

  it('should create ContactsContentComponent', () => {
    expect(component).to.exist;
  });

  describe('load the user home place on mobile', () => {
    let original;

    beforeEach(() => {
      original = window.jQuery;
    });

    afterEach(() => {
      window.jQuery = original;
    });

    it(`should not load the user's home place when on mobile`, fakeAsync(() => {
      const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
      store.overrideSelector(Selectors.getUserFacilityId, 'homeplace');
      window.jQuery = sinon.stub();
      window.jQuery.withArgs('#mobile-detection').returns({ css: () => 'inline' });
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
    component.ngOnInit();
    flush();

    expect(selectContact.callCount).to.equal(1);
    expect(selectContact.args[0][0]).to.equal('load contact');
  }));

  it(`should load the user's home place when a param id not set`, fakeAsync(() => {
    const selectContact = sinon.stub(ContactsActions.prototype, 'selectContact');
    store.overrideSelector(Selectors.getUserFacilityId, 'homeplace');
    activatedRoute.params = of({});
    activatedRoute.snapshot.params = {};
    component.ngOnInit();
    flush();

    expect(selectContact.callCount).to.equal(1);
    expect(selectContact.args[0][0]).to.equal('homeplace');
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
      expect(router.navigate.args[0][0][0]).to.equal('/contacts/parent_id');
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
    }));

    it('should not initialise action bar when there is not selected contact', fakeAsync(() => {
      sinon.resetHistory();
      store.overrideSelector(Selectors.getSelectedContactChildren, undefined);
      store.overrideSelector(Selectors.getSelectedContactDoc, undefined);
      store.refreshState();
      fixture.detectChanges();

      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(0);
      expect(xmlFormsService.subscribe.callCount).to.equal(0);
      expect(userSettingsService.get.callCount).to.equal(0);
      expect(settingsService.get.callCount).to.equal(0);
      expect(contactTypesService.getChildren.callCount).to.equal(0);
    }));

    it('should enable edit and delete in the right action bar when admin user', fakeAsync(() => {
      sinon.resetHistory();
      sessionService.isAdmin.returns(true);
      store.overrideSelector(Selectors.getSelectedContactChildren, {
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
        { _id: '1', contacts: [], type: {} },
        { _id: '2', type: {} }
      ]);
      store.refreshState();
      fixture.detectChanges();

      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(true);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(true);
    }));

    it('should disable edit when user is not admin and facility is home place ', fakeAsync(() => {
      sinon.resetHistory();
      sessionService.isAdmin.returns(false);
      userSettingsService.get.resolves({ facility_id: 'district-123' });

      component.ngOnInit();
      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(false);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(false);
    }));

    it('should enable edit when user is not admin and facility is not home place ', fakeAsync(() => {
      sinon.resetHistory();
      sessionService.isAdmin.returns(false);
      component.userSettings = { facility_id: 'district-9' };

      component.ngOnInit();
      flush();

      expect(globalActions.setRightActionBar.callCount).to.equal(1);
      expect(globalActions.setRightActionBar.args[0][0].canDelete).to.equal(false);
      expect(globalActions.setRightActionBar.args[0][0].canEdit).to.equal(true);
    }));

    it('should filter contact types to allowed ones from all contact forms', fakeAsync(() => {
      sinon.resetHistory();
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
      expect(xmlFormsService.subscribe.args[0][0]).to.equal('ContactsReportsForms');
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
    }));

    it('should set relevant report forms based on the selected contact', fakeAsync(() => {
      sinon.resetHistory();
      contactTypesService.getChildren.resolves([
        {
          id: 'type1',
          create_form: 'form:test_report:type1',
        },
        {
          id: 'type2',
          create_form: 'form:test_report:type2',
        },
        {
          id: 'type3',
          create_form: 'form:test_report:type3',
        },
      ]);
      const forms = [
        { _id: 'form:test_report:type3', title: 'Type 3', internalId: 3, icon: 'a' },
        { _id: 'form:test_report:type2', title: 'Type 2', internalId: 2, icon: 'b' },
      ];

      component.ngOnInit();
      flush();

      expect(xmlFormsService.subscribe.callCount).to.equal(2);
      expect(xmlFormsService.subscribe.args[1][0]).to.equal('selectedContactForms');
      expect(xmlFormsService.subscribe.args[1][1]).to.deep.equal({
        contactForms: false,
        contactSummary: 'test',
        doc: { _id: 'district-123', phone: '123', muted: true }
      });

      xmlFormsService.subscribe.args[1][2](null, forms);

      expect(globalActions.updateRightActionBar.callCount).to.equal(1);
      expect(globalActions.updateRightActionBar.args[0][0]).to.deep.equal({
        relevantForms: [
          {
            code: 2,
            icon: 'b',
            showUnmuteModal: true,
            title: 'Type 2',
          },
          {
            code: 3,
            icon: 'a',
            showUnmuteModal: true,
            title: 'Type 3',
          }
        ]
      });
    }));
  });

});
