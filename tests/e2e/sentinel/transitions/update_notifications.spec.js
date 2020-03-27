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


describe('update_notifications', () => {
  beforeEach(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { update_notifications: false },
      notifications: {
        on_form: 'on',
        off_form: 'off'
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'off',
      fields: {
        patient_uuid: 'person'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
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
      transitions: { update_notifications: true },
      notifications: {
        on_form: 'on',
        off_form: 'off'
      },
      forms: { not_off: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'not_off',
      fields: {
        patient_uuid: 'person'
      },
      reported_date: new Date().getTime(),
      contact: { _id: 'person' }
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

  it('should add error when contact not found or validation fails', () => {
    const settings = {
      transitions: { update_notifications: true },
      notifications: {
        on_form: 'on',
        off_form: 'off',
        messages: [{
          event_type: 'patient_not_found',
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Patient not found'
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
      }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'off',
      from: '12345',
      fields: {
        patient_id: 'unknown'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'off',
      from: '12345',
      fields: {
        patient_id: 'this will not match the validation rule'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_notifications).toBeDefined();
        expect(infos[0].transitions.update_notifications.ok).toBe(true);

        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.update_notifications).toBeDefined();
        expect(infos[1].transitions.update_notifications.ok).toBe(true);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Patient not found');
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');

        expect(updated[0].errors).toBeDefined();
        expect(updated[0].errors.length).toEqual(1);
        expect(updated[0].errors[0].message).toEqual('Patient not found');

        expect(updated[1].tasks).toBeDefined();
        expect(updated[1].tasks.length).toEqual(1);
        expect(updated[1].tasks[0].messages[0].message).toEqual('Patient id incorrect');
        expect(updated[1].tasks[0].messages[0].to).toEqual('12345');

        expect(updated[1].errors).toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].message).toEqual('Patient id incorrect');
      });
  });

  it('should mute and unmute a person', () => {
    const settings = {
      transitions: { update_notifications: true },
      notifications: {
        on_form: 'on',
        off_form: 'off',
        messages: [{
          event_type: 'on_mute',
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Contact muted'
          }],
        }, {
          event_type: 'on_unmute',
          recipient: 'reporting_unit',
          message: [{
            locale: 'en',
            content: 'Contact unmuted'
          }],
        }],
      }
    };

    const mute1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'off',
      from: '1234567',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const mute2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'off',
      from: '54321',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const unmute1 = {
      _id: uuid(),
      type: 'data_record',
      form: 'on',
      from: '56789',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    const unmute2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'on',
      from: '12345',
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    let muteTime;
    let unmuteTime;

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(mute1))
      .then(() => sentinelUtils.waitForSentinel(mute1._id))
      .then(() => sentinelUtils.getInfoDocs([mute1._id, 'person', 'clinic']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_notifications).toBeDefined();
        expect(infos[0].transitions.update_notifications.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].muted).toEqual(true);
        expect(infos[1].muting_history[0].report_id).toEqual(mute1._id);
        muteTime = infos[1].muting_history[0].date;

        expect(infos[2].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs([mute1._id, 'person', 'clinic']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact muted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('1234567');

        expect(updated[1].muted).toEqual(muteTime);

        expect(updated[2].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(mute2))
      .then(() => sentinelUtils.waitForSentinel(mute2._id))
      .then(() => sentinelUtils.getInfoDocs([mute2._id, 'person', 'clinic']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_notifications).toBeDefined();
        expect(infos[0].transitions.update_notifications.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(1);
        expect(infos[1].muting_history[0].date).toEqual(muteTime);

        expect(infos[2].muting_history).not.toBeDefined();
      })
      .then(() => utils.getDocs([mute2._id, 'person', 'clinic']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact muted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('54321');

        expect(updated[1].muted).toEqual(muteTime);

        expect(updated[2].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(unmute1))
      .then(() => sentinelUtils.waitForSentinel(unmute1._id))
      .then(() => sentinelUtils.getInfoDocs([unmute1._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_notifications).toBeDefined();
        expect(infos[0].transitions.update_notifications.ok).toBe(true);

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
        expect(updated[0].tasks[0].messages[0].to).toEqual('56789');

        expect(updated[1].muted).not.toBeDefined();
      })
      .then(() => utils.saveDoc(unmute2))
      .then(() => sentinelUtils.waitForSentinel(unmute2._id))
      .then(() => sentinelUtils.getInfoDocs([unmute2._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_notifications).toBeDefined();
        expect(infos[0].transitions.update_notifications.ok).toBe(true);

        expect(infos[1].muting_history).toBeDefined();
        expect(infos[1].muting_history.length).toEqual(2);
        expect(infos[1].muting_history[1].date).toEqual(unmuteTime);
      })
      .then(() => utils.getDocs([unmute2._id, 'person']))
      .then(updated => {
        expect(updated[0].tasks).toBeDefined();
        expect(updated[0].tasks.length).toEqual(1);
        expect(updated[0].tasks[0].messages[0].message).toEqual('Contact unmuted');
        expect(updated[0].tasks[0].messages[0].to).toEqual('12345');

        expect(updated[1].muted).not.toBeDefined();
      });
  });
});
