const assert = require('chai').assert;
const utils = require('./utils');

const person = {
  _id: '2bba279f-8ad9-4823-be69-a8eb09879402',
  _rev: '3-b99ee0615633d44f414362c8bf21454a',
  parent: {
    _id: '1a1aac55-04d6-40dc-aae2-e67a75a1496d'
  },
  type: 'person',
  name: 'patient1',
  date_of_birth: '',
  phone: '',
  phone_alternate: '',
  sex: 'female',
  role: 'patient',
  external_id: '99999',
  notes: '',
  reported_date: 1517420299278,
  patient_id: '47806',
};
const personBis = Object.assign({}, person, {
  _id: '2bba279f-8ad9-4823-be69-a8eb09879402-bis',
  date_of_death: 10,
  type: 'contact',
  contact_type: 'patient',
  name: '',
  phone: '0123456789',
  muted: true
});

const householdVisit = {
  _id: '5294b4c0-7499-41d5-b8d9-c548381799c0',
  _rev: '2-25a86f61d544f9254b6c738ca6f644ad',
  form: 'household_visit',
  type: 'data_record',
  verified: true,
  content_type: 'xml',
  reported_date: 1517418915669,
  contact: {
    _id: 'df28f38e-cd3c-475f-96b5-48080d863e34',
    parent: {
      _id: '1a1aac55-04d6-40dc-aae2-e67a75a1496d'
    }
  },
  from: '+111232543221',
  fields: {
    place_id: '09f62048-ac69-4066-bf8b-bcaf534ef8b1',
    place_name: 'some area',
    meta: {
      instanceID: 'uuid:e950c9eb-2650-42f4-b75d-72da2a20fba1'
    }
  }
};

const householdVisitBis = Object.assign({}, householdVisit, {
  _id: '5294b4c0-7499-41d5-b8d9-c548381799c0-bis',
  errors: [{
    code: 'sys.missing_fields',
    fields: ['place_id']
  }],
  fields: Object.assign({}, householdVisit.fields, {
    place_id: null
  }),
  verified: false
});

const postNatalVisit = {
  _id: '4971a859-bde7-4ff0-a0ed-326925b83038',
  _rev: '1-daf9f65652fbe6da38911d3ffd6c1d77',
  form: 'postnatal_visit',
  type: 'data_record',
  content_type: 'xml',
  case_id: '12345',
  reported_date: 1517392010413,
  contact: {
    _id: 'df28f38e-cd3c-475f-96b5-48080d863e34',
    parent: {
      _id: '1a1aac55-04d6-40dc-aae2-e67a75a1496d'
    }
  },
  from: '',
  fields: {
    patient_age_in_years: '25',
    patient_phone: '',
    patient_uuid: 'a29c933c-90cb-4cb0-9e25-36403499aee4',
    patient_id: 'a29c933c-90cb-4cb0-9e25-36403499aee4',
    patient_name: 'mother',
    meta: {
      instanceID: 'uuid:a53c23dc-eedb-433c-a81d-30c495ce7602'
    }
  },
  verified: true
};

const postNatalVisitBis = Object.assign({}, postNatalVisit, {
  _id: '4971a859-bde7-4ff0-a0ed-326925b83038-bis',
  fields: Object.assign({}, postNatalVisit.fields, {
    patient_id: null,
    patient_uuid: null,
  })
});


const postNatalVisitPatientIdNoUuid = Object.assign({}, postNatalVisit, {
  _id: '4971a859-bde7-4ff0-a0ed-326925b83038-idnouuid',
  fields: Object.assign({}, postNatalVisit.fields, {
    patient_id: 'a29c933c-90cb-4cb0-9e25-36403499aee6',
    patient_uuid: null,
  })
});

const postNatalVisitPatientUuidNoId = Object.assign({}, postNatalVisit, {
  _id: '4971a859-bde7-4ff0-a0ed-326925b83038-bis',
  fields: Object.assign({}, postNatalVisit.fields, {
    patient_id: null,
    patient_uuid: 'a29c933c-90cb-4cb0-9e25-36403499aee7',
  })
});

