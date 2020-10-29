import { Actions } from '../actions/contacts';
import { createReducer, on } from '@ngrx/store';

const initialState = {
  contacts: [],
  selected: [],
  filters: {},
  loadingSelectedChildren: false,
  loadingSelectedReports: false,
  loadingSummary: false,
};

const updateContacts = (state, newContacts) => {
  const contacts = newContacts;
  return { ...state, contacts };
}

const _contactsReducer = createReducer(
  initialState,
  on(Actions.updateContactsList, (state, { payload: { contacts } }) => updateContacts(state, contacts)),
  on(Actions.setSelectedReports, (state, { payload: { selected } }) => ({ ...state, selected })),
);

export function contactsReducer(state, action) {
  return _contactsReducer(state, action);
}
