const utils = require('../../utils');
const sentinelUtils = require('./utils');
const uuid = require('uuid');

const NBR_DOCS = 300;

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'district_hospital',
    reported_date: new Date().getTime()
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'health_center',
    parent: { _id: 'district_hospital' },
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'chw1',
      parent:  { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'chw',
    type: 'person',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone1',
    name: 'chw1',
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'person',
    patient_id: 'patient',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    reported_date: new Date().getTime()
  }
];

const report = {
  type: 'data_record',
  from: 'phone1',
  fields: {
    patient_id: 'patient'
  },
  reported_date: new Date().getTime()
};

let originalTimeout;

describe('Sentinel queue drain', () => {
  beforeAll(done => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
    utils.saveDocs(contacts).then(done);
  });
  afterAll(done => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    utils.revertDb().then(done);
  });
  afterEach(done => utils.revertDb(contacts.map(c => c._id), true).then(done));

  it('should drain queue, processing every doc', () => {
    // This test takes 40s on my machine and it would be nice to know what's going on
    console.log('Starting queue drain test, this may take awhile...');

    const settings = {
      transitions: {
        update_clinics: true,
        default_responses: true
      },
      default_responses: {
        start_date: '2018-01-01'
      }
    };

    const docs = [];
    const ids = [];

    for (let i = 0; i < NBR_DOCS; i++) {
      const id = uuid();
      docs.push(Object.assign({ _id: id }, report));
      ids.push(id);
    }

    let tombstonesIds;

    return utils
      .updateSettings(settings)
      .then(() => utils.saveDocs(docs))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updated.forEach(doc => {
          expect(doc.contact).toBeDefined();
          expect(doc.contact._id).toEqual('chw');
          expect(doc.tasks).toBeDefined();
          expect(doc.tasks.length).toEqual(1);
          expect(doc.tasks[0].messages[0].to).toEqual('phone1');
        });
      })
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          expect(info.transitions).toBeDefined();
          expect(info.transitions.default_responses).toBeDefined();
          expect(info.transitions.default_responses.ok).toBe(true);
          expect(info.transitions.update_clinics).toBeDefined();
          expect(info.transitions.update_clinics.ok).toBe(true);
        });
      })
      .then(() => utils.deleteDocs(ids))
      .then(results => {
        tombstonesIds = results.map(result => result.id + '____' + result.rev + '____' + 'tombstone');
      })
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => utils.getDocs(tombstonesIds))
      .then(tombstones => {
        tombstones.forEach(tombstone => {
          expect(tombstone.type).toEqual('tombstone');
          expect(tombstone.tombstone).toBeDefined();
        });
      });
  });
});
