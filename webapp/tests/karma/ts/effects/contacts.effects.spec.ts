import { provideMockActions } from '@ngrx/effects/testing';
import { async, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { Action } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { TranslateService } from '@ngx-translate/core';

import { Actions as ContactActionList, ContactsActions } from '@mm-actions/contacts';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';

describe('Contacts effects', () => {
  let effects: ContactsEffects;
  let actions$;
  let contactViewModelGeneratorService;
  let translateService;
  let contactSummaryService;
  let store;
  let targetAggregateService;
  let tasksForContactService;
  let routeSnapshotService;

  beforeEach(async() => {
    actions$ = new Observable<Action>();
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: null },
      { selector: Selectors.getForms, value: [] },
      { selector: Selectors.getUserFacilityId, value: 'facility_id' },
    ];
    routeSnapshotService = { get: sinon.stub().returns({ data: { name: 'contacts.detail' }}) };
    contactViewModelGeneratorService = {
      getContact: sinon.stub().resolves({ _id: 'contact', doc: { _id: 'contact' } }),
      loadChildren: sinon.stub().resolves([]),
      loadReports: sinon.stub().resolves([]),
    };
    translateService = { instant: sinon.stub().returnsArg(0) };
    contactSummaryService = { get: sinon.stub().resolves({ cards: [], fields: [] }) };
    targetAggregateService = { getCurrentTargetDoc: sinon.stub().resolves() };
    tasksForContactService = { get: sinon.stub().resolves([]) };

    TestBed.configureTestingModule({
      imports: [
        EffectsModule.forRoot([ContactsEffects]),
      ],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ContactViewModelGeneratorService, useValue: contactViewModelGeneratorService },
        { provide: TranslateService, useValue: translateService },
        { provide: ContactSummaryService, useValue: contactSummaryService },
        { provide: TargetAggregatesService, useValue: targetAggregateService },
        { provide: TasksForContactService, useValue: tasksForContactService },
        { provide: RouteSnapshotService, useValue: routeSnapshotService },
      ]
    });

    effects = TestBed.inject(ContactsEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('selectContact', () => {
    let setLoadingSelectedContact;
    let setContactsLoadingSummary;
    let clearSelection;

    const simulateContactsReducer = () => {
      let selectedContact = null;

      const refreshState = () => {
        store.overrideSelector(Selectors.getSelectedContact, selectedContact);
        store.refreshState();
      };
      refreshState();


      sinon.stub(ContactsActions.prototype, 'setSelectedContact').callsFake(model => {
        selectedContact = model;
        refreshState();
      });

      sinon.stub(ContactsActions.prototype, 'receiveSelectedContactChildren').callsFake(children => {
        selectedContact = { ...selectedContact, children };
        refreshState();
      });

      sinon.stub(ContactsActions.prototype, 'receiveSelectedContactReports').callsFake(reports => {
        selectedContact = { ...selectedContact, reports };
        refreshState();
      });

      sinon.stub(ContactsActions.prototype, 'receiveSelectedContactTargetDoc').callsFake(targetDoc => {
        selectedContact = { ...selectedContact, targetDoc };
        refreshState();
      });

      sinon.stub(ContactsActions.prototype, 'updateSelectedContactsTasks').callsFake(tasks => {
        selectedContact = { ...selectedContact, tasks };
        refreshState();
      });

      sinon.stub(ContactsActions.prototype, 'updateSelectedContactSummary').callsFake(summary => {
        selectedContact = { ...selectedContact, summary };
        refreshState();
      });
    };

    beforeEach(() => {
      setLoadingSelectedContact = sinon.stub(ContactsActions.prototype, 'setLoadingSelectedContact');
      setContactsLoadingSummary = sinon.stub(ContactsActions.prototype, 'setContactsLoadingSummary');
      simulateContactsReducer();
    });

    it('should deselect when no provided id', async (() => {
      clearSelection = sinon.stub(ContactsActions.prototype, 'clearSelection');
      actions$ = of(ContactActionList.selectContact({  }));
      effects.selectContact.subscribe();

      expect(clearSelection.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(0);
    }));

    it('should load the contact when not silent', async () => {
      actions$ = of(ContactActionList.selectContact({ id: 'contactid', silent: false }));
      const setSelected:any = ContactsActions.prototype.setSelectedContact;
      const setLoadingShowContent = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');

      contactViewModelGeneratorService.getContact.resolves({ _id: 'contactid', model: 'contact model' });

      await effects.selectContact.toPromise();

      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.getContact.args[0]).to.deep.equal(['contactid', { merge: false }]);
      expect(setSelected.callCount).to.equal(1);
      expect(setSelected.args[0]).to.deep.equal([{ _id: 'contactid', model: 'contact model' }]);
      expect(setLoadingShowContent.callCount).to.equal(1);
      expect(setLoadingSelectedContact.callCount).to.equal(1);
      expect(setContactsLoadingSummary.callCount).to.equal(2);
      expect(setContactsLoadingSummary.args).to.deep.equal([[true], [false]]);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([false]);
    });

    it('should load the contact when silent and refreshing', async () => {
      store.overrideSelector(Selectors.getSelectedContact, { _id: 'contactid' }); // same selected contact
      store.refreshState();

      actions$ = of(ContactActionList.selectContact({ id: 'contactid', silent: true }));
      const setSelected:any = ContactsActions.prototype.setSelectedContact;
      const setLoadingShowContent = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      contactViewModelGeneratorService.getContact.resolves({ _id: 'contactid', model: 'contact model' });
      const settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');

      await effects.selectContact.toPromise();

      expect(setSelected.callCount).to.equal(1);
      expect(setSelected.args[0]).to.deep.equal([{ _id: 'contactid', model: 'contact model' }]);
      expect(setLoadingShowContent.callCount).to.equal(0);
      expect(setLoadingSelectedContact.callCount).to.equal(0);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([true]);
    });

    it('should handle missing contacts', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      const setSelectedContact:any = ContactsActions.prototype.setSelectedContact;
      contactViewModelGeneratorService.getContact.rejects({ code: 404, error: 'not found'});
      actions$ = of(ContactActionList.selectContact({ id: 'contactid', silent: false }));
      effects.selectContact.subscribe();
      flush();

      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error selecting contact');
      expect(setSnackbarContent.callCount).to.equal(1);
      expect(unsetSelected.callCount).to.equal(1);
      expect(setSelectedContact.callCount).to.equal(1);
      expect(setSelectedContact.args[0][0]).to.equal(null);
      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
      expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(0);
      expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(0);
      expect(contactSummaryService.get.callCount).to.equal(0);
    }));

    describe('loading children', () => {
      it('should load children', async () => {
        contactViewModelGeneratorService.getContact.resolves({ _id: 'contact', doc: { _id: 'contact' } });
        contactViewModelGeneratorService.loadChildren.resolves([
          { type: { id: 'person' }, contacts: [{ _id: 'person1' }] },
          { type: { id: 'place' }, contacts: [{ _id: 'place' }] },
        ]);

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([
          { _id: 'contact', doc: { _id: 'contact' } },
          { getChildPlaces: true },
        ]);
        const receiveSelectedContactChildren:any = ContactsActions.prototype.receiveSelectedContactChildren;
        expect(receiveSelectedContactChildren.callCount).to.equal(1);
        expect(receiveSelectedContactChildren.args[0]).to.deep.equal([[
          { type: { id: 'person' }, contacts: [{ _id: 'person1' }] },
          { type: { id: 'place' }, contacts: [{ _id: 'place' }] },
        ]]);
      });

      it('should not load child places for user facility', async () => {
        store.overrideSelector(Selectors.getUserFacilityId, 'facility');
        store.refreshState();

        contactViewModelGeneratorService.getContact.resolves({ _id: 'facility', doc: { _id: 'facility' } });
        contactViewModelGeneratorService.loadChildren.resolves([
          { type: { id: 'patient' }, contacts: [{ _id: 'person1' }] },
        ]);

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadChildren.args[0]).to.deep.equal([
          { _id: 'facility', doc: { _id: 'facility' } },
          { getChildPlaces: false },
        ]);
        const receiveSelectedContactChildren:any = ContactsActions.prototype.receiveSelectedContactChildren;
        expect(receiveSelectedContactChildren.callCount).to.equal(1);
        expect(receiveSelectedContactChildren.args[0]).to.deep.equal([[
          { type: { id: 'patient' }, contacts: [{ _id: 'person1' }] },
        ]]);
      });

      it('should handle errors when loading children', async () => {
        sinon.stub(console, 'error');
        const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
        const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
        contactViewModelGeneratorService.loadChildren.rejects({ code: 400 });
        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(0);
        expect(tasksForContactService.get.callCount).to.equal(0);
        expect(contactSummaryService.get.callCount).to.equal(0);
        expect(setSnackbarContent.callCount).to.equal(0);
        expect(unsetSelected.callCount).to.equal(1);
      });
    });

    describe('loading reports', () => {
      it('should load reports after loading children', async () => {
        store.overrideSelector(Selectors.getForms, [{ id: 'form1' }]);
        contactViewModelGeneratorService.getContact.resolves({ _id: 'place', doc: { _id: 'place' } });
        contactViewModelGeneratorService.loadChildren.resolves([
          { type: { id: 'person' }, contacts: [{ _id: 'person1' }] },
          { type: { id: 'place' }, contacts: [{ _id: 'place' }] },
        ]);
        contactViewModelGeneratorService.loadReports.resolves([{ _id: 'report1' }]);

        actions$ = of(ContactActionList.selectContact({ id: 'place' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadReports.args[0]).to.deep.equal([
          {
            _id: 'place',
            doc: { _id: 'place' },
            children: [
              { type: { id: 'person' }, contacts: [{ _id: 'person1' }] },
              { type: { id: 'place' }, contacts: [{ _id: 'place' }] },
            ],
          },
          [{ id: 'form1' }],
        ]);

        const receiveSelectedContactReports:any = ContactsActions.prototype.receiveSelectedContactReports;
        expect(receiveSelectedContactReports.callCount).to.equal(1);
        expect(receiveSelectedContactReports.args[0]).to.deep.equal([[{ _id: 'report1' }]]);
      });

      it('should handle errors when loading reports', async () => {
        sinon.stub(console, 'error');
        const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
        const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
        contactViewModelGeneratorService.loadReports.rejects({ code: 400 });

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
        expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(0);
        expect(tasksForContactService.get.callCount).to.equal(0);
        expect(setSnackbarContent.callCount).to.equal(0);
        expect(unsetSelected.callCount).to.equal(1);
      });
    });

    describe('loading targetDoc', () => {
      it('should load targetDoc after loading reports', async () => {
        contactViewModelGeneratorService.getContact.resolves({ _id: 'person', doc: { _id: 'person' } });
        contactViewModelGeneratorService.loadChildren.resolves([]);
        contactViewModelGeneratorService.loadReports.resolves([{ _id: 'report' }]);
        targetAggregateService.getCurrentTargetDoc.resolves({ _id: 'targetDoc' });

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(1);
        expect(targetAggregateService.getCurrentTargetDoc.args[0]).to.deep.equal([{
          _id: 'person',
          doc: { _id: 'person' },
          children: [],
          reports: [{ _id: 'report' }],
        }]);
        const receiveSelectedContactTargetDoc:any = ContactsActions.prototype.receiveSelectedContactTargetDoc;
        expect(receiveSelectedContactTargetDoc.callCount).to.equal(1);
        expect(receiveSelectedContactTargetDoc.args[0]).to.deep.equal([{ _id: 'targetDoc' }]);
      });

      it('should handle errors when loading the target doc', async () => {
        sinon.stub(console, 'error');
        const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
        const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
        targetAggregateService.getCurrentTargetDoc.rejects({ code: 400 });

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
        expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(1);
        expect(contactSummaryService.get.callCount).to.equal(0);
        expect(tasksForContactService.get.callCount).to.equal(0);
        expect(setSnackbarContent.callCount).to.equal(0);
        expect(unsetSelected.callCount).to.equal(1);
      });
    });

    describe('loading contact summary', () => {
      it('should load contact summary after loading the target doc', async () => {
        contactViewModelGeneratorService.getContact.resolves({
          _id: 'person',
          doc: { _id: 'person', parent: { _id: 'parent' } },
          lineage: [{ _id: 'parent' }, { _id: 'grandparent' }],
        });
        contactViewModelGeneratorService.loadChildren.resolves([]);
        contactViewModelGeneratorService.loadReports.resolves([{ _id: 'the_report' }]);
        targetAggregateService.getCurrentTargetDoc.resolves({ _id: 'targetDoc' });
        contactSummaryService.get.resolves({ cards: [{ id: 'card' }], fields: [{ id: 'field' }] });

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactSummaryService.get.callCount).to.equal(1);
        expect(contactSummaryService.get.args[0]).to.deep.equal([
          { _id: 'person', parent: { _id: 'parent' } },
          [{ _id: 'the_report' }],
          [{ _id: 'parent' }, { _id: 'grandparent' }],
          { _id: 'targetDoc' },
        ]);
        const updateSelectedContactSummary:any = ContactsActions.prototype.updateSelectedContactSummary;
        expect(updateSelectedContactSummary.callCount).to.equal(1);
        expect(updateSelectedContactSummary.args[0]).to.deep.equal([
          { cards: [{ id: 'card' }], fields: [{ id: 'field' }] }
        ]);
      });

      it('should handle errors when loading the contact summary', async () => {
        sinon.stub(console, 'error');
        const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
        const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
        contactSummaryService.get.rejects({ code: 400 });

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
        expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(1);
        expect(contactSummaryService.get.callCount).to.equal(1);
        expect(tasksForContactService.get.callCount).to.equal(0);
        expect(setSnackbarContent.callCount).to.equal(0);
        expect(unsetSelected.callCount).to.equal(1);
      });
    });

    describe('loading tasks', () => {
      it('should load tasks after contact summary', async () => {
        contactViewModelGeneratorService.getContact.resolves({
          _id: 'person',
          doc: { _id: 'person', parent: { _id: 'parent' } },
        });
        contactViewModelGeneratorService.loadChildren.resolves([{ type: 'a' }]);
        contactViewModelGeneratorService.loadReports.resolves([{ _id: 'the_report' }]);
        targetAggregateService.getCurrentTargetDoc.resolves({ _id: 'targetDoc' });
        contactSummaryService.get.resolves({ cards: [{ id: 'card' }], fields: [{ id: 'field' }] });
        tasksForContactService.get.resolves([{ _id: 'task1' }]);

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(tasksForContactService.get.callCount).to.equal(1);
        expect(tasksForContactService.get.args[0]).to.deep.equal([{
          _id: 'person',
          doc: { _id: 'person', parent: { _id: 'parent' } },
          children: [{ type: 'a' }],
          reports: [{ _id: 'the_report' }],
          summary: { cards: [{ id: 'card' }], fields: [{ id: 'field' }] },
          targetDoc: { _id: 'targetDoc' },
        }]);
        const updateSelectedContactsTasks:any = ContactsActions.prototype.updateSelectedContactsTasks;
        expect(updateSelectedContactsTasks.callCount).to.equal(1);
        expect(updateSelectedContactsTasks.args[0]).to.deep.equal([[{ _id: 'task1' }]]);
      });

      it('should handle errors when loading tasks', async () => {
        sinon.stub(console, 'error');
        const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
        const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
        tasksForContactService.get.rejects({ code: 400 });

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
        expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
        expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(1);
        expect(contactSummaryService.get.callCount).to.equal(1);
        expect(tasksForContactService.get.callCount).to.equal(1);
        expect(setSnackbarContent.callCount).to.equal(0);
        expect(unsetSelected.callCount).to.equal(1);
      });
    });

    describe('setting the title', () => {
      it('should set title correctly on deceased page', async () => {
        routeSnapshotService.get.returns({ data: { name: 'contacts.deceased' } });
        const setTitle = sinon.stub(GlobalActions.prototype, 'setTitle');

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(setTitle.callCount).to.equal(1);
        expect(setTitle.args[0]).to.deep.equal(['contact.deceased.title']);
      });

      it('should set title correctly when no type', async () => {
        const setTitle = sinon.stub(GlobalActions.prototype, 'setTitle');

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(setTitle.callCount).to.equal(1);
        expect(setTitle.args[0]).to.deep.equal(['contact.profile']);
      });

      it('should set title correct for contact type', async () => {
        contactViewModelGeneratorService.getContact.resolves({
          _id: 'contact',
          type: { name_key: 'this is the title' },
        });
        const setTitle = sinon.stub(GlobalActions.prototype, 'setTitle');

        actions$ = of(ContactActionList.selectContact({ id: 'contact' }));
        await effects.selectContact.toPromise();

        expect(setTitle.callCount).to.equal(1);
        expect(setTitle.args[0]).to.deep.equal(['this is the title']);
      });
    });
  });
});
