import { Store, createAction } from '@ngrx/store';

import { createSingleValueAction, createMultiValueAction } from '@mm-actions/actionUtils';

export const Actions = {
  updateContactsList: createSingleValueAction('UPDATE_CONTACTS_LIST', 'contacts'),
  resetContactsList: createAction('RESET_CONTACTS_LIST'),
  removeContactFromList: createSingleValueAction('REMOVE_CONTACT_FROM_LIST', 'contact'),
  selectContact: createMultiValueAction('SELECT_CONTACT'),
  setSelectedContact: createSingleValueAction('SET_SELECTED_CONTACT', 'selected'),
  setContactsLoadingSummary: createSingleValueAction('SET_CONTACT_LOADING_SUMMARY', 'value'),
  setLoadingSelectedContact: createAction('SET_LOADING_SELECTED_CONTACT'),
  receiveSelectedContactChildren: createSingleValueAction('RECEIVE_SELECTED_CONTACT_CHILDREN', 'children'),
  receiveSelectedContactReports: createSingleValueAction('RECEIVE_SELECTED_CONTACT_REPORTS', 'reports'),
  updateSelectedContactSummary: createSingleValueAction('UPDATE_SELECTED_CONTACT_SUMMARY', 'summary'),
  updateSelectedContactsTasks: createSingleValueAction('UPDATE_SELECTED_CONTACT_TASKS', 'tasks'),
  receiveSelectedContactTargetDoc: createSingleValueAction('RECEIVE_SELECTED_CONTACT_TARGET_DOC', 'targetDoc'),
};

export class ContactsActions {
  constructor(
    private store: Store
  ) {}

  updateContactsList(contacts) {
    return this.store.dispatch(Actions.updateContactsList(contacts));
  }

  clearSelection() {
    return this.store.dispatch(Actions.setSelectedContact(null));
  }

  resetContactsList() {
    return this.store.dispatch(Actions.resetContactsList());
  }

  removeContactFromList(contact) {
    return this.store.dispatch(Actions.removeContactFromList(contact));
  }

  selectContact(id, { silent=false }={}) {
    return this.store.dispatch(Actions.selectContact({ id, silent }));
  }

  setSelectedContact(model) {
    return this.store.dispatch(Actions.setSelectedContact(model));
  }

  setContactsLoadingSummary(value) {
    return this.store.dispatch(Actions.setContactsLoadingSummary(value));
  }

  setLoadingSelectedContact() {
    return this.store.dispatch(Actions.setLoadingSelectedContact());
  }

  receiveSelectedContactChildren(children) {
    return this.store.dispatch(Actions.receiveSelectedContactChildren(children));
  }

  receiveSelectedContactReports(reports) {
    return this.store.dispatch(Actions.receiveSelectedContactReports(reports));
  }

  updateSelectedContactSummary(summary) {
    return this.store.dispatch(Actions.updateSelectedContactSummary(summary));
  }

  updateSelectedContactsTasks(tasks) {
    return this.store.dispatch(Actions.updateSelectedContactsTasks(tasks));
  }

  receiveSelectedContactTargetDoc(targetDoc) {
    return this.store.dispatch(Actions.receiveSelectedContactTargetDoc(targetDoc));
  }
}
