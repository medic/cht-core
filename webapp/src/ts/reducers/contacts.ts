import { createReducer, on } from '@ngrx/store';

import { UniqueSortedList } from '@mm-reducers/utils';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { Actions } from '@mm-actions/contacts';

const initialState = {
  contacts: [],
  contactsById: new Map(),
  contactIdToFetch: null,
  selected: null,
  filters: {},
  loadingSelectedChildren: false,
  loadingSelectedReports: false,
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

const setLoadingSelectedContact = (state) => {
  return { ...state, loadingSelectedChildren: true, loadingSelectedReports: true };
};

const setContactsLoadingSummary = (state, value) => {
  return { ...state, loadingSummary: value };
};

const receiveSelectedContactChildren = (state, children) => {
  return {
    ...state,
    loadingSelectedChildren: false,
    selected: { ...state.selected, children },
  };
};

const receiveSelectedContactReports = (state, reports) => {
  return {
    ...state,
    loadingSelectedReports: false,
    selected: { ...state.selected, reports },
  };
};

const setSelectedContact = (state, selected) => {
  return { ...state, selected };
};

const updateSelectedContactSummary = (state, summary) => {
  return {
    ...state,
    selected: { ...state.selected, summary },
  };
};

const updateSelectedContactsTasks = (state, tasks) => {
  const taskCounts = {};
  tasks.forEach(task => {
    const childId = task.emission.forId;
    taskCounts[childId] = taskCounts[childId] ? taskCounts[childId] + 1 : 1;
  });
  const children = state.selected?.children?.map(group => {
    const contacts = group.contacts.map(child => {
      return { ...child, taskCount: taskCounts[child.id] };
    });
    return { ...group, contacts };
  });
  const mappedTasks = tasks.map(doc => doc.emission);
  return { ...state, selected: { ...state.selected, tasks: mappedTasks, children }};
};

const receiveSelectedContactTargetDoc = (state, targetDoc) => {
  return {
    ...state,
    selected: { ...state.selected, targetDoc },
  };
};

const _contactsReducer = createReducer(
  initialState,
  on(Actions.setContactIdToFetch, (state, { payload: { id } }) => ({ ...state, contactIdToFetch: id })),
  on(Actions.updateContactsList, (state, { payload: { contacts } }) => updateContacts(state, contacts)),
  on(Actions.resetContactsList, (state) => ({ ...state, contacts: [], contactsById: new Map() })),
  on(Actions.removeContactFromList, (state, { payload: { contact } }) => removeContact(state, contact)),
  on(Actions.setSelectedContact, (state, { payload: { selected } }) => setSelectedContact(state, selected)),
  on(Actions.setLoadingSelectedContact, (state) => setLoadingSelectedContact(state)),
  on(Actions.setContactsLoadingSummary, (state, { payload: { value }}) => setContactsLoadingSummary(state, value)),
  on(Actions.receiveSelectedContactChildren, (state, { payload: { children }}) => {
    return receiveSelectedContactChildren(state, children);
  }),
  on(Actions.receiveSelectedContactReports, (state, { payload: { reports }}) => {
    return receiveSelectedContactReports(state, reports);
  }),
  on(Actions.updateSelectedContactSummary, (state, { payload: { summary }}) => {
    return updateSelectedContactSummary(state, summary);
  }),
  on(Actions.updateSelectedContactsTasks, (state, { payload: { tasks }}) => updateSelectedContactsTasks(state, tasks)),
  on(Actions.receiveSelectedContactTargetDoc, (state, { payload: { targetDoc }}) => {
    return receiveSelectedContactTargetDoc(state, targetDoc);
  }),
);

export const contactsReducer = (state, action) => {
  return _contactsReducer(state, action);
};
