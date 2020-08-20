const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');

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
      _id: 'person',
      parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'person',
    patient_id: '99999',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  },
  {
    _id: 'person2',
    name: 'Person',
    type: 'person',
    patient_id: '101010',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+99998888',
    reported_date: new Date().getTime()
  },
  {
    _id: 'supervisor',
    name: 'Supervisor',
    type: 'person',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    phone: '+111222',
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic2',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'person',
      parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person3',
    name: 'Person',
    type: 'person',
    patient_id: '202020',
    parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+202020',
    reported_date: new Date().getTime()
  },
];

describe('update_scheduled_reports', () => {
  beforeAll(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb(contacts.map(c => c._id), true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { update_scheduled_reports: false }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month: 2 },
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should be skipped when not matching or no clinic', () => {
    const settings = {
      transitions: { update_scheduled_reports: true }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018 },
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month_num: 2 },
      contact: { _id: 'supervisor', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([ doc1._id, doc2._id ]))
      .then(() => sentinelUtils.getInfoDocs([ doc1._id, doc2._id ]))
      .then(infos => {
        expect(Object.keys(infos[0].transitions).length).toEqual(0);
        expect(Object.keys(infos[1].transitions).length).toEqual(0);
      });
  });

  it('should do nothing when no duplicates', () => {
    const settings = {
      transitions: { update_scheduled_reports: true }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month: 2},
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month_num: 3 },
      contact: {
        _id: 'person2',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc3 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, week: 22 },
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc4 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, week_number: 43 },
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2, doc3, doc4]))
      .then(() => sentinelUtils.waitForSentinel([ doc1._id, doc2._id, doc3._id, doc4._id ]))
      .then(() => sentinelUtils.getInfoDocs([ doc1._id, doc2._id, doc3._id, doc4._id ]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_scheduled_reports.ok).toEqual(true);
        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.update_scheduled_reports.ok).toEqual(true);
        expect(infos[2].transitions).toBeDefined();
        expect(infos[2].transitions.update_scheduled_reports.ok).toEqual(true);
        expect(infos[3].transitions).toBeDefined();
        expect(infos[3].transitions.update_scheduled_reports.ok).toEqual(true);
      });
  });

  it('should delete the older duplicate', () => {
    const settings = {
      transitions: { update_scheduled_reports: true }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month: 2 },
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month: 2 },
      contact: {
        _id: 'person2',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc3 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month: 2 },
      contact: {
        _id: 'supervisor',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc4 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, week_number: 43 },
      contact: {
        _id: 'person2',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    const doc5 = {
      _id: uuid(),
      type: 'data_record',
      form: 'form',
      fields: { year: 2018, month: 2 },
      contact: {
        _id: 'person3',
        parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2, doc3, doc4, doc5]))
      .then(() => sentinelUtils.waitForSentinel([ doc1._id, doc2._id, doc3._id, doc4._id, doc5._id ]))
      .then(() => utils.getDocs([ doc1._id, doc2._id, doc3._id, doc4._id, doc5._id ]))
      .then(updated => {
        //only one of the of doc1, doc2 and doc3 should still exist
        const duplicates = updated.slice(0, 3);
        expect(duplicates.filter(doc => doc).length).toEqual(1);

        expect(updated[3].type).toEqual('data_record');
        expect(updated[4].type).toEqual('data_record');
      })
      .then(() => utils.stopSentinel())
      .then(() => utils.startSentinel())
      .then(() => sentinelUtils.waitForBackgroundCleanup())
      .then(() => sentinelUtils.getInfoDocs([ doc1._id, doc2._id, doc3._id, doc4._id, doc5._id ]))
      .then(infos => {
        //only one of the of doc1, doc2 and doc3 should still exist
        const duplicates = infos.slice(0, 3);
        expect(duplicates.filter(info => info).length).toEqual(1);

        expect(infos[3].transitions).toBeDefined();
        expect(infos[3].transitions.update_scheduled_reports.ok).toEqual(true);
        expect(infos[4].transitions).toBeDefined();
        expect(infos[4].transitions.update_scheduled_reports.ok).toEqual(true);
      });
  });
});
