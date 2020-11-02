import { Actions } from '../actions/contacts';
import { createReducer, on } from '@ngrx/store';
import { UniqueSortedList } from './utils';

const initialState = {
  contacts: [],
  contactsById: new Map(),
  selected: [],
  filters: {},
  loadingSelectedChildren: false,
  loadingSelectedReports: false,
  loadingSummary: false,
};

const updateContacts = (state, newContacts) => {
  const contacts = [...state.contacts];
  const contactsById = new Map(state.contactsById);
  const list = new UniqueSortedList(contacts, contactsById, 'name');

  newContacts.forEach(contact => {
    list.remove(contact);
    list.add(contact);
  });

  return { ...state, contacts, contactsById };
};

const _contactsReducer = createReducer(
  initialState,
  on(Actions.updateContactsList, (state, { payload: { contacts } }) => updateContacts(state, contacts)),
  on(Actions.setSelectedReports, (state, { payload: { selected } }) => ({ ...state, selected })),
  on(Actions.resetContactsList, (state) => ({ ...state, contacts: [], contactsById: new Map() })),
);

export function contactsReducer(state, action) {
  return _contactsReducer(state, action);
}
