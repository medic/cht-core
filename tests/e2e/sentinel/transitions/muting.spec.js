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
  }
];

const extraContacts = [
  {
    _id: 'clinic2',
    name: 'Clinic',
    type: 'clinic',
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
      .updateSettings(settings, true)
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
      .updateSettings(settings, true)
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
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Contact not found'
          }],
        }],
        validations: {
          list: [
            {
              property: 'patient_id',
              rule: 'lenMin(5) && lenMax(10)',
              message: [{
                locale: 'en',
                content: 'Patient id incorrect'
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
        patient_id: 'unknown'
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
        patient_id: 'this will not pass validation'
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    return utils
      .updateSettings(settings, true)
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
        expect(updated[1].tasks[0].messages[0].message).toEqual('Patient id incorrect');
        expect(updated[1].tasks[0].messages[0].to).toEqual('+444999');
        expect(updated[1].tasks[0].state).toEqual('pending');

        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].message).toEqual('Patient id incorrect');
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
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Contact muted'
          }],
        }, {
          event_type: 'unmute',
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Contact unmuted'
          }],
        }, {
          event_type: 'already_muted',
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Contact already muted'
          }],
        }, {
          event_type: 'already_unmuted',
          recipient: 'reporting_unit',
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
      .updateSettings(settings, true)
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
      .updateSettings(settings, true)
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
      .updateSettings(settings, true)
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

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(mute))
      .then(() => sentinelUtils.waitForSentinel(mute._id))
      .then(() => utils.saveDoc(person))
      .then(() => sentinelUtils.waitForSentinel(person._id))
      .then(() => sentinelUtils.getInfoDoc(person._id))
      .then((info) => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.muting).toBeDefined();
        expect(info.transitions.muting.ok).toBe(true);

        expect(info.muting_history).toBeDefined();
        expect(info.muting_history.length).toEqual(1);
        expect(info.muting_history[0].muted).toEqual(true);
        expect(info.muting_history[0].report_id).toEqual(mute._id);
      })
      .then(() => utils.getDoc(person._id))
      .then(updated => {
        expect(updated.muted).toBeDefined();
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

    const notToday = 36 * 24 * 60 * 60 * 1000;

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
      }
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

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(extraContacts))
      .then(() => utils.saveDocs(reports))
      .then(() => utils.saveDoc(mute))
      .then(() => sentinelUtils.waitForSentinel(mute._id))
      .then(() => utils.getDocs(
        ['no_registration_config', 'incorrect_content', 'sms_without_contact', 'registration_4']
      ))
      .then(reports => {
        expect(reports[0].scheduled_tasks[0].state).toEqual('pending');
        expect(reports[0].scheduled_tasks[1].state).toEqual('scheduled');
        expect(reports[0].scheduled_tasks[2].state).toEqual('something_else');

        expect(reports[1].scheduled_tasks[0].state).toEqual('scheduled');
        expect(reports[1].scheduled_tasks[1].state).toEqual('something_else');
        expect(reports[1].scheduled_tasks[2].state).toEqual('pending');

        expect(reports[2].scheduled_tasks[0].state).toEqual('pending');
        expect(reports[2].scheduled_tasks[1].state).toEqual('something_else');
        expect(reports[2].scheduled_tasks[2].state).toEqual('scheduled');

        expect(reports[3].scheduled_tasks[0].state).toEqual('pending');
        expect(reports[3].scheduled_tasks[1].state).toEqual('scheduled');
        expect(reports[3].scheduled_tasks[2].state).toEqual('something_else');
      })
      .then(() => utils.getDocs(['registration_1', 'registration_2', 'registration_3']))
      .then(reports => {
        expect(reports[0].scheduled_tasks[0].state).toEqual('muted');
        expect(reports[0].scheduled_tasks[1].state).toEqual('muted');
        expect(reports[0].scheduled_tasks[2].state).toEqual('something_else');

        expect(reports[1].scheduled_tasks[0].state).toEqual('muted');
        expect(reports[1].scheduled_tasks[1].state).toEqual('something_else');
        expect(reports[1].scheduled_tasks[2].state).toEqual('muted');

        expect(reports[2].scheduled_tasks[0].state).toEqual('something_else');
        expect(reports[2].scheduled_tasks[1].state).toEqual('muted');
        expect(reports[2].scheduled_tasks[2].state).toEqual('muted');
      })
      .then(() => utils.saveDoc(unmute))
      .then(() => sentinelUtils.waitForSentinel(unmute._id))
      .then(() => utils.getDocs(
        ['no_registration_config', 'incorrect_content', 'sms_without_contact', 'registration_4']
      ))
      .then(reports => {
        expect(reports[0].scheduled_tasks[0].state).toEqual('pending');
        expect(reports[0].scheduled_tasks[1].state).toEqual('scheduled');
        expect(reports[0].scheduled_tasks[2].state).toEqual('something_else');

        expect(reports[1].scheduled_tasks[0].state).toEqual('scheduled');
        expect(reports[1].scheduled_tasks[1].state).toEqual('something_else');
        expect(reports[1].scheduled_tasks[2].state).toEqual('pending');

        expect(reports[2].scheduled_tasks[0].state).toEqual('pending');
        expect(reports[2].scheduled_tasks[1].state).toEqual('something_else');
        expect(reports[2].scheduled_tasks[2].state).toEqual('scheduled');

        expect(reports[3].scheduled_tasks[0].state).toEqual('pending');
        expect(reports[3].scheduled_tasks[1].state).toEqual('scheduled');
        expect(reports[3].scheduled_tasks[2].state).toEqual('something_else');
      })
      .then(() => utils.getDocs(['registration_1', 'registration_2', 'registration_3']))
      .then(reports => {
        expect(reports[0].scheduled_tasks[0].state).toEqual('scheduled');
        expect(reports[0].scheduled_tasks[1].state).toEqual('muted'); // due date in the past
        expect(reports[0].scheduled_tasks[2].state).toEqual('something_else');

        expect(reports[1].scheduled_tasks[0].state).toEqual('muted'); // due date in the past
        expect(reports[1].scheduled_tasks[1].state).toEqual('something_else');
        expect(reports[1].scheduled_tasks[2].state).toEqual('scheduled');

        expect(reports[2].scheduled_tasks[0].state).toEqual('something_else');
        expect(reports[2].scheduled_tasks[1].state).toEqual('scheduled');
        expect(reports[2].scheduled_tasks[2].state).toEqual('muted'); // due date in the past
      });
  });
});
