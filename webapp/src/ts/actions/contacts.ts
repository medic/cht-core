import { Store, createAction } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  updateContactsList: createSingleValueAction('UPDATE_CONTACTS_LIST', 'contacts')
};

export class ContactsActions {
  constructor(
    private store: Store
  ) {}

  updateContactsList(contacts) {
    return this.store.dispatch(Actions.updateContactsList(contacts));
  }
}
