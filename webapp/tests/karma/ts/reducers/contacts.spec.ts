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
      filters: {},
    };
  });

  describe('updateContacts', () => {
    it('should update empty state', () => {
      const contacts = [
        {  _id: '1', name: 'Centre 1','type':'health_center' },
        {  _id: '2', name: 'Facility 3','type':'district_hospital' },
        {  _id: '3', name: 'Person 1','type':'person' },
        {  _id: '4', name: 'Person 2','type':'person' },
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 3','type':'district_hospital' }],
          ['3', { _id: '3', name: 'Person 1','type':'person' }],
          ['4', { _id: '4', name: 'Person 2','type':'person' }],
        ]),
        filters: {},
        selected: null,
        loadingSelectedChildren: false,
        loadingSelectedContacts: false,
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 3','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 3','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 3','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 2','type':'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 2','type':'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility','type':'district_hospital' }],
        ])
      };
      const newState = contactsReducer(state, Actions.removeContactFromList({ _id: '2'}));

      expect(newState).to.deep.equal({
        contacts: [
          { _id: '3', name: 'Random Facility', type: 'district_hospital'},
          { _id: '1', name: 'Centre 1', type: 'health_center' },
        ],
        contactsById: new Map([
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['3', { _id: '3', name: 'Random Facility','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 2','type':'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 2','type':'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility','type':'district_hospital' }],
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
          ['1', { _id: '1', name: 'Centre 1','type':'health_center' }],
          ['2', { _id: '2', name: 'Facility 2','type':'district_hospital' }],
          ['3', { _id: '3', name: 'Random Facility','type':'district_hospital' }],
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

  // TODO: add tests for adding, removing and clearing selected contacts
});
