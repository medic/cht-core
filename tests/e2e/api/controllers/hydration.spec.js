const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const utils = require('../../../utils');
const _ = require('lodash');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
};

const users = [
  {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
    },
    roles: ['district_admin'],
  },
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'Online place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
    },
    roles: ['national_admin'],
  },
];

let offlineRequestOptions;
let onlineRequestOptions;
let noAuthRequestOptions;

const contacts = [
  parentPlace,
  {
    _id: 'hc1',
    type: 'health_center',
    name: 'hc1',
    parent: { _id: 'PARENT_PLACE' },
    contact: { _id: 'supervisor1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
  },
  {
    _id: 'supervisor1',
    type: 'person',
    name: 'supervisor1',
    parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } },
  },
  {
    _id: 'clinic1',
    type: 'clinic',
    name: 'clinic1',
    parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } },
    contact: { _id: 'chw1', parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } } },
  },
  {
    _id: 'chw1',
    type: 'person',
    name: 'chw1',
    parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
  },
  {
    _id: 'patient1',
    type: 'person',
    name: 'patient1',
    parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
  },
  {
    _id: 'patient2',
    type: 'person',
    name: 'patient2',
    parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
  },
  {
    _id: 'DISTRICT_2',
    type: 'district_hospital',
    name: 'District2',
    contact: { _id: 'supervisor2', parent: { _id: 'DISTRICT_2' } },
  },
  {
    _id: 'supervisor2',
    type: 'person',
    name: 'supervisor2',
    parent: { _id: 'DISTRICT_2' },
  },
  {
    _id: 'hc2',
    type: 'health_center',
    name: 'hc1',
    parent: { _id: 'DISTRICT_2' },
    contact: { _id: 'chw2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
  },
  {
    _id: 'chw2',
    type: 'person',
    name: 'chw2',
    parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } },
  },
  {
    _id: 'clinic2',
    type: 'clinic',
    name: 'clinic2',
    parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } },
    contact: { _id: 'patient3', parent: { _id: 'clinic2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } } },
  },
  {
    _id: 'patient3',
    type: 'person',
    name: 'patient3',
    parent: { _id: 'clinic2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
  },
  {
    _id: 'patient4',
    type: 'person',
    name: 'patient4',
    parent: { _id: 'clinic2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
  },
  {
    _id: 'center_with_linked_contacts',
    type: 'health_center',
    parent: { _id: 'PARENT_PLACE' },
    name: 'center_with_linked_contacts',
    contact: { _id: 'chw_with_linked_contacts' },
    linked_contacts: {
      a: 'patient3',
      b: 'hc2',
    }
  },
  {
    _id: 'clinic_with_linked_contacts',
    type: 'clinic',
    parent: { _id: 'center_with_linked_contacts', parent: { _id: 'PARENT_PLACE' } },
    contact: { _id: 'chw_with_linked_contacts' },
    linked_contacts: {
      first: 'chw_with_linked_contacts',
      second: { _id: 'patient4' },
    }
  },
  {
    _id: 'chw_with_linked_contacts',
    type: 'person',
    parent: {
      _id: 'clinic_with_linked_contacts',
      parent: { _id: 'center_with_linked_contacts', parent: { _id: 'PARENT_PLACE' } },
    },
    name: 'chw_with_linked_contacts',
    linked_contacts: {
      one: { _id: 'patient_with_linked_contacts' },
      three: false,
      four: [],
    },
  },
  {
    _id: 'patient_with_linked_contacts',
    type: 'person',
    parent: {
      _id: 'clinic_with_linked_contacts',
      parent: { _id: 'center_with_linked_contacts', parent: { _id: 'PARENT_PLACE' } },
    },
    name: 'patient_with_linked_contacts',
    linked_contacts: {
      _id: 'center_with_linked_contacts',
    },
  },
  {
    _id: 'patient_with_empty_linked_contacts',
    type: 'person',
    parent: {
      _id: 'clinic_with_linked_contacts',
      parent: { _id: 'center_with_linked_contacts', parent: { _id: 'PARENT_PLACE' } },
    },
    name: 'patient_with_linked_contacts',
    linked_contacts: {},
  }
];

const reports = [
  {
    _id: 'report1',
    type: 'data_record',
    contact: { _id: 'chw2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
    fields: {
      patient_id: 'patient3'
    }
  },
];

const docs = [...contacts, ...reports];

const findDoc = id => docs.find(d => d._id === id);

const hydrateContact = doc => {
  const hydrated = _.cloneDeep(doc);
  if (hydrated.parent) {
    hydrated.parent = hydrateContact(_.cloneDeep(findDoc(doc.parent._id)));
  }
  if (hydrated.contact) {
    hydrated.contact = _.cloneDeep(findDoc(doc.contact._id));
  }
  if (hydrated.linked_contacts) {
    Object.keys(hydrated.linked_contacts).forEach(key => {
      const linkedContact = hydrated.linked_contacts[key];
      if (!linkedContact) {
        return;
      }
      const id = typeof linkedContact === 'string' ? linkedContact : linkedContact._id;
      if (!id) {
        return;
      }

      hydrated.linked_contacts[key] = _.cloneDeep(findDoc(id));
    });
  }
  return hydrated;
};

const hydrateReport = doc => {
  const hydrated = _.cloneDeep(doc);
  if (hydrated.contact) {
    hydrated.contact = hydrateContact(_.cloneDeep(findDoc(doc.contact._id)));
  }
  if (hydrated.fields.patient_id) {
    hydrated.patient = hydrateContact(_.cloneDeep(findDoc(hydrated.fields.patient_id)));
  }

  return hydrated;
};

describe('Hydration API', () => {
  beforeAll(done => utils.saveDocs(docs).then(() => utils.createUsers(users).then(done)));
  afterAll(done => utils.deleteUsers(users).then(() => utils.revertDb()).then(done));

  beforeEach(() => {
    offlineRequestOptions = { path: '/api/v1/hydrate', auth: { username: 'offline', password }, };
    onlineRequestOptions = { path: '/api/v1/hydrate', auth: { username: 'online', password }, };
    noAuthRequestOptions = { path: '/api/v1/hydrate', headers: { 'Accept': 'application/json' }, noAuth: true };
  });

  describe('it should block unauthenticated requests', () => {
    it('using GET', () => {
      noAuthRequestOptions.qs = { doc_ids: ['fixture:offline'] };
      return utils
        .request(noAuthRequestOptions)
        .then(() => chai.assert.fail('Should not allow unauthenticated requests'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(401);
          chai.expect(err.error).to.deep.include({ code: 401, error: 'unauthorized' });
        });
    });

    it('using POST', () => {
      noAuthRequestOptions.body = { doc_ids: ['fixture:offline'] };
      noAuthRequestOptions.method = 'POST';
      return utils
        .request(noAuthRequestOptions)
        .then(() => chai.assert.fail('Should not allow unauthenticated requests'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(401);
          chai.expect(err.error).to.deep.include({ code: 401, error: 'unauthorized' });
        });
    });
  });

  describe('it should block offline users', () => {
    it('using GET', () => {
      offlineRequestOptions.qs = { doc_ids: ['fixture:offline'] };
      return utils
        .request(offlineRequestOptions)
        .then(() => chai.assert.fail('Should not allow offline users'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(403);
          chai.expect(err.error).to.deep.include({ code: 403, error: 'forbidden' });
        });
    });

    it('using POST', () => {
      offlineRequestOptions.body = { doc_ids: ['fixture:offline'] };
      offlineRequestOptions.method = 'POST';
      return utils
        .request(offlineRequestOptions)
        .then(() => chai.assert.fail('Should not allow offline users'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(403);
          chai.expect(err.error).to.deep.include({ code: 403, error: 'forbidden' });
        });
    });
  });

  describe('GET', () => {
    it('should fail when no param', () => {
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`doc_ids` parameter must be a json array.'
          });
        });
    });

    it('should fail with incorrect param', () => {
      onlineRequestOptions.qs = { doc_ids: 'random string' };
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`doc_ids` parameter must be a json array.'
          });
        });
    });

    it('should output correct result with 1 requested doc', () => {
      onlineRequestOptions.qs = { doc_ids: ['patient4'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient4',
            doc: hydrateContact(contacts.find(doc => doc._id === 'patient4')),
          }
        ]);
      });
    });

    it('should output correct result with multiple doc ids', () => {
      onlineRequestOptions.qs = { doc_ids: ['patient2', 'hc2', 'report1'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient2',
            doc: hydrateContact(findDoc('patient2')),
          },
          {
            id: 'hc2',
            doc: hydrateContact(findDoc('hc2')),
          },
          {
            id: 'report1',
            doc: hydrateReport(findDoc('report1')),
          },
        ]);
      });
    });

    it('should support missing docs with single requested id', () => {
      onlineRequestOptions.qs = { doc_ids: ['i dont exist'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).to.deep.equal([
          {
            id: 'i dont exist',
            error: 'not_found',
          }
        ]);
      });
    });

    it('should support missing docs with multiple id', () => {
      onlineRequestOptions.qs = { doc_ids: ['chw1', 'not_a_patient', 'other', 'hc1'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'chw1',
            doc: hydrateContact(findDoc('chw1')),
          },
          {
            id: 'not_a_patient',
            error: 'not_found',
          },
          {
            id: 'other',
            error: 'not_found',
          },
          {
            id: 'hc1',
            doc: hydrateContact(findDoc('hc1')),
          },
        ]);
      });
    });

    it('should correctly hydrate single linked contact', () => {
      onlineRequestOptions.qs = { doc_ids: ['clinic_with_linked_contacts'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'clinic_with_linked_contacts',
            doc: hydrateContact(findDoc('clinic_with_linked_contacts')),
          },
        ]);
      });
    });

    it('should correctly hydrate single linked contact', () => {
      onlineRequestOptions.qs = { doc_ids: ['patient_with_linked_contacts'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient_with_linked_contacts',
            doc: hydrateContact(findDoc('patient_with_linked_contacts')),
          },
        ]);
      });
    });

    it('should correctly hydrate single linked contacts with null values', () => {
      onlineRequestOptions.qs = { doc_ids: ['chw_with_linked_contacts'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'chw_with_linked_contacts',
            doc: hydrateContact(findDoc('chw_with_linked_contacts')),
          },
        ]);
      });
    });

    it('should correctly hydrate multiple linked contacts', () => {
      onlineRequestOptions.qs = { doc_ids: [
        'patient_with_empty_linked_contacts',
        'center_with_linked_contacts',
        'clinic_with_linked_contacts',
      ]};

      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient_with_empty_linked_contacts',
            doc: hydrateContact(findDoc('patient_with_empty_linked_contacts')),
          },
          {
            id: 'center_with_linked_contacts',
            doc: hydrateContact(findDoc('center_with_linked_contacts')),
          },
          {
            id: 'clinic_with_linked_contacts',
            doc: hydrateContact(findDoc('clinic_with_linked_contacts')),
          },
        ]);
      });
    });
  });

  describe('POST', () => {
    beforeEach(() => {
      onlineRequestOptions.method = 'POST';
    });

    it('should fail when no param', () => {
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`doc_ids` parameter must be a json array.'
          });
        });
    });

    it('should fail with incorrect param', () => {
      onlineRequestOptions.body = { doc_ids: 'random string' };
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`doc_ids` parameter must be a json array.'
          });
        });
    });

    it('should output correct result with 1 requested doc', () => {
      onlineRequestOptions.body = { doc_ids: ['patient3'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient3',
            doc: hydrateContact(contacts.find(doc => doc._id === 'patient3')),
          }
        ]);
      });
    });

    it('should output correct result with multiple', () => {
      onlineRequestOptions.body = { doc_ids: ['patient1', 'clinic2', 'report1'] };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient1',
            doc: hydrateContact(findDoc('patient1')),
          },
          {
            id: 'clinic2',
            doc: hydrateContact(findDoc('clinic2')),
          },
          {
            id: 'report1',
            doc: hydrateReport(findDoc('report1')),
          },
        ]);
      });
    });

    it('should primarily use the query param', () => {
      onlineRequestOptions.body = { doc_ids: ['patient1', 'clinic2'] };
      onlineRequestOptions.qs = { doc_ids: ['patient2', 'clinic1'] };

      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal([
          {
            id: 'patient2',
            doc: hydrateContact(findDoc('patient2')),
          },
          {
            id: 'clinic1',
            doc: hydrateContact(findDoc('clinic1')),
          },
        ]);
      });
    });
  });

});
