const utils = require('../../utils');
const sentinelUtils = require('../../utils/sentinel');
const uuid = require('uuid').v4;

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

describe('Sentinel queue drain', () => {
  before(() => utils.saveDocs(contacts));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(contacts.map(c => c._id), true));

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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(docs))
      .then(() => sentinelUtils.waitForSentinel(ids))
      .then(() => utils.getDocs(ids))
      .then(updated => {
        updated.forEach(doc => {
          expect(doc.contact).to.have.property('_id', 'chw');
          expect(doc.tasks).to.have.lengthOf(1);
          expect(doc.tasks[0].messages[0].to).to.equal('phone1');
        });
      })
      .then(() => sentinelUtils.getInfoDocs(ids))
      .then(infos => {
        infos.forEach(info => {
          expect(info.transitions.default_responses.ok).to.be.true;
          expect(info.transitions.update_clinics.ok).to.be.true;
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
          expect(tombstone.type).to.equal('tombstone');
          expect(tombstone.tombstone).to.have.property('type', 'data_record');
        });
      });
  }).timeout(300 * 1000);

  it('queue should work after restarting haproxy', async () => {
    await utils.stopHaproxy(); // this will also crash Sentinel and API
    await utils.startHaproxy();
    // the nginx restart is required because of https://github.com/medic/cht-core/issues/8205
    await utils.stopNginx();
    await utils.startNginx();
    await utils.listenForApi();
    const settings = { transitions: { update_clinics: true } };
    await utils.updateSettings(settings, 'api');

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: 'phone1',
      fields: { patient_id: 'patient' },
      reported_date: new Date().getTime(),
    };
    await utils.saveDoc(doc);
    await sentinelUtils.waitForSentinel();
    const [info] = await sentinelUtils.getInfoDocs(doc._id);
    expect(info.transitions.update_clinics.ok).to.be.true;
  });
});
