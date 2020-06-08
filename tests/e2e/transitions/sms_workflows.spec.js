const utils = require('../../utils');
const chai = require('chai');

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'district_hospital',
    contact: { _id: 'chw3' },
    linked_contacts: {
      some_tag1: 'chw4',
      some_tag2: 'chw1'
    },
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'health_center',
    parent: { _id: 'district_hospital' },
    contact: { _id: 'chw2' },
    linked_contacts: {
      some_tag3: { _id: 'chw3' },

    }
  },
  {
    _id: 'clinic1',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: { _id: 'chw1' },
  },
  {
    _id: 'chw1',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone1',
    name: 'chw1',
  },
  {
    _id: 'chw2',
    type: 'person',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    phone: 'phone2',
    name: 'chw2',
  },
  {
    _id: 'chw3',
    type: 'person',
    parent: { _id: 'district_hospital' },
    phone: 'phone3',
  },
  {
    _id: 'chw4',
    type: 'person',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    phone: 'phone4',
  },
  {
    _id: 'chw5',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone5',
  },
  {
    _id: 'chw6',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone6',
  }
];
