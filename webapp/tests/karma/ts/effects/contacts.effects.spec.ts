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

describe('Contacts effects', () => {
  let effects: ContactsEffects;
  let actions$;
  let contactViewModelGeneratorService;
  let translateService;
  let contactSummaryService;
  let store;
  let targetAggregateService;
  let tasksForContactService;

  beforeEach(async() => {
    actions$ = new Observable<Action>();
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: {} }
    ];

    contactViewModelGeneratorService = {
      getContact: sinon.stub().resolves(),
      loadChildren: sinon.stub().resolves(),
      loadReports: sinon.stub().resolves(),
    };
    translateService = { instant: sinon.stub().returnsArg(0) };
    contactSummaryService = { get: sinon.stub().resolves() };
    targetAggregateService = { getCurrentTargetDoc: sinon.stub().resolves() };
    tasksForContactService = { get: sinon.stub().resolves() };

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
      ]
    });

    effects = TestBed.inject(ContactsEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('selectContact', () => {
    it('should skip when no provided id', async (() => {
      actions$ = of(ContactActionList.selectContact({  }));
      effects.selectContact.subscribe();

      expect(contactViewModelGeneratorService.getContact.callCount).to.equal(0);

    }));

    it('should load the contact when not silent', async () => {
      actions$ = of(ContactActionList.selectContact({ id: 'contactid', silent: false }));
      const setSelected = sinon.stub(ContactsActions.prototype, 'setSelectedContact');
      contactViewModelGeneratorService.getContact.resolves({ _id: 'contactid', model: 'contact model' });

      await effects.selectContact.toPromise();

      expect(setSelected.callCount).to.equal(1);
      expect(setSelected.args[0]).to.deep.equal([{ _id: 'contactid', model: 'contact model' }]);
    });

    it('should load the contact when silent', async () => {
      actions$ = of(ContactActionList.selectContact({ id: 'contactid', silent: true }));
      const setSelected = sinon.stub(ContactsActions.prototype, 'setSelectedContact');
      contactViewModelGeneratorService.getContact.resolves({ _id: 'contactid', model: 'contact model' });

      await effects.selectContact.toPromise();

      expect(setSelected.callCount).to.equal(1);
      expect(setSelected.args[0]).to.deep.equal([{ _id: 'contactid', model: 'contact model' }]);
    });
  });

  describe('setSelected', () => {
    let settingSelected;
    let setLoadingSelectedContact;
    let setContactsLoadingSummary;
    let clearCancelCallback;
    let unsetSelected;

    beforeEach(() => {
      settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');
      setLoadingSelectedContact = sinon.stub(ContactsActions.prototype, 'setLoadingSelectedContact');
      setContactsLoadingSummary = sinon.stub(ContactsActions.prototype, 'setContactsLoadingSummary');
      clearCancelCallback = sinon.stub(GlobalActions.prototype, 'clearCancelCallback');
      unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
    });

    it('should not call other actions if no contact is selelected', () => {
      store.overrideSelector(Selectors.getSelectedContact, null);
      actions$ = of(ContactActionList.setSelectedContact(null));
      effects.setSelectedContact.subscribe();

      expect(settingSelected.callCount).to.equal(0);
      expect(setLoadingSelectedContact.callCount).to.equal(0);
      expect(setContactsLoadingSummary.callCount).to.equal(0);
      expect(clearCancelCallback.callCount).to.equal(0);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(0);
    });

    it('should call the right actions actions if a contact is selelected', () => {
      store.overrideSelector(Selectors.getSelectedContact, { _id: 'contactid', doc: { _id: 'contactid' } });
      actions$ = of(ContactActionList.setSelectedContact({ _id: 'contactid', doc: {} }));
      effects.setSelectedContact.subscribe();

      expect(settingSelected.callCount).to.equal(1);
      expect(setLoadingSelectedContact.callCount).to.equal(1);
      expect(setContactsLoadingSummary.callCount).to.equal(1);
      expect(clearCancelCallback.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(settingSelected.args[0][0]).to.equal(false);
      expect(setContactsLoadingSummary.args[0][0]).to.equal(true);
      expect(contactViewModelGeneratorService.loadChildren.args[0][0]).to.deep.equal(
        { _id: 'contactid', doc: { _id: 'contactid' } }
      );
      expect(contactViewModelGeneratorService.loadChildren.args[0][1]).to.deep.equal(
        { getChildPlaces: true }
      );
    });

    it('should catch loadChildren errors', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      contactViewModelGeneratorService.loadChildren.rejects({ error: 'we have a problem' });
      actions$ = of(ContactActionList.setSelectedContact({ _id: 'contactid', doc: {} }));
      effects.setSelectedContact.subscribe();
      flush();

      expect(contactViewModelGeneratorService.loadChildren.callCount).to.equal(1);
      expect(unsetSelected.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error fetching children');
    }));
  });

  describe('receiveSelectedContactReports', () => {
    let unsetSelected;
    let receiveSelectedContactReports;

    beforeEach(() => {
      unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      receiveSelectedContactReports = sinon.stub(ContactsActions.prototype, 'receiveSelectedContactReports');
    });

    it('should catch loadReports errors', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      contactViewModelGeneratorService.loadReports.rejects({ error: 'we have a problem'});
      actions$ = of(ContactActionList.receiveSelectedContactChildren([]));
      effects.receiveSelectedContactReports.subscribe();
      flush();

      expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
      expect(unsetSelected.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error loading reports');
    }));

    it('should call the receiveSelectedContactReports action', fakeAsync(() => {
      actions$ = of(ContactActionList.receiveSelectedContactChildren([]));
      effects.receiveSelectedContactReports.subscribe();
      flush();

      expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
      expect(receiveSelectedContactReports.callCount).to.equal(1);
    }));
  });

  describe('updateSelectedContactSummary', () => {
    let updateSelectedContactsTasks;
    let setContactsLoadingSummary;
    let updateSelectedContactSummary;
    let unsetSelected;

    beforeEach(() => {
      updateSelectedContactsTasks = sinon.stub(ContactsActions.prototype, 'updateSelectedContactsTasks');
      setContactsLoadingSummary = sinon.stub(ContactsActions.prototype, 'setContactsLoadingSummary');
      updateSelectedContactSummary = sinon.stub(ContactsActions.prototype, 'updateSelectedContactSummary');
      unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
    });

    it('should call the right actions', fakeAsync(() => {
      contactSummaryService.get.resolves({ summary: 'summary here'});
      tasksForContactService.get.resolves(['task 1', 'task 2']);
      actions$ = of(ContactActionList.receiveSelectedContactReports([]));
      effects.updateSelectedContactSummary.subscribe();
      flush();

      expect(updateSelectedContactSummary.callCount).to.equal(1);
      expect(updateSelectedContactsTasks.callCount).to.equal(1);
      expect(setContactsLoadingSummary.callCount).to.equal(2);
      expect(setContactsLoadingSummary.args[0][0]).to.equal(true);
      expect(setContactsLoadingSummary.args[1][0]).to.equal(false);
      expect(updateSelectedContactSummary.args[0][0]).to.deep.equal({ summary: 'summary here'});
      expect(updateSelectedContactsTasks.args[0][0]).to.deep.equal(['task 1', 'task 2']);
    }));

    it('should catch contactSummaryService errors', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      contactSummaryService.get.rejects({ error: 'we have a problem'});
      actions$ = of(ContactActionList.receiveSelectedContactReports([]));
      effects.updateSelectedContactSummary.subscribe();
      flush();

      expect(contactSummaryService.get.callCount).to.equal(1);
      expect(unsetSelected.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error loading summary');
    }));
  });

  describe('receiveSelectedContactTargetDoc', () => {
    it('should call the receiveSelectedContactTargetDoc action', fakeAsync(() => {
      const receiveSelectedContactTargetDoc = sinon.stub(ContactsActions.prototype, 'receiveSelectedContactTargetDoc');
      actions$ = of(ContactActionList.updateSelectedContactSummary({}));
      effects.receiveSelectedContactTargetDoc.subscribe();
      flush();

      expect(receiveSelectedContactTargetDoc.callCount).to.equal(1);
    }));

    it('should catch targetAggregateService errors', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      targetAggregateService.getCurrentTargetDoc.rejects({ error: 'we have a problem'});
      actions$ = of(ContactActionList.updateSelectedContactSummary({}));
      effects.receiveSelectedContactTargetDoc.subscribe();
      flush();

      expect(targetAggregateService.getCurrentTargetDoc.callCount).to.equal(1);
      expect(unsetSelected.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error loading target doc');
    }));
  });
});
