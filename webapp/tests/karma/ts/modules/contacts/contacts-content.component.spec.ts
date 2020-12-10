import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { ActivatedRoute, Router } from '@angular/router';

import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
// import { SettingsService } from '@mm-services/settings.service';
// import { GlobalActions } from '@mm-actions/global';
import { ContactsActions } from '@mm-actions/contacts';
import { Selectors } from '@mm-selectors/index';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { FilterReportsPipe } from '@mm-pipes/contacts.pipe';
import { ChangesService } from '@mm-services/changes.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';

describe('Contacts content component', () => {
  let component: ContactsContentComponent;
  let fixture: ComponentFixture<ContactsContentComponent>;
  let store: MockStore;
  let activatedRoute;
  let router;
  let changesService;
  let contactChangeFilterService;
  let selectedContact;


  beforeEach(async(() => {
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
      { selector: Selectors.getLoadingSelectedContactChildren, value: false },
      { selector: Selectors.getForms, value: [] },
      { selector: Selectors.getLoadingContent, value: false },
      { selector: Selectors.getLoadingSelectedContactReports, value: false },
      { selector: Selectors.getContactsLoadingSummary, value: false },
    ];
    activatedRoute = { params: { subscribe: sinon.stub() }, snapshot: { params: {} } };
    router = { navigate: sinon.stub() };
    changesService = { subscribe: sinon.stub().resolves(of({})) };
    contactChangeFilterService = {
      matchContact: sinon.stub(),
      isRelevantContact: sinon.stub(),
      isRelevantReport: sinon.stub(),
      isDeleted: sinon.stub(),
    };

    return TestBed
      .configureTestingModule({
        declarations: [ ContactsContentComponent, ResourceIconPipe, FilterReportsPipe ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ActivatedRoute, useValue: activatedRoute },
          { provide: Router, useValue: router },
          { provide: ResourceIconPipe, useValue: { transform: sinon.stub() } },
          { provide: ResourceIconsService, useValue: { getImg: sinon.stub() } },
          { provide: ContactChangeFilterService, useValue: contactChangeFilterService },
          { provide: ChangesService, useValue: changesService },
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

  it('should create ReportsContentComponent', () => {
    expect(component).to.exist;
  });

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

    it('updates information when selected contact is updated', () => {
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

    it('redirects to parent when selected contact is deleted', () => {
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

    it('clears when selected contact is deleted and has no parent', () => {
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const changesFilter = changesService.subscribe.args[0][0].filter;
      contactChangeFilterService.matchContact.returns(true);
      contactChangeFilterService.isDeleted.returns(true);

      expect(changesFilter(change)).to.equal(true);
      changesCallback(change);
      expect(contactChangeFilterService.matchContact.callCount).to.equal(2);
      expect(router.navigate.callCount).to.equal(1);
    });

    it('updates information when relevant contact change is received', () => {
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

    it('updates information when relevant report change is received', () => {
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

});
