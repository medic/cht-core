import { expect } from 'chai';

import { Actions } from '@mm-actions/contacts';
import { contactsReducer } from '@mm-reducers/contacts';

describe('Contacts Reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      contacts: [],
      contactsById: new Map(),
      selected: [],
      contactIdToLoad: null,
      filters: {},
      loadingSummary: false,
    };
  });

  it('should set loadingSummary in the state', () => {
    let newState = contactsReducer(state, Actions.setContactsLoadingSummary(true));
    expect(newState).to.deep.equal({
      contacts: [],
      contactsById: new Map(),
      selected: [],
      contactIdToLoad: null,
      filters: {},
      loadingSummary: true,
    });

    newState = contactsReducer(state, Actions.setContactsLoadingSummary(false));
    expect(newState).to.deep.equal({
      contacts: [],
      contactsById: new Map(),
      selected: [],
      contactIdToLoad: null,
      filters: {},
      loadingSummary: false,
    });
  });

  describe('updateContacts', () => {
    it('should update empty state', () => {
      const contacts = [
        {  _id: '1', name: 'Centre 1', type:'health_center' },
        {  _id: '2', name: 'Facility 3', type:'district_hospital' },
        {  _id: '3', name: 'Person 1', type:'person' },
        {  _id: '4', name: 'Person 2', type:'person' },
      ];
      const newState = contactsReducer(undefined, Actions.updateContactsList(contacts));

      expect(newState).to.deep.equal({
        // sorted by contact type order
        contacts: [
          { _id: '2', name: 'Facility 3', type: 'district_hospital' },
          { _id: '1', name: 'Centre 1', type: 'health_center' },
          { _id: '3', name: 'Person 1', type: 'person' },
          { _id: '4', name: 'Person 2', type: 'person' }
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 3', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Person 1', type:'person' }],
          ['4', { _id: '4', name: 'Person 2', type:'person' }],
        ]),
        filters: {},
        selected: null,
        contactIdToLoad: null,
        loadingSelectedChildren: false,
        loadingSelectedReports: false,
        loadingSummary: false,
      });
    });

    it('should add new contacts', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 3', type: 'district_hospital' },
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 3', type:'district_hospital' }],
        ])
      };
      const newContacts = [
        { _id: '3', name: 'Facility 2', type: 'district_hospital' },
        { _id: '4', name: 'Person 1', type: 'person' },
      ];

      const newState = contactsReducer(state, Actions.updateContactsList(newContacts));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '3', name: 'Facility 2', type: 'district_hospital' },
          { _id: '2', name: 'Facility 3', type: 'district_hospital' },
          { _id: '1', name: 'Centre 1', type: 'health_center' },
          { _id: '4', name: 'Person 1', type: 'person' }
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 3', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Facility 2', type: 'district_hospital' }],
          ['4', { _id: '4', name: 'Person 1', type: 'person' }],
        ])
      });
    });

    it('should update existing contacts', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 3', type: 'district_hospital' },
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 3', type:'district_hospital' }],
        ])
      };
      const updatedContacts = [
        { _id: '2', name: 'Facility 2', type: 'district_hospital'},
        { _id: '3', name: 'Random Facility', type: 'district_hospital'}
      ];

      const newState = contactsReducer(state, Actions.updateContactsList(updatedContacts));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ])
      });
    });
  });

  describe('remove contacts', () => {
    it('should remove a contact from the list', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ])
      };
      const newState = contactsReducer(state, Actions.removeContactFromList({ _id: '2'}));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ])
      });
    });

    it('should work when the contact is not in the list', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ])
      };

      const newState = contactsReducer(state, Actions.removeContactFromList({ _id: '10' }));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ])
      });
    });

    it('should work even with no state', () => {
      const newState = contactsReducer(state, Actions.removeContactFromList({ _id: '10' }));
      expect(newState).to.deep.equal(state);
    });
  });

  describe('reset contacts list', () => {
    it('should reset list properties', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
        selected: [],
        filters: {},
      };
      const newState = contactsReducer(state, Actions.resetContactsList());

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        selected: [],
        filters: {},
      });
    });
  });

  describe('ordering', () => {
    it('should push dead people to the bottom of the list', () => {
      state = {
        contacts: [
          { _id: '1', name: 'Person 1', type: 'person' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Person 1', type: 'person' }]
        ])
      };
      const newContacts = [
        { _id: '2', name: 'Person 2', type: 'person', date_of_death: '2020-11-18' },
        { _id: '3', name: 'Person 3', type: 'person' },
        { _id: '4', name: 'Person 4', type: 'person' }
      ];

      const newState = contactsReducer(state, Actions.updateContactsList(newContacts));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '1', name: 'Person 1', type: 'person' },
          { _id: '3', name: 'Person 3', type: 'person' },
          { _id: '4', name: 'Person 4', type: 'person' },
          { _id: '2', name: 'Person 2', type: 'person', date_of_death: '2020-11-18' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Person 1', type: 'person' }],
          ['2', { _id: '2', name: 'Person 2', type: 'person', date_of_death: '2020-11-18'  }],
          ['3', { _id: '3', name: 'Person 3', type: 'person' }],
          ['4', { _id: '4', name: 'Person 4', type: 'person' }],
        ])
      });
    });

    it('should push muted people to the bottom of the list', () => {
      state = {
        contacts: [
          { _id: '1', name: 'Person 1', type: 'person' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Person 1', type: 'person' }]
        ])
      };
      const newContacts = [
        { _id: '2', name: 'Person 2', type: 'person', muted: true },
        { _id: '3', name: 'Person 3', type: 'person' },
        { _id: '4', name: 'Person 4', type: 'person' }
      ];

      const newState = contactsReducer(state, Actions.updateContactsList(newContacts));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '1', name: 'Person 1', type: 'person' },
          { _id: '3', name: 'Person 3', type: 'person' },
          { _id: '4', name: 'Person 4', type: 'person' },
          { _id: '2', name: 'Person 2', type: 'person', muted: true },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Person 1', type: 'person' }],
          ['2', { _id: '2', name: 'Person 2', type: 'person', muted: true  }],
          ['3', { _id: '3', name: 'Person 3', type: 'person' }],
          ['4', { _id: '4', name: 'Person 4', type: 'person' }],
        ])
      });
    });

    it('should push dead people to below muted people at the bottom of the list', () => {
      state = {
        contacts: [
          { _id: '1', name: 'Person 1', type: 'person' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Person 1', type: 'person' }]
        ])
      };
      const newContacts = [
        { _id: '2', name: 'Person 2', type: 'person', muted: true },
        { _id: '3', name: 'Person 3', type: 'person' },
        { _id: '4', name: 'Person 4', type: 'person', date_of_death: '2020-11-18' },
        { _id: '5', name: 'Person 5', type: 'person' }
      ];

      const newState = contactsReducer(state, Actions.updateContactsList(newContacts));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '1', name: 'Person 1', type: 'person' },
          { _id: '3', name: 'Person 3', type: 'person' },
          { _id: '5', name: 'Person 5', type: 'person' },
          { _id: '2', name: 'Person 2', type: 'person', muted: true },
          { _id: '4', name: 'Person 4', type: 'person', date_of_death: '2020-11-18' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Person 1', type: 'person' }],
          ['2', { _id: '2', name: 'Person 2', type: 'person', muted: true  }],
          ['3', { _id: '3', name: 'Person 3', type: 'person' }],
          ['4', { _id: '4', name: 'Person 4', type: 'person', date_of_death: '2020-11-18' }],
          ['5', { _id: '5', name: 'Person 5', type: 'person' }],
        ])
      });
    });
  });

  describe('Set selected contact', () => {
    it('should set the selected contact', () => {
      const selected = { _id: 'selected_contact', some: 'data' };
      const newState = contactsReducer(state, Actions.setSelectedContact(selected));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: { _id: 'selected_contact', some: 'data' },
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });

    it('should set selected contact with full contacts list', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
      };
      const selected = { _id: 'selected_contact', some: 'data' };
      const newState = contactsReducer(state, Actions.setSelectedContact(selected));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
        selected: { _id: 'selected_contact', some: 'data' },
      });
    });

    it('should update selected contact', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
        selected: { _id: 'first_selected_contact', some: 'data' }
      };
      const selected = { _id: 'second_selected_contact', some: 'other data' };
      const newState = contactsReducer(state, Actions.setSelectedContact(selected));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
        selected: { _id: 'second_selected_contact', some: 'other data' },
      });
    });

    it('should unset selected contact', () => {
      state = {
        contacts: [
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
        ]),
        selected: { _id: 'selected_contact' },
      };

      const newState = contactsReducer(state, Actions.setSelectedContact(null));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
        ]),
        selected: null
      });
    });
  });

  describe('updateSelectedContactSummary', () => {
    it('should work when selected contact not set', () => {
      const summary = { some: 'summary' };
      const newState = contactsReducer(state, Actions.updateSelectedContactSummary(summary));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map([]),
        filters: {},
        selected: {
          summary: { some: 'summary' }
        },
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });

    it('should update a selected contact with the summary', () => {
      state = {
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
        selected: { _id: 'first_selected_contact', some: 'data' }
      };
      const summary = { some: 'summary' };
      const newState = contactsReducer(state, Actions.updateSelectedContactSummary(summary));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '2', name: 'Facility 2', type: 'district_hospital' },
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1', type:'health_center' }],
          ['2', { _id: '2', name: 'Facility 2', type:'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility', type:'district_hospital' }],
        ]),
        selected: { _id: 'first_selected_contact', some: 'data', summary: { some: 'summary' } }
      });
    });
  });

  describe('receiveSelectedContactChildren', () => {
    it('should set the children of selected contact in the state', () => {
      state.selected = { _id: 'selected_contact' };
      const children = [{ _id: 'child-1' }];

      const newState = contactsReducer(state, Actions.receiveSelectedContactChildren(children));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          children: [{ _id: 'child-1' }]
        },
        contactIdToLoad: null,
        loadingSummary: false,
        loadingSelectedChildren: false,
      });
    });

    it('should update the children of selected contact in the state', () => {
      state.selected = {
        _id: 'selected_contact',
        children: [{ _id: 'child-1' }]
      };
      const children = [{ _id: 'child-2' }];

      const newState = contactsReducer(state, Actions.receiveSelectedContactChildren(children));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          children: [
            { _id: 'child-2' }
          ]
        },
        contactIdToLoad: null,
        loadingSummary: false,
        loadingSelectedChildren: false,
      });
    });
  });

  describe('receiveSelectedContactReports', () => {
    it('should set the reports of selected contact in the state', () => {
      state.selected = { _id: 'selected_contact' };
      const reports = [{ _id: 'report-1' }];

      const newState = contactsReducer(state, Actions.receiveSelectedContactReports(reports));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          reports: [{ _id: 'report-1' }]
        },
        contactIdToLoad: null,
        loadingSummary: false,
        loadingSelectedReports: false
      });
    });

    it('should update the reports of selected contact in the state', () => {
      state.selected = {
        _id: 'selected_contact',
        reports: [{ _id: 'report-1' }]
      };
      const reports = [{ _id: 'report-2' }];

      const newState = contactsReducer(state, Actions.receiveSelectedContactReports(reports));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          reports: [
            { _id: 'report-2' }
          ]
        },
        contactIdToLoad: null,
        loadingSelectedReports: false,
        loadingSummary: false,
      });
    });
  });

  describe('updateSelectedContactsTasks', () => {
    it('should update taskCounts of every contact in children and add tasks to the selected contact in state ', () => {
      state.selected = {
        _id: 'selected_contact',
        children: [
          {
            _id: 'child-1',
            contacts: [ { id: 'contact-1' } ]
          },
          {
            _id: 'child-2',
            contacts: [ { id: 'contact-2' } ]
          },
          {
            _id: 'child-3',
            contacts: [ { id: 'contact-3' }, { id: 'contact-4' } ]
          }
        ]
      };
      const tasks = [
        {
          _id: 'task-1',
          emission: { forId: 'contact-1' }
        },
        {
          _id: 'task-2',
          emission: { forId: 'contact-1' }
        },
        {
          _id: 'task-3',
          emission: { forId: 'contact-3' }
        }
      ];

      const newState = contactsReducer(state, Actions.updateSelectedContactsTasks(tasks));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          children: [
            {
              _id: 'child-1',
              contacts: [ { id: 'contact-1', taskCount: 2 } ]
            },
            {
              _id: 'child-2',
              contacts: [ { id: 'contact-2', taskCount: undefined } ]
            },
            {
              _id: 'child-3',
              contacts: [ { id: 'contact-3', taskCount: 1 }, { id: 'contact-4', taskCount: undefined } ]
            }
          ],
          tasks: [
            { forId: 'contact-1' },
            { forId: 'contact-1' },
            { forId: 'contact-3' }
          ]
        },
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });

    it('should add tasks but not update children when selected contact doesnt have children in state', () => {
      state.selected = {
        _id: 'selected_contact',
        children: []
      };
      const tasks = [{
        _id: 'task-1',
        emission: { forId: 'contact-1' }
      }];

      const newState = contactsReducer(state, Actions.updateSelectedContactsTasks(tasks));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          children: [],
          tasks: [
            { forId: 'contact-1' }
          ]
        },
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });
  });

  describe('receiveSelectedContactTargetDoc', () => {
    it('should set the targetDoc of selected contact in the state', () => {
      state.selected = { _id: 'selected_contact' };
      const targetDoc = { _id: 'doc-1' };

      const newState = contactsReducer(state, Actions.receiveSelectedContactTargetDoc(targetDoc));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          targetDoc: { _id: 'doc-1' }
        },
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });

    it('should update the targetDoc of selected contact in the state', () => {
      state.selected = {
        _id: 'selected_contact',
        targetDoc: { _id: 'doc-1' }
      };
      const targetDoc = { _id: 'doc-2' };

      const newState = contactsReducer(state, Actions.receiveSelectedContactTargetDoc(targetDoc));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: {
          _id: 'selected_contact',
          targetDoc: { _id: 'doc-2' }
        },
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });
  });

  describe('setContactIdToLoad', () => {
    it('should set contactIdToLoad in the state', () => {
      state.contactIdToLoad = null;

      const newState = contactsReducer(state, Actions.setContactIdToLoad('selected_contact_1'));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: [],
        contactIdToLoad: 'selected_contact_1',
        loadingSummary: false,
      });
    });

    it('should update contactIdToLoad in the state', () => {
      state.contactIdToLoad = 'selected_contact_1';

      const newState = contactsReducer(state, Actions.setContactIdToLoad('selected_contact_2'));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: [],
        contactIdToLoad: 'selected_contact_2',
        loadingSummary: false,
      });
    });

    it('should unset contactIdToLoad in the state', () => {
      state.contactIdToLoad = 'selected_contact_1';

      const newState = contactsReducer(state, Actions.setContactIdToLoad(null));

      expect(newState).to.deep.equal({
        contacts: [],
        contactsById: new Map(),
        filters: {},
        selected: [],
        contactIdToLoad: null,
        loadingSummary: false,
      });
    });
  });
});