const jsonR = {
  _id: '60f2df4791ea8f83b531cdcf30003abe',
  _rev: '2-2fcc401c60fc33f91842482f0931fc27',
  type: 'data_record',
  from: '+13125551212',
  form: 'R',
  errors: [],
  tasks: [],
  fields: {
    patient_name: 'test'
  },
  reported_date: 1517405737096,
};

const jsonRBis = Object.assign({}, jsonR, {
  _id: '60f2df4791ea8f83b531cdcf30003abe-bis',
  errors: [{
    code: 'sys.missing_fields',
    fields: ['patient_name']
  }],
  fields: Object.assign({}, jsonR.fields, {
    patient_name: null
  })
});

const jsonOth = {
  _id: '60f2df4791ea8f83b531cdcf3007fffa',
  _rev: '2-6a2f4afb456e70db09c2bb8348b61267',
  type: 'data_record',
  from: '+13125551212',
  form: 'OTH',
  errors: [true],
  tasks: [],
  fields: {},
  reported_date: 1517491485049,
};

const communityEvent = {
  _id: 'e3f70ed4-7875-41ab-86f4-0808beb0fceb',
  _rev: '2-5ad6ee169ca8a5a0b21b504bbd65a85a',
  form: 'community_event',
  type: 'data_record',
  content_type: 'xml',
  reported_date: 1517495666367,
  contact: {
    _id: 'df28f38e-cd3c-475f-96b5-48080d863e34',
    parent: {
      _id: '1a1aac55-04d6-40dc-aae2-e67a75a1496d'
    }
  },
  from: '+13125551212',
  hidden_fields: [],
  fields: {
    community_event_info: {
      event_date: '2018-01-16',
      no_of_attendees: '13',
      subject: 'newborn',
      notes: ''
    },
    meta: {
      instanceID: 'uuid:90ed62fc-66a7-4ab6-a8f2-a44060fbcb2d'
    }
  }
};

const jsonD = {
  _id: '60f2df4791ea8f83b531cdcf3000c44a',
  _rev: '2-b515aeb6076ef05b474a9b15bbeb1106',
  type: 'data_record',
  from: '+13125551212',
  form: 'D',
  fields: {
    patient_id: '22323',
    delivery_code: 'F',
    notes: 'note'
  },
  reported_date: 1517408179956,
};

const jsonDBis = Object.assign({}, jsonD, {
  _id: '60f2df4791ea8f83b531cdcf3000c44a-bis',
  errors: [{
    code: 'sys.missing_fields',
    fields: ['patient_id']
  }],
  fields: Object.assign({}, jsonD.fields, {
    patient_id: null,
  })
});

const jsonHousehold = {
  _id: '5294b4c0-7499-41d5-b8d9-c548381799c0',
  _rev: '2-25a86f61d544f9254b6c738ca6f644ad',
  type: 'data_record',
  from: '+13125551212',
  form: 'H',
  fields: {
    delivery_code: 'F',
    notes: 'note'
  },
  place_id: '111111',
  reported_date: 1517408179956,
};

const jsonHouseholdBis = Object.assign({}, jsonHousehold, {
  _id: '5294b4c0-7499-41d5-b8d9-c548381799c0-bis',
  errors: [{
    code: 'sys.missing_fields',
    fields: ['place_id']
  }],
  place_id: null
});

