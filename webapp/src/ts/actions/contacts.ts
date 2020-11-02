import { Store, createAction } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  updateContactsList: createSingleValueAction('UPDATE_CONTACTS_LIST', 'contacts'),
  setSelectedReports: createSingleValueAction('SET_SELECTED_REPORTS', 'selected'),
  resetContactsList: createAction('RESET_CONTACTS_LIST'),
  removeContactFromList: createSingleValueAction('REMOVE_CONTACT_FROM_LIST', 'contact'),
};

export class ContactsActions {
  constructor(
    private store: Store
  ) {}

  updateContactsList(contacts) {
    return this.store.dispatch(Actions.updateContactsList(contacts));
  }

  clearSelection() {
    return this.store.dispatch(Actions.setSelectedReports([]));
  }

  resetContactsList() {
    return this.store.dispatch(Actions.resetContactsList());
  }

  removeContactFromList(contact) {
    return this.store.dispatch(Actions.removeContactFromList(contact));
  }
}
