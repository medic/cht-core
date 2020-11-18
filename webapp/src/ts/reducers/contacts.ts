import { Actions } from '../actions/contacts';
import { createReducer, on } from '@ngrx/store';
import { UniqueSortedList } from './utils';
import { ContactTypesService } from '@mm-services/contact-types.service';

const initialState = {
  contacts: [],
  contactsById: new Map(),
  selected: [],
  filters: {},
  loadingSelectedChildren: false,
  loadingSelectedContacts: false,
  // loadingSelectedReports: false,
  loadingSummary: false,
};

const getContactTypeOrder = (contact) => {
  if (contact.type === 'contact') {
    const idx = ContactTypesService.HARDCODED_TYPES().indexOf(contact.contact_type);
    if (idx !== -1) {
      // matches a hardcoded type - order by the index
      return '' + idx;
    }
    // order by the name of the type
    return contact.contact_type;
  }
  // backwards compatibility with hardcoded hierarchy
  return '' + ContactTypesService.HARDCODED_TYPES().indexOf(contact.type);
};

const orderBy = (c1, c2) => {
  if (!c1 || !c2) {
    return;
  }

  // sort dead people to the bottom
  if (!!c1.date_of_death !== !!c2.date_of_death) {
    return c1.date_of_death ? 1 : -1;
  }

  // sort muted people to the bottom
  if (!!c1.muted !== !!c2.muted) {
    return c1.muted ? 1 : -1;
  }

  if (c1.sortByLastVisitedDate) {
    return c1.lastVisitedDate - c2.lastVisitedDate;
  }
  if (c1.simprints && c2.simprints) {
    return c2.simprints.confidence - c1.simprints.confidence;
  }
  const c1Type = getContactTypeOrder(c1) || '';
  const c2Type = getContactTypeOrder(c2) || '';
  if (c1Type !== c2Type) {
    return c1Type < c2Type ? -1 : 1;
  }

  return (c1.name || '').toLowerCase() < (c2.name || '').toLowerCase() ? -1 : 1;
};

const updateContacts = (state, newContacts) => {
  const contacts = [...state.contacts];
  const contactsById = new Map(state.contactsById);
  const list = new UniqueSortedList(contacts, contactsById, orderBy);

  newContacts.forEach(contact => {
    list.remove(contact);
    list.add(contact);
  });

  return { ...state, contacts, contactsById };
};

const removeContact = (state, contact) => {
  const contacts = [ ...state.contacts];
  const contactsById = new Map(state.contactsById);

  const list = new UniqueSortedList(contacts, contactsById, orderBy);
  list.remove(contact);

  return { ...state, contacts, contactsById };
};

const _contactsReducer = createReducer(
  initialState,
  on(Actions.updateContactsList, (state, { payload: { contacts } }) => updateContacts(state, contacts)),
  on(Actions.setSelectedContacts, (state, { payload: { selected } }) => ({ ...state, selected })),
  on(Actions.resetContactsList, (state) => ({ ...state, contacts: [], contactsById: new Map() })),
  on(Actions.removeContactFromList, (state, { payload: { contact } }) => removeContact(state, contact)),
);

export function contactsReducer(state, action) {
  return _contactsReducer(state, action);
}
