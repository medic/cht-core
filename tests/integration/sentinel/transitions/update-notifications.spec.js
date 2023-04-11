const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

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
  beforeEach(() => utils.saveDocs(contacts));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
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
          recipient: '12345',
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications.ok).to.be.true;

        expect(infos[1].transitions).to.not.be.undefined;
        expect(infos[1].transitions.update_notifications).to.not.be.undefined;
        expect(infos[1].transitions.update_notifications.ok).to.be.true;
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].tasks).to.not.be.undefined;
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].message).to.equal('Patient not found');
        expect(updated[0].tasks[0].messages[0].to).to.equal('12345');

        expect(updated[0].errors).to.not.be.undefined;
        expect(updated[0].errors).to.have.lengthOf(1);
        expect(updated[0].errors[0].message).to.equal('Patient not found');

        expect(updated[1].tasks).to.not.be.undefined;
        expect(updated[1].tasks).to.have.lengthOf(1);
        expect(updated[1].tasks[0].messages[0].message).to.equal('Patient id incorrect');
        expect(updated[1].tasks[0].messages[0].to).to.equal('12345');

        expect(updated[1].errors).to.not.be.undefined;
        expect(updated[1].errors).to.have.lengthOf(1);
        expect(updated[1].errors[0].message).to.equal('Patient id incorrect');
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
          recipient: '12345',
          message: [{
            locale: 'en',
            content: 'Contact muted'
          }],
        }, {
          event_type: 'on_unmute',
          recipient: '12345',
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
      fields: {
        patient_id: 'person'
      },
      reported_date: new Date().getTime(),
      content_type: 'xml'
    };

    let muteTime;
    let unmuteTime;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(mute1))
      .then(() => sentinelUtils.waitForSentinel(mute1._id))
      .then(() => sentinelUtils.getInfoDocs([mute1._id, 'person', 'clinic']))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications.ok).to.be.true;

        expect(infos[1].muting_history).to.not.be.undefined;
        expect(infos[1].muting_history).to.have.lengthOf(1);
        expect(infos[1].muting_history[0].muted).to.be.true;
        expect(infos[1].muting_history[0].report_id).to.equal(mute1._id);
        muteTime = infos[1].muting_history[0].date;

        expect(infos[2].muting_history).to.be.undefined;
      })
      .then(() => utils.getDocs([mute1._id, 'person', 'clinic']))
      .then(updated => {
        expect(updated[0].tasks).to.not.be.undefined;
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].message).to.equal('Contact muted');
        expect(updated[0].tasks[0].messages[0].to).to.equal('12345');

        expect(updated[1].muted).to.equal(muteTime);

        expect(updated[2].muted).to.be.undefined;
      })
      .then(() => utils.saveDoc(mute2))
      .then(() => sentinelUtils.waitForSentinel(mute2._id))
      .then(() => sentinelUtils.getInfoDocs([mute2._id, 'person', 'clinic']))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications.ok).to.be.true;

        expect(infos[1].muting_history).to.not.be.undefined;
        expect(infos[1].muting_history).to.have.lengthOf(1);
        expect(infos[1].muting_history[0].date).to.equal(muteTime);

        expect(infos[2].muting_history).to.be.undefined;
      })
      .then(() => utils.getDocs([mute2._id, 'person', 'clinic']))
      .then(updated => {
        expect(updated[0].tasks).to.not.be.undefined;
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].message).to.equal('Contact muted');
        expect(updated[0].tasks[0].messages[0].to).to.equal('12345');

        expect(updated[1].muted).to.equal(muteTime);

        expect(updated[2].muted).to.be.undefined;
      })
      .then(() => utils.saveDoc(unmute1))
      .then(() => sentinelUtils.waitForSentinel(unmute1._id))
      .then(() => sentinelUtils.getInfoDocs([unmute1._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications.ok).to.be.true;

        expect(infos[1].muting_history).to.not.be.undefined;
        expect(infos[1].muting_history).to.have.lengthOf(2);
        expect(infos[1].muting_history[1].muted).to.be.false;
        expect(infos[1].muting_history[1].report_id).to.equal(unmute1._id);
        unmuteTime = infos[1].muting_history[1].date;
      })
      .then(() => utils.getDocs([unmute1._id, 'person']))
      .then(updated => {
        expect(updated[0].tasks).to.not.be.undefined;
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].message).to.equal('Contact unmuted');
        expect(updated[0].tasks[0].messages[0].to).to.equal('12345');

        expect(updated[1].muted).to.be.undefined;
      })
      .then(() => utils.saveDoc(unmute2))
      .then(() => sentinelUtils.waitForSentinel(unmute2._id))
      .then(() => sentinelUtils.getInfoDocs([unmute2._id, 'person']))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications).to.not.be.undefined;
        expect(infos[0].transitions.update_notifications.ok).to.be.true;

        expect(infos[1].muting_history).to.not.be.undefined;
        expect(infos[1].muting_history).to.have.lengthOf(2);
        expect(infos[1].muting_history[1].date).to.equal(unmuteTime);
      })
      .then(() => utils.getDocs([unmute2._id, 'person']))
      .then(updated => {
        expect(updated[0].tasks).to.not.be.undefined;
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].message).to.equal('Contact unmuted');
        expect(updated[0].tasks[0].messages[0].to).to.equal('12345');

        expect(updated[1].muted).to.be.undefined;
      });
  });
});
