const utils = require('../../../utils'),
      sentinelUtils = require('../utils'),
      uuid = require('uuid');


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
    contact: { _id: 'person', parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'person',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic2',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: { _id: 'person2', parent:  { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } } },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person2',
    name: 'Person',
    type: 'person',
    parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  },
];

describe('muting', () => {
  beforeEach(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { muting: false },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_uuid: 'person'
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
      });
  });

  it('should be skipped when no matching config', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'NOT_MUTE',
      fields: {
        patient_uuid: 'person'
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
      });
  });

  it('should add error when contact not found', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute'],
        messages: [{
          event_type: 'contact_not_found',
          recipient: '12345',
          message: [{
            locale: 'en',
            content: 'Contact not found'
          }],
        }]
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: 'unknown'
      },
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.muting).toBeDefined();
        expect(info.transitions.muting.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(1);
        expect(updated.tasks[0].messages[0].message).toEqual('Contact not found');
        expect(updated.tasks[0].messages[0].to).toEqual('12345');
        expect(updated.tasks[0].state).toEqual('pending');

        expect(updated.errors).toBeDefined();
        expect(updated.errors.length).toEqual(1);
        expect(updated.errors[0].message).toEqual('Contact not found');
      });
  });

  it('should mute and unmute a person', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute'],
        messages: [{
          event_type: 'mute',
          recipient: '12345',
          message: [{
            locale: 'en',
            content: 'Contact muted'
          }],
        }, {
          event_type: 'unmute',
          recipient: '12345',
          message: [{
            locale: 'en',
            content: 'Contact unmuted'
          }],
        }, {
          event_type: 'already_muted',
          recipient: '12345',
          message: [{
            locale: 'en',
            content: 'Contact already muted'
          }],
        }, {
          event_type: 'already_unmuted',
          recipient: '12345',
          message: [{
            locale: 'en',
            content: 'Contact already unmuted'
          }],
        }]
      }
    };

    const mute1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime()
    };

    const mute2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime()
    };

    const unmute1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime()
    };

    const unmute2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime()
    };

    let muteTime,
        unmuteTime;

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(mute1))
      .then(() => sentinelUtils.waitForSentinel(mute1._id))
      .then(() => sentinelUtils.getInfoDocs([mute1._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].muted).toEqual(true);
        expect(infos[1].muting_history[0].report_id).toEqual(mute1._id);
        muteTime = infos[1].muting_history[0].date;
      })
      .then(() => utils.getDocs([mute1._id, 'person', 'person2', 'clinic']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact muted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[1].muted).toEqual(muteTime);

        expect(updated[2].muted).not.toBeDefined();
        expect(updated[3].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(mute2))
      .then(() => sentinelUtils.waitForSentinel(mute2._id))
      .then(() => sentinelUtils.getInfoDocs([mute2._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].date).toEqual(muteTime);
      })
      .then(() => utils.getDocs([mute2._id, 'person']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact already muted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[1].muted).toEqual(muteTime);
      })
      .then(() => utils.saveDoc(unmute1))
      .then(() => sentinelUtils.waitForSentinel(unmute1._id))
      .then(() => sentinelUtils.getInfoDocs([unmute1._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(2);
        expect(infos[1].muting_history[1].muted).toEqual(false);
        expect(infos[1].muting_history[1].report_id).toEqual(unmute1._id);
        unmuteTime = infos[1].muting_history[1].date;
      })
      .then(() => utils.getDocs([unmute1._id, 'person']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact unmuted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[1].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(unmute2))
      .then(() => sentinelUtils.waitForSentinel(unmute2._id))
      .then(() => sentinelUtils.getInfoDocs([unmute2._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(2);
        expect(infos[1].muting_history[1].date).toEqual(unmuteTime);
      })
      .then(() => utils.getDocs([unmute2._id, 'person']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact already unmuted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[1].muted).not.toBeDefined();
      })
  });

  it('should mute and unmute a clinic', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      }
    };

    const mute = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        place_id: 'clinic'
      },
      reported_date: new Date().getTime()
    };

    const unmute = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        place_id: 'clinic'
      },
      reported_date: new Date().getTime()
    };

    let muteTime;

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(mute))
      .then(() => sentinelUtils.waitForSentinel(mute._id))
      .then(() => sentinelUtils.getInfoDocs([mute._id, 'clinic', 'person', 'clinic2', 'person2']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].muted).toEqual(true);
        expect(infos[1].muting_history[0].report_id).toEqual(mute._id);
        muteTime = infos[1].muting_history[0].date;

        expect(infos[2].muting_history).toBeDefined();
        expect(infos[2].muting_history.length).toEqual(1);

        expect(infos[2].muting_history[0]).toEqual({
          muted: true,
          report_id: mute._id,
          date: muteTime
        });

        expect(infos[3].muting_history).not.toBeDefined();
        expect(infos[4].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs(['clinic', 'person', 'person2', 'clinic2']))
      .then(updated => {
        expect(updated[0].muted).toEqual(muteTime);
        expect(updated[1].muted).toEqual(muteTime);

        expect(updated[2].muted).not.toBeDefined();
        expect(updated[3].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(unmute))
      .then(() => sentinelUtils.waitForSentinel(unmute._id))
      .then(() => sentinelUtils.getInfoDocs([unmute._id, 'clinic', 'person', 'clinic2', 'person2']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(2);
        expect(infos[1].muting_history[0]).toEqual({
          muted: true,
          report_id: mute._id,
          date: muteTime
        });
        expect(infos[1].muting_history[1].muted).toEqual(false);
        expect(infos[1].muting_history[1].report_id).toEqual(unmute._id);

        expect(infos[2].muting_history).toBeDefined();
        expect(infos[2].muting_history.length).toEqual(2);
        expect(infos[2].muting_history[0]).toEqual({
          muted: true,
          report_id: mute._id,
          date: muteTime
        });
        expect(infos[2].muting_history[1].muted).toEqual(false);
        expect(infos[2].muting_history[1].report_id).toEqual(unmute._id);

        expect(infos[3].muting_history).not.toBeDefined();
        expect(infos[4].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs(['clinic', 'person', 'person2', 'clinic2']))
      .then(updated => {
        expect(updated[0].muted).not.toBeDefined();
        expect(updated[1].muted).not.toBeDefined();
        expect(updated[2].muted).not.toBeDefined();
        expect(updated[3].muted).not.toBeDefined();
      });
  });

});
