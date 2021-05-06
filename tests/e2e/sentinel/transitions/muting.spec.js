const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');
const _ = require('lodash');

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
    place_id: 'the_clinic',
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
  }
];

const extraContacts = [
  {
    _id: 'clinic2',
    name: 'Clinic',
    type: 'clinic',
    place_id: 'the_other_clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'person2',
      parent:  { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person2',
    name: 'Person',
    type: 'person',
    parent: { _id: 'clinic2', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  }
];

const notToday = 36 * 24 * 60 * 60 * 1000;

const expectSameState = (original, updated) => {
  expect(original.scheduled_tasks.length).toBe(updated.scheduled_tasks.length, `length not equal ${original._id}`);
  original.scheduled_tasks.forEach((task, i) => {
    expect(task.state).toBe(updated.scheduled_tasks[i].state, `state not equal ${original._id}, task ${i}`);
  });
};

const expectStates = (updated, ...states) => {
  expect(updated.scheduled_tasks.length).toBe(states.length);
  updated.scheduled_tasks.forEach((task, i) => {
    expect(task.state).toBe(states[i], `state not equal ${updated._id}, task ${i}`);
  });
};

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
      },
      forms: { mute: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_uuid: 'person'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should be skipped when no matching config', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      },
      forms: { NOT_MUTE: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'NOT_MUTE',
      fields: {
        patient_uuid: 'person'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should add error when contact not found, should add error when invalid', () => {
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
        }],
        validations: {
          list: [
            {
              property: 'somefield',
              rule: 'lenMin(5) && lenMax(10)',
              message: [{
                locale: 'en',
                content: 'somefield id incorrect'
              }],
            },
          ],
          join_responses: false
        }
      },
      forms: { mute: { } }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      from: '+444999',
      fields: {
        patient_id: 'unknown',
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      from: '+444999',
      fields: {
        patient_id: '99999',
        somefield: 'this will not pass validation'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.muting).toBeDefined();
        expect(infos[1].transitions.muting.ok).toBe(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact not found');
        expect(updated[0].tasks[0].messages[0].to).toEqual('+444999');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[0].errors).toBeDefined();
        expect(updated[0].errors.length).toEqual(1);
        expect(updated[0].errors[0].message).toEqual('Contact not found');

        expect(updated[1].tasks).toBeDefined();
        expect(updated[1].tasks.length).toEqual(1);
        expect(updated[1].tasks[0].messages[0].message).toEqual('somefield id incorrect');
        expect(updated[1].tasks[0].messages[0].to).toEqual('+444999');
        expect(updated[1].tasks[0].state).toEqual('pending');

        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].message).toEqual('somefield id incorrect');
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
      },
      forms: { mute: { }, unmute: { } }
    };

    const mute1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const mute2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const unmute1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const unmute2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    let muteTime;
    let unmuteTime;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(extraContacts))
      .then(() => utils.saveDoc(mute1))
      .then(() => sentinelUtils.waitForSentinel(mute1._id))
      .then(() => sentinelUtils.getInfoDocs([mute1._id, 'person', 'person2', 'clinic']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].muted).toEqual(true);
        expect(infos[1].muting_history[0].report_id).toEqual(mute1._id);
        muteTime = infos[1].muting_history[0].date;

        expect(infos[2].muting_history).not.toBeDefined();
        expect(infos[3].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs([mute1._id, 'person', 'person2', 'clinic']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact muted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('+444999');
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
        expect(updated[0].tasks[0].messages[0].to).toEqual('+444999');
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
        expect(updated[0].tasks[0].messages[0].to).toEqual('+444999');
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
        expect(updated[0].tasks[0].messages[0].to).toEqual('+444999');
        expect(updated[0].tasks[0].state).toEqual('pending');

        expect(updated[1].muted).not.toBeDefined();
      });
  });

  it('should mute and unmute a clinic', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      },
      forms: { mute: { }, unmute: { } }
    };

    const mute = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        place_id: 'clinic'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const unmute = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        place_id: 'clinic'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    let muteTime;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(extraContacts))
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

  it('should mute person, mute health_center & unmute person correctly', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      },
      forms: { mute: { }, unmute: { } }
    };

    const mute = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: '99999'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const muteHC = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        place_id: 'health_center'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const unmute = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        patient_id: '99999'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    let mutePersonTime;
    let muteHCTime;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(mute))
      .then(() => sentinelUtils.waitForSentinel(mute._id))
      .then(() => sentinelUtils.getInfoDocs([mute._id, 'person', 'clinic', 'health_center']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].muted).toEqual(true);
        expect(infos[1].muting_history[0].report_id).toEqual(mute._id);
        mutePersonTime = infos[1].muting_history[0].date;

        expect(infos[2].muting_history).not.toBeDefined();
        expect(infos[3].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs(['person', 'clinic', 'health_center']))
      .then(updated => {
        expect(updated[0].muted).toEqual(mutePersonTime);
        expect(updated[1].muted).not.toBeDefined();
        expect(updated[2].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(muteHC))
      .then(() => sentinelUtils.waitForSentinel(muteHC._id))
      .then(() => sentinelUtils.getInfoDocs([muteHC._id, 'person', 'health_center', 'clinic', 'district_hospital']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0]).toEqual({
          muted: true,
          date: mutePersonTime,
          report_id: mute._id
        });

        expect(infos[2].muting_history).toBeDefined();
        expect(infos[2].muting_history.length).toEqual(1);
        expect(infos[2].muting_history[0].muted).toEqual(true);
        expect(infos[2].muting_history[0].report_id).toEqual(muteHC._id);
        muteHCTime = infos[2].muting_history[0].date;

        expect(infos[3].muting_history).toBeDefined();
        expect(infos[3].muting_history.length).toEqual(1);
        expect(infos[3].muting_history[0]).toEqual({
          muted: true,
          date: muteHCTime,
          report_id: muteHC._id
        });

        expect(infos[4].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs(['person', 'health_center', 'clinic', 'district_hospital']))
      .then(updated => {
        expect(updated[0].muted).toEqual(mutePersonTime);
        expect(updated[1].muted).toEqual(muteHCTime);
        expect(updated[2].muted).toEqual(muteHCTime);
        expect(updated[3].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(unmute))
      .then(() => sentinelUtils.waitForSentinel(unmute._id))
      .then(() => sentinelUtils.getInfoDocs([unmute._id, 'person', 'health_center', 'clinic', 'district_hospital']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.muting).toBeDefined();
        expect(infos[0].transitions.muting.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(2);
        expect(infos[1].muting_history[1].muted).toEqual(false);
        expect(infos[1].muting_history[1].report_id).toEqual(unmute._id);

        expect(infos[2].muting_history).toBeDefined();
        expect(infos[2].muting_history.length).toEqual(2);
        expect(infos[2].muting_history[1].muted).toEqual(false);
        expect(infos[2].muting_history[1].report_id).toEqual(unmute._id);

        expect(infos[3].muting_history).toBeDefined();
        expect(infos[3].muting_history.length).toEqual(2);
        expect(infos[3].muting_history[1].muted).toEqual(false);
        expect(infos[3].muting_history[1].report_id).toEqual(unmute._id);

        expect(infos[4].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs(['person', 'health_center', 'clinic', 'district_hospital']))
      .then(() => updated => {
        expect(updated[0].muted).not.toBeDefined();
        expect(updated[1].muted).not.toBeDefined();
        expect(updated[2].muted).not.toBeDefined();
        expect(updated[3].muted).not.toBeDefined();
      });
  });

  it('should auto mute new contacts with muted parents', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      },
      forms: { mute: { }, unmute: { } }
    };

    const mute = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        place_id: 'clinic'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const person = {
      _id: 'person3',
      name: 'Person',
      type: 'person',
      parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
      phone: '+444999'
    };

    const personWithContactType = {
      _id: 'person4',
      name: 'Person',
      type: 'person',
      contact_type: 'not a person',
      parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
      phone: '+444999'
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(mute))
      .then(() => sentinelUtils.waitForSentinel(mute._id))
      .then(() => utils.saveDocs([person, personWithContactType]))
      .then(() => sentinelUtils.waitForSentinel([person._id, personWithContactType._id]))
      .then(() => sentinelUtils.getInfoDocs([person._id, personWithContactType._id]))
      .then(([infoPerson, infoPersonWithContactType]) => {
        expect(infoPerson.transitions).toBeDefined();
        expect(infoPerson.transitions.muting).toBeDefined();
        expect(infoPerson.transitions.muting.ok).toBe(true);

        expect(infoPerson.muting_history).toBeDefined();
        expect(infoPerson.muting_history.length).toEqual(1);
        expect(infoPerson.muting_history[0].muted).toEqual(true);
        expect(infoPerson.muting_history[0].report_id).toEqual(mute._id);

        expect(infoPersonWithContactType.transitions.muting.ok).toBe(true);
        expect(infoPersonWithContactType.muting_history.length).toEqual(1);
        expect(infoPersonWithContactType.muting_history[0].report_id).toEqual(mute._id);
      })
      .then(() => utils.getDocs([person._id, personWithContactType._id]))
      .then(([updatedPerson, updatedPersonWithContactType]) => {
        expect(updatedPerson.muted).toBeDefined();
        expect(updatedPersonWithContactType.muted).toBeDefined();
      });
  });

  it('should mute and unmute schedules', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      },
      registrations: [{ form: 'xml_form' }, { form: 'sms_form_1' }, { form: 'sms_form_2' }],
      forms: { sms_form_1: { }, sms_form_2: { } }
    };

    const reports = [
      { // not a registration
        _id: 'no_registration_config',
        type: 'data_record',
        content_type: 'xml',
        form: 'test_form',
        fields: {
          patient_id: 'person'
        },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic', },
          { group: 2, state: 'scheduled', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // not a registration
        _id: 'incorrect_content',
        type: 'data_record',
        form: 'xml_form',
        fields: {
          patient_id: 'person'
        },
        scheduled_tasks: [
          { group: 1, state: 'scheduled', translation_key: 'beta', recipient: 'clinic' },
          { group: 2, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'pending', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // not a registration
        _id: 'sms_without_contact',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          patient_id: 'person'
        },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic' },
          { group: 2, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'scheduled', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // valid registration
        _id: 'registration_1',
        type: 'data_record',
        content_type: 'xml',
        form: 'xml_form',
        fields: {
          patient_id: 'person'
        },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
          { group: 2, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
          { group: 3, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // valid registration
        _id: 'registration_2',
        type: 'data_record',
        form: 'sms_form_1',
        fields: {
          patient_id: 'person'
        },
        contact: { _id: 'person' },
        scheduled_tasks: [
          { group: 1, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
          { group: 2, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
        ]
      },
      { // valid registration
        _id: 'registration_3',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'clinic'
        },
        contact: { _id: 'person' },
        scheduled_tasks: [
          { group: 1, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 2, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
          { group: 3, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
        ]
      },
      { // valid registration from other "branch"
        _id: 'registration_4',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          patient_id: 'person2'
        },
        contact: { _id: 'person2' },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
          { group: 2, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
          { group: 3, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // not a registration for place
        _id: 'no_registration_config_clinic',
        type: 'data_record',
        content_type: 'xml',
        form: 'test_form',
        fields: {
          place_id: 'the_clinic',
        },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic', },
          { group: 2, state: 'scheduled', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // not a registration for place
        _id: 'incorrect_content_clinic',
        type: 'data_record',
        form: 'xml_form',
        fields: {
          place_id: 'the_clinic',
        },
        scheduled_tasks: [
          { group: 1, state: 'scheduled', translation_key: 'beta', recipient: 'clinic' },
          { group: 2, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'pending', translation_key: 'beta', recipient: 'clinic' },
        ],
      },
      { // not a registration for place
        _id: 'sms_without_contact_clinic',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_clinic',
        },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic' },
          { group: 2, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 3, state: 'scheduled', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // valid registration for place
        _id: 'registration_1_clinic',
        type: 'data_record',
        content_type: 'xml',
        form: 'xml_form',
        fields: {
          place_id: 'the_clinic',
        },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
          { group: 2, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
          { group: 3, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
      { // valid registration for place
        _id: 'registration_3_clinic',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_clinic',
        },
        contact: { _id: 'person' },
        scheduled_tasks: [
          { group: 1, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
          { group: 2, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
          { group: 3, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
        ]
      },
      { // valid registration from other "branch"
        _id: 'registration_4_clinic',
        type: 'data_record',
        form: 'sms_form_2',
        fields: {
          place_id: 'the_other_clinic',
        },
        contact: { _id: 'person2' },
        scheduled_tasks: [
          { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() + notToday },
          { group: 2, state: 'scheduled', translation_key: 'beta', recipient: 'clinic',
            due: new Date().getTime() - notToday },
          { group: 3, state: 'something_else', translation_key: 'beta', recipient: 'clinic' },
        ]
      },
    ];

    const mute = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        place_id: 'clinic'
      },
      content_type: 'xml',
      reported_date: new Date().getTime()
    };

    const unmute = {
      _id: uuid(),
      type: 'data_record',
      form: 'unmute',
      fields: {
        place_id: 'clinic'
      },
      content_type: 'xml',
      reported_date: new Date().getTime()
    };

    const nonRegistrationIds = [
      'no_registration_config', 'incorrect_content', 'sms_without_contact', 'registration_4',
      'no_registration_config_clinic', 'incorrect_content_clinic',
      'sms_without_contact_clinic', 'registration_4_clinic',
    ];
    const registrationIds = [
      'registration_1', 'registration_2', 'registration_3',
      'registration_1_clinic', 'registration_3_clinic',
    ];

    const getReportById = (id) => reports.find(report => report._id === id);

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(extraContacts))
      .then(() => utils.saveDocs(reports))
      .then(() => utils.saveDoc(mute))
      .then(() => sentinelUtils.waitForSentinel(mute._id))
      .then(() => utils.getDocs(nonRegistrationIds))
      .then(updated => {
        // none of the statuses changed!
        nonRegistrationIds.forEach((id, idx) => expectSameState(getReportById(id), updated[idx]));
      })
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        expectStates(updated[0], 'muted', 'muted', 'something_else');
        expectStates(updated[1], 'muted', 'something_else', 'muted');
        expectStates(updated[2], 'something_else', 'muted', 'muted');

        expectStates(updated[3], 'muted', 'muted', 'something_else');
        expectStates(updated[4], 'something_else', 'muted', 'muted');
      })
      .then(() => utils.saveDoc(unmute))
      .then(() => sentinelUtils.waitForSentinel(unmute._id))
      .then(() => utils.getDocs(nonRegistrationIds))
      .then(updated => {
        // none of the statuses changed!
        nonRegistrationIds.forEach((id, idx) => expectSameState(getReportById(id), updated[idx]));
      })
      .then(() => utils.getDocs(registrationIds))
      .then(updated => {
        expectStates(updated[0], 'scheduled', 'muted' /*due date in the past*/, 'something_else');
        expectStates(updated[1], 'muted'/*due date in the past*/, 'something_else', 'scheduled');
        expectStates(updated[2], 'something_else', 'scheduled', 'muted'/*due date in the past*/);

        expectStates(updated[3], 'scheduled', 'muted'/*due date in the past*/, 'something_else');
        expectStates(updated[4], 'something_else', 'scheduled', 'muted'/*due date in the past*/);
      });
  });

  describe('offline muting', () => {
    it('should add infodoc muting history for contacts muted offline and silence registrations', () => {
      const contact = {
        _id: uuid(),
        type: 'person',
        name: 'jane',
        muted: 12345,
        patient_id: 'the_person',
        muting_history: {
          last_update: 'offline',
          online: { muted: false },
          offline: [
            { muted: true, report_id: 'report1', date: 1 },
            { muted: false, report_id: 'report2', date: 2 },
            { muted: true, report_id: 'report3', date: 12345 },
          ],
        },
        reported_date: 1,
      };

      const settings = {
        transitions: { muting: true },
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute']
        },
        registrations: [{ form: 'xml_form' }, { form: 'sms_form_1' }, { form: 'sms_form_2' }],
        forms: { sms_form_1: { }, sms_form_2: { } }
      };

      const inTheFuture = new Date().getTime() + notToday;
      const now = new Date().toISOString();

      const reports = [
        {
          _id: uuid(),
          type: 'data_record',
          content_type: 'xml',
          form: 'xml_form',
          fields: {
            patient_id: contact.patient_id,
          },
          scheduled_tasks: [
            { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic', due: inTheFuture },
            { group: 2, state: 'pending', translation_key: 'beta', recipient: 'clinic', due: inTheFuture },
          ]
        },
        {
          _id: uuid(),
          type: 'data_record',
          content_type: 'xml',
          form: 'xml_form',
          fields: {
            patient_uuid: contact._id,
          },
          scheduled_tasks: [
            { group: 1, state: 'pending', translation_key: 'beta', recipient: 'clinic', due: inTheFuture },
            { group: 2, state: 'pending', translation_key: 'beta', recipient: 'clinic', due: inTheFuture },
          ]
        },
      ];

      const reportIds = reports.map(r => r._id);

      return utils
        .updateSettings(settings, 'sentinel')
        .then(() => utils.saveDocs(reports))
        .then(() => utils.saveDoc(contact))
        .then(() => sentinelUtils.waitForSentinel(contact._id))
        .then(() => Promise.all([
          utils.getDoc(contact._id),
          sentinelUtils.getInfoDoc(contact._id),
        ]))
        .then(([updatedContact, infodoc]) => {
          expect(updatedContact.muted).toBeGreaterThan(now);
          expect(updatedContact.muting_history.last_update).toBe('online');
          expect(updatedContact.muting_history.online.muted).toBe(true);

          expect(infodoc.transitions.muting.ok).toBe(true);
          expect(infodoc.muting_history).toEqual([
            { muted: true, date: updatedContact.muted, report_id: 'report3' },
          ]);
        })
        .then(() => utils.getDocs(reportIds))
        .then(updatedReports => {
          expectStates(updatedReports[0], 'muted', 'muted');
          expectStates(updatedReports[1], 'muted', 'muted');
        });
    });

    it('should add infodoc muting history for contacts unmuted offline and schedule registrations', () => {
      const contact = {
        _id: uuid(),
        type: 'person',
        name: 'jane',
        patient_id: 'the_person',
        muting_history: {
          last_update: 'offline',
          online: { muted: true },
          offline: [
            { muted: false, report_id: 'report1', date: 1 },
            { muted: true, report_id: 'report2', date: 2 },
            { muted: false, report_id: 'report3', date: 12345 },
          ],
        },
        reported_date: 1,
      };

      const settings = {
        transitions: { muting: true },
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute']
        },
        registrations: [{ form: 'xml_form' }, { form: 'sms_form_1' }, { form: 'sms_form_2' }],
        forms: { sms_form_1: { }, sms_form_2: { } }
      };

      const inTheFuture = new Date().getTime() + notToday;
      const inThePast = new Date().getTime() - notToday;

      const reports = [
        {
          _id: uuid(),
          type: 'data_record',
          content_type: 'xml',
          form: 'xml_form',
          fields: {
            patient_id: contact.patient_id,
          },
          scheduled_tasks: [
            { group: 1, state: 'muted', translation_key: 'beta', recipient: 'clinic', due: inTheFuture },
            { group: 2, state: 'muted', translation_key: 'beta', recipient: 'clinic', due: inThePast },
          ]
        },
        {
          _id: uuid(),
          type: 'data_record',
          content_type: 'xml',
          form: 'xml_form',
          fields: {
            patient_uuid: contact._id,
          },
          scheduled_tasks: [
            { group: 1, state: 'muted', translation_key: 'beta', recipient: 'clinic', due: inTheFuture },
            { group: 2, state: 'muted', translation_key: 'beta', recipient: 'clinic', due: inThePast },
          ]
        },
      ];

      const reportIds = reports.map(r => r._id);

      return utils
        .updateSettings(settings, 'sentinel')
        .then(() => utils.saveDocs(reports))
        .then(() => utils.saveDoc(contact))
        .then(() => sentinelUtils.waitForSentinel(contact._id))
        .then(() => utils.getDoc(contact._id))
        .then(updatedContact => {
          expect(updatedContact.muted).toBeUndefined();
          expect(updatedContact.muting_history.last_update).toBe('online');
          expect(updatedContact.muting_history.online.muted).toBe(false);
        })
        .then(() => sentinelUtils.getInfoDoc(contact._id))
        .then(infodoc => {
          expect(infodoc.transitions.muting.ok).toBe(true);
        })
        .then(() => utils.getDocs(reportIds))
        .then(updatedReports => {
          expectStates(updatedReports[0], 'scheduled', 'muted');
          expectStates(updatedReports[1], 'scheduled', 'muted');
        });
    });

    it('should replay offline muting history when descendents have offline muting histories', () => {
      /*
       Timeline:
       - clinic exists
       - person exists
       - before sync:
       - person is muted
       - clinic is muted
       - new person is added under clinic <- they are muted offline
       - new person is unmuted (which also unmutes person and clinic)
       - person is muted again
       - sync
       */

      const settings = {
        transitions: { muting: true },
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute']
        },
      };

      const clinic = {
        _id: 'new_clinic',
        name: 'new_clinic',
        type: 'clinic',
        place_id: 'the_new_clinic',
        parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
        contact: {
          _id: 'new_person',
          parent:  { _id: 'new_clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        },
        reported_date: new Date().getTime(),
        muting_history: {
          online: { muted: false },
          offline: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
          ],
          last_update: 'offline',
        },
      };

      const person = {
        _id: 'new_person',
        type: 'person',
        name: 'new_person',
        patient_id: 'the_new_person',
        parent:  { _id: 'new_clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
        reported_date: new Date().getTime(),
        muted: 3000,
        muting_history: {
          offline: [
            { report_id: 'mutes_person', muted: true, date: 500 },
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
            { report_id: 'mutes_person_again', muted: true, date: 3000 }
          ],
          last_update: 'offline',
        }
      };

      const newPerson = {
        _id: 'newnew_person',
        type: 'person',
        name: 'newnew_person',
        patient_id: 'the_newnew_person',
        parent:  { _id: 'new_clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
        reported_date: new Date().getTime(),
        muting_history: {
          offline: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
          ],
          last_update: 'offline',
        }
      };

      const reports = [
        {
          _id: 'mutes_person',
          content_type: 'xml',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 500,
          offline_transitions: {
            muting: true
          },
        },
        {
          _id: 'mutes_clinic',
          type: 'data_record',
          content_type: 'xml',
          form: 'mute',
          fields: {
            place_id: 'the_new_clinic',
          },
          reported_date: 1000,
          offline_transitions: {
            muting: true
          },
        },
        {
          _id: 'unmutes_new_person',
          type: 'data_record',
          content_type: 'xml',
          form: 'unmute',
          fields: {
            patient_id: 'the_newnew_person',
          },
          reported_date: 2000,
          offline_transitions: {
            muting: true
          },
        },
        {
          _id: 'mutes_person_again',
          content_type: 'xml',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 3000,
          offline_transitions: {
            muting: true
          },
        },
      ];

      const reportIds = reports.map(r => r._id);
      const docs = _.shuffle([clinic, person, newPerson, ...reports]);

      return utils
        .updateSettings(settings, 'sentinel')
        .then(() => utils.saveDocs(docs))
        .then(() => sentinelUtils.waitForSentinel(reportIds))
        .then(() => Promise.all([
          utils.getDocs([clinic._id, person._id, newPerson._id]),
          sentinelUtils.getInfoDocs([clinic._id, person._id, newPerson._id])
        ]))
        .then(([ updatedContacts, infoDocs ]) => {
          const [ updatedClinic, updatedPerson, updatedNewPerson ] = updatedContacts;
          const [ clinicInfo, personInfo, newPersonInfo ] = infoDocs;
          const findMutingHistoryForReport = (history, reportId) => history.find(item => item.report_id === reportId);

          expect(updatedClinic.muted).toBeUndefined();
          expect(updatedClinic.muting_history.online.muted).toBe(false);
          expect(updatedClinic.muting_history.last_update).toBe('online');
          expect(findMutingHistoryForReport(clinicInfo.muting_history, 'mutes_clinic').muted).toBe(true);
          expect(findMutingHistoryForReport(clinicInfo.muting_history, 'unmutes_new_person').muted).toBe(false);

          expect(updatedPerson.muted).toBeDefined();
          expect(updatedPerson.muting_history.online.muted).toBe(true);
          expect(updatedPerson.muting_history.last_update).toBe('online');
          expect(findMutingHistoryForReport(personInfo.muting_history, 'unmutes_new_person').muted).toBe(false);
          expect(findMutingHistoryForReport(personInfo.muting_history, 'mutes_person_again').muted).toBe(true);

          expect(updatedNewPerson.muted).toBeUndefined();
          expect(updatedNewPerson.muting_history.online.muted).toBe(false);
          expect(updatedNewPerson.muting_history.last_update).toBe('online');
          expect(findMutingHistoryForReport(newPersonInfo.muting_history, 'mutes_clinic').muted).toBe(true);
          expect(findMutingHistoryForReport(newPersonInfo.muting_history, 'unmutes_new_person').muted).toBe(false);
        })
        // muting won't run again if the replayed docs get updated!
        .then(() => utils.getDoc('mutes_clinic'))
        .then(updatedReport => utils.saveDoc(updatedReport))
        .then(() => sentinelUtils.waitForSentinel('mutes_clinic'))
        .then(() => utils.getDocs([clinic._id, person._id, newPerson._id]))
        .then(([ updatedClinic, updatedPerson, updatedNewPerson ]) => {
          // nothing changed
          expect(updatedClinic.muted).toBeUndefined();
          expect(updatedPerson.muted).toBeDefined();
          expect(updatedNewPerson.muted).toBeUndefined();
        });
    });

    it('should replay already processed reports when replaying offline muting history', () => {
      // when a report from a contact's muting history is synced muuuch later
      /*
       Timeline:
       - clinic exists
       - person exists
       - before sync:
       - person is muted
       - clinic is muted
       - new person is added under clinic <- they are muted offline
       - new person is unmuted (which also unmutes person and clinic)
       - person is muted again
       - everything is synced except the mute clinic, which is synced later
       */

      const settings = {
        transitions: { muting: true },
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute']
        },
      };

      const clinic = {
        _id: 'new_clinic',
        name: 'new_clinic',
        type: 'clinic',
        place_id: 'the_new_clinic',
        parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
        contact: {
          _id: 'new_person',
          parent:  { _id: 'new_clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
        },
        reported_date: new Date().getTime(),
        muting_history: {
          online: { muted: false },
          offline: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
          ],
          last_update: 'offline',
        },
      };

      const person = {
        _id: 'new_person',
        type: 'person',
        name: 'new_person',
        patient_id: 'the_new_person',
        parent:  { _id: 'new_clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
        reported_date: new Date().getTime(),
        muted: 3000,
        muting_history: {
          offline: [
            { report_id: 'mutes_person', muted: true, date: 500 },
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
            { report_id: 'mutes_person_again', muted: true, date: 3000 }
          ],
          last_update: 'offline',
        }
      };

      const newPerson = {
        _id: 'newnew_person',
        type: 'person',
        name: 'newnew_person',
        patient_id: 'the_newnew_person',
        parent:  { _id: 'new_clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
        reported_date: new Date().getTime(),
        muting_history: {
          offline: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
          ],
          last_update: 'offline',
        }
      };

      const reports = [
        {
          _id: 'mutes_person',
          content_type: 'xml',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 500,
          offline_transitions: {
            muting: true
          },
        },
        {
          _id: 'unmutes_new_person',
          type: 'data_record',
          content_type: 'xml',
          form: 'unmute',
          fields: {
            patient_id: 'the_newnew_person',
          },
          reported_date: 2000,
          offline_transitions: {
            muting: true
          },
        },
        {
          _id: 'mutes_person_again',
          content_type: 'xml',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 3000,
          offline_transitions: {
            muting: true
          },
        },
      ];

      const mutesClinic = {
        _id: 'mutes_clinic',
        type: 'data_record',
        content_type: 'xml',
        form: 'mute',
        fields: {
          place_id: 'the_new_clinic',
        },
        reported_date: 1000,
        offline_transitions: {
          muting: true
        },
      };

      const reportIds = reports.map(r => r._id);
      const docs = _.shuffle([clinic, person, newPerson, ...reports]);

      return utils
        .updateSettings(settings, 'sentinel')
        .then(() => utils.saveDocs(docs))
        .then(() => sentinelUtils.waitForSentinel(reportIds))
        .then(() => Promise.all([
          utils.getDocs([clinic._id, person._id, newPerson._id]),
          sentinelUtils.getInfoDocs([clinic._id, person._id, newPerson._id])
        ]))
        .then(([ updatedContacts, infoDocs ]) => {
          const [ updatedClinic, updatedPerson, updatedNewPerson ] = updatedContacts;
          const [ clinicInfo, personInfo, newPersonInfo ] = infoDocs;
          const findMutingHistoryForReport = (history, reportId) => history.find(item => item.report_id === reportId);

          expect(updatedClinic.muted).toBeUndefined();
          expect(updatedClinic.muting_history.online.muted).toBe(false);
          expect(updatedClinic.muting_history.last_update).toBe('online');
          expect(findMutingHistoryForReport(clinicInfo.muting_history, 'unmutes_new_person').muted).toBe(false);

          expect(updatedPerson.muted).toBeDefined();
          expect(updatedPerson.muting_history.online.muted).toBe(true);
          expect(updatedPerson.muting_history.last_update).toBe('online');
          expect(findMutingHistoryForReport(personInfo.muting_history, 'mutes_person_again').muted).toBe(true);

          expect(updatedNewPerson.muted).toBeUndefined();
          expect(updatedNewPerson.muting_history.online.muted).toBe(false);
          expect(updatedNewPerson.muting_history.last_update).toBe('online');
          expect(findMutingHistoryForReport(newPersonInfo.muting_history, 'unmutes_new_person').muted).toBe(false);
        })
        // push a doc from the offline muting history
        .then(() => utils.saveDoc(mutesClinic))
        .then(() => sentinelUtils.waitForSentinel(mutesClinic._id))
        .then(() => utils.getDocs([clinic._id, person._id, newPerson._id]))
        .then(([ updatedClinic, updatedPerson, updatedNewPerson ]) => {
          // nothing changed
          expect(updatedClinic.muted).toBeUndefined();
          expect(updatedPerson.muted).toBeDefined();
          expect(updatedNewPerson.muted).toBeUndefined();
        })
        // update the report again
        .then(() => utils.getDoc(mutesClinic._id))
        .then(report => utils.saveDoc(report))
        .then(() => utils.getDocs([clinic._id, person._id, newPerson._id]))
        .then(([ updatedClinic, updatedPerson, updatedNewPerson ]) => {
          // nothing changed
          expect(updatedClinic.muted).toBeUndefined();
          expect(updatedPerson.muted).toBeDefined();
          expect(updatedNewPerson.muted).toBeUndefined();
        });
    });
  });
});