describe('doc_summaries_by_id view', () => {
  it('indexes name, phone, type, contact, lineage, dod for non-data-records', () => {
    const map = utils.loadView('medic-db', 'medic', 'doc_summaries_by_id');

    const emitted = map(person, true) && map(personBis, true);
    assert.deepEqual(emitted[0], {
      key: '2bba279f-8ad9-4823-be69-a8eb09879402',
      value: {
        _rev: '3-b99ee0615633d44f414362c8bf21454a',
        name: 'patient1',
        phone: '',
        type: 'person',
        contact_type: undefined,
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        date_of_death: undefined,
        contact: undefined,
        muted: undefined
      }
    });
    assert.deepEqual(emitted[1], {
      key: '2bba279f-8ad9-4823-be69-a8eb09879402-bis',
      value: {
        _rev: '3-b99ee0615633d44f414362c8bf21454a',
        name: '0123456789',
        phone: '0123456789',
        type: 'contact',
        contact_type: 'patient',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        date_of_death: 10,
        contact: undefined,
        muted: true
      }
    });
  });

  it('indexes data-records summary and subject', () => {
    const map = utils.loadView('medic-db', 'medic', 'doc_summaries_by_id');

    const reportsList = [
      householdVisit,
      householdVisitBis,
      postNatalVisit,
      postNatalVisitBis,
      jsonR,
      jsonRBis,
      jsonOth,
      communityEvent,
      jsonD,
      jsonDBis,
      jsonHousehold,
      jsonHouseholdBis,
      postNatalVisitPatientIdNoUuid,
      postNatalVisitPatientUuidNoId,
    ];

    let emitted = true;
    reportsList.forEach(report => {
      emitted = emitted && map(report, true);
    });

    assert.deepEqual(emitted[0], {
      key: '5294b4c0-7499-41d5-b8d9-c548381799c0',
      value: {
        _rev: '2-25a86f61d544f9254b6c738ca6f644ad',
        from: '+111232543221',
        phone: undefined,
        form: 'household_visit',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 1517418915669,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: {
          type: 'reference',
          value: '09f62048-ac69-4066-bf8b-bcaf534ef8b1'
        },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[1], {
      key: '5294b4c0-7499-41d5-b8d9-c548381799c0-bis',
      value: {
        _rev: '2-25a86f61d544f9254b6c738ca6f644ad',
        from: '+111232543221',
        phone: undefined,
        form: 'household_visit',
        read: undefined,
        valid: false,
        verified: false,
        reported_date: 1517418915669,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: { type: 'unknown'},
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[2], {
      key: '4971a859-bde7-4ff0-a0ed-326925b83038',
      value: {
        _rev: '1-daf9f65652fbe6da38911d3ffd6c1d77',
        from: undefined,
        phone: undefined,
        form: 'postnatal_visit',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 1517392010413,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: {
          name: 'mother',
          type: 'reference',
          value: 'a29c933c-90cb-4cb0-9e25-36403499aee4'
        },
        case_id: '12345'
      }
    });

    assert.deepEqual(emitted[3], {
      key: '4971a859-bde7-4ff0-a0ed-326925b83038-bis',
      value: {
        _rev: '1-daf9f65652fbe6da38911d3ffd6c1d77',
        from: undefined,
        phone: undefined,
        form: 'postnatal_visit',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 1517392010413,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: {
          name: 'mother',
          type: 'name',
          value: 'mother'
        },
        case_id: '12345'
      }
    });

    assert.deepEqual(emitted[4], {
      key: '60f2df4791ea8f83b531cdcf30003abe',
      value: {
        _rev: '2-2fcc401c60fc33f91842482f0931fc27',
        from: '+13125551212',
        phone: undefined,
        form: 'R',
        read: undefined,
        valid: true,
        verified: undefined,
        reported_date: 1517405737096,
        contact: undefined,
        lineage: [],
        subject: {
          name: 'test',
          type: 'name',
          value: 'test'
        },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[5], {
      key: '60f2df4791ea8f83b531cdcf30003abe-bis',
      value: {
        _rev: '2-2fcc401c60fc33f91842482f0931fc27',
        from: '+13125551212',
        phone: undefined,
        form: 'R',
        read: undefined,
        valid: false,
        verified: undefined,
        reported_date: 1517405737096,
        contact: undefined,
        lineage: [],
        subject: { type: 'unknown' },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[6], {
      key: '60f2df4791ea8f83b531cdcf3007fffa',
      value: {
        _rev: '2-6a2f4afb456e70db09c2bb8348b61267',
        from: '+13125551212',
        phone: undefined,
        form: 'OTH',
        read: undefined,
        valid: false,
        verified: undefined,
        reported_date: 1517491485049,
        contact: undefined,
        lineage: [],
        subject: { },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[7], {
      key: 'e3f70ed4-7875-41ab-86f4-0808beb0fceb',
      value: {
        _rev: '2-5ad6ee169ca8a5a0b21b504bbd65a85a',
        from: '+13125551212',
        phone: undefined,
        form: 'community_event',
        read: undefined,
        valid: true,
        verified: undefined,
        reported_date: 1517495666367,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: {},
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[8], {
      key: '60f2df4791ea8f83b531cdcf3000c44a',
      value: {
        _rev: '2-b515aeb6076ef05b474a9b15bbeb1106',
        from: '+13125551212',
        phone: undefined,
        form: 'D',
        read: undefined,
        valid: true,
        verified: undefined,
        reported_date: 1517408179956,
        contact: undefined,
        lineage: [],
        subject: {
          type: 'reference',
          value: '22323'
        },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[9], {
      key: '60f2df4791ea8f83b531cdcf3000c44a-bis',
      value: {
        _rev: '2-b515aeb6076ef05b474a9b15bbeb1106',
        from: '+13125551212',
        phone: undefined,
        form: 'D',
        read: undefined,
        valid: false,
        verified: undefined,
        reported_date: 1517408179956,
        contact: undefined,
        lineage: [],
        subject: { type: 'unknown' },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[10], {
      key: '5294b4c0-7499-41d5-b8d9-c548381799c0',
      value: {
        _rev: '2-25a86f61d544f9254b6c738ca6f644ad',
        from: '+13125551212',
        phone: undefined,
        form: 'H',
        read: undefined,
        valid: true,
        verified: undefined,
        reported_date: 1517408179956,
        contact: undefined,
        lineage: [],
        subject: {
          type: 'reference',
          value: '111111'
        },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[11], {
      key: '5294b4c0-7499-41d5-b8d9-c548381799c0-bis',
      value: {
        _rev: '2-25a86f61d544f9254b6c738ca6f644ad',
        from: '+13125551212',
        phone: undefined,
        form: 'H',
        read: undefined,
        valid: false,
        verified: undefined,
        reported_date: 1517408179956,
        contact: undefined,
        lineage: [],
        subject: { type: 'unknown' },
        case_id: undefined
      }
    });

    assert.deepEqual(emitted[12], {
      key: '4971a859-bde7-4ff0-a0ed-326925b83038',
      value: {
        _rev: '1-daf9f65652fbe6da38911d3ffd6c1d77',
        from: undefined,
        phone: undefined,
        form: 'postnatal_visit',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 1517392010413,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: {
          name: 'mother',
          type: 'reference',
          value: 'a29c933c-90cb-4cb0-9e25-36403499aee5'
        },
        case_id: '12345'
      }
    });

    assert.deepEqual(emitted[13], {
      key: '4971a859-bde7-4ff0-a0ed-326925b83038',
      value: {
        _rev: '1-daf9f65652fbe6da38911d3ffd6c1d77',
        from: undefined,
        phone: undefined,
        form: 'postnatal_visit',
        read: undefined,
        valid: true,
        verified: true,
        reported_date: 1517392010413,
        contact: 'df28f38e-cd3c-475f-96b5-48080d863e34',
        lineage: ['1a1aac55-04d6-40dc-aae2-e67a75a1496d'],
        subject: {
          name: 'mother',
          type: 'reference',
          value: 'a29c933c-90cb-4cb0-9e25-36403499aee6'
        },
        case_id: '12345'
      }
    });
  });
});
