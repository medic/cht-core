const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const uuid = require('uuid').v4;
const _ = require('lodash');
const chai = require('chai');

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
    phone: '+444777',
    reported_date: new Date().getTime()
  },
  {
    _id: 'person3',
    name: 'Person',
    type: 'person',
    patient_id: '888888',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444888',
    reported_date: new Date().getTime()
  }
];

const notToday = 36 * 24 * 60 * 60 * 1000;

const expectSameState = (original, updated) => {
  chai.expect(original.scheduled_tasks).to.have.lengthOf(
    updated.scheduled_tasks.length,
    `length not equal ${original._id}`
  );
  original.scheduled_tasks.forEach((task, i) => {
    chai.expect(task.state).to.equal(
      updated.scheduled_tasks[i].state,
      `state not equal ${original._id}, task ${i}`
    );
  });
};

const expectStates = (updated, ...states) => {
  chai.expect(updated.scheduled_tasks).to.have.lengthOf(states.length);
  updated.scheduled_tasks.forEach((task, i) => {
    chai.expect(task.state).to.equal(states[i], `state not equal ${updated._id}, task ${i}`);
  });
};

const getMutingRev = (infoDoc) => {
  const rev = infoDoc.transitions.muting.last_rev;
  return parseInt(rev.split('-')[0]);
};

describe('muting', () => {
  beforeEach(() => utils.saveDocs(contacts));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

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
        chai.expect(Object.keys(info.transitions)).to.be.empty;
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
        chai.expect(Object.keys(info.transitions)).to.be.empty;
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
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].transitions).to.be.ok;
        chai.expect(infos[1].transitions.muting).to.be.ok;
        chai.expect(infos[1].transitions.muting.ok).to.be.true;
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        chai.expect(updated[0].tasks).to.be.ok;
        chai.expect(updated[0].tasks).to.have.lengthOf(1);
        chai.expect(updated[0].tasks[0].messages[0].message).to.equal('Contact not found');
        chai.expect(updated[0].tasks[0].messages[0].to).to.equal('+444999');
        chai.expect(updated[0].tasks[0].state).to.equal('pending');

        chai.expect(updated[0].errors).to.be.ok;
        chai.expect(updated[0].errors).to.have.lengthOf(1);
        chai.expect(updated[0].errors[0].message).to.equal('Contact not found');

        chai.expect(updated[1].tasks).to.be.ok;
        chai.expect(updated[1].tasks).to.have.lengthOf(1);
        chai.expect(updated[1].tasks[0].messages[0].message).to.equal('somefield id incorrect');
        chai.expect(updated[1].tasks[0].messages[0].to).to.equal('+444999');
        chai.expect(updated[1].tasks[0].state).to.equal('pending');

        chai.expect(updated[1].errors).to.be.ok;
        chai.expect(updated[1].errors).to.have.lengthOf(1);
        chai.expect(updated[1].errors[0].message).to.equal('somefield id incorrect');
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
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(1);
        chai.expect(infos[1].muting_history[0].muted).to.be.true;
        chai.expect(infos[1].muting_history[0].report_id).to.equal(mute1._id);
        muteTime = infos[1].muting_history[0].date;

        chai.expect(infos[2].muting_history).not.to.be.ok;
        chai.expect(infos[3].muting_history).not.to.be.ok;
      })
      .then(() => utils.getDocs([mute1._id, 'person', 'person2', 'clinic']))
      .then(updated => {
        chai.expect(updated[0].tasks).to.be.ok;
        chai.expect(updated[0].tasks).to.have.lengthOf(1);
        chai.expect(updated[0].tasks[0].messages[0].message).to.equal('Contact muted');
        chai.expect(updated[0].tasks[0].messages[0].to).to.equal('+444999');
        chai.expect(updated[0].tasks[0].state).to.equal('pending');

        chai.expect(updated[1].muted).to.equal(muteTime);

        chai.expect(updated[2].muted).not.to.be.ok;
        chai.expect(updated[3].muted).not.to.be.ok;
      })
      .then(() => utils.saveDoc(mute2))
      .then(() => sentinelUtils.waitForSentinel(mute2._id))
      .then(() => sentinelUtils.getInfoDocs([mute2._id, 'person']))
      .then(infos => {
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(1);
        chai.expect(infos[1].muting_history[0].date).to.equal(muteTime);
      })
      .then(() => utils.getDocs([mute2._id, 'person']))
      .then(updated => {
        chai.expect(updated[0].tasks).to.be.ok;
        chai.expect(updated[0].tasks).to.have.lengthOf(1);
        chai.expect(updated[0].tasks[0].messages[0].message).to.equal('Contact already muted');
        chai.expect(updated[0].tasks[0].messages[0].to).to.equal('+444999');
        chai.expect(updated[0].tasks[0].state).to.equal('pending');

        chai.expect(updated[1].muted).to.equal(muteTime);
      })
      .then(() => utils.saveDoc(unmute1))
      .then(() => sentinelUtils.waitForSentinel(unmute1._id))
      .then(() => sentinelUtils.getInfoDocs([unmute1._id, 'person']))
      .then(infos => {
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(2);
        chai.expect(infos[1].muting_history[1].muted).to.be.false;
        chai.expect(infos[1].muting_history[1].report_id).to.equal(unmute1._id);
        unmuteTime = infos[1].muting_history[1].date;
      })
      .then(() => utils.getDocs([unmute1._id, 'person']))
      .then(updated => {
        chai.expect(updated[0].tasks).to.be.ok;
        chai.expect(updated[0].tasks).to.have.lengthOf(1);
        chai.expect(updated[0].tasks[0].messages[0].message).to.equal('Contact unmuted');
        chai.expect(updated[0].tasks[0].messages[0].to).to.equal('+444999');
        chai.expect(updated[0].tasks[0].state).to.equal('pending');

        chai.expect(updated[1].muted).not.to.be.ok;
      })
      .then(() => utils.saveDoc(unmute2))
      .then(() => sentinelUtils.waitForSentinel(unmute2._id))
      .then(() => sentinelUtils.getInfoDocs([unmute2._id, 'person']))
      .then(infos => {
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(2);
        chai.expect(infos[1].muting_history[1].date).to.equal(unmuteTime);
      })
      .then(() => utils.getDocs([unmute2._id, 'person']))
      .then(updated => {
        chai.expect(updated[0].tasks).to.be.ok;
        chai.expect(updated[0].tasks).to.have.lengthOf(1);
        chai.expect(updated[0].tasks[0].messages[0].message).to.equal('Contact already unmuted');
        chai.expect(updated[0].tasks[0].messages[0].to).to.equal('+444999');
        chai.expect(updated[0].tasks[0].state).to.equal('pending');

        chai.expect(updated[1].muted).not.to.be.ok;
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
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(1);
        chai.expect(infos[1].muting_history[0].muted).to.be.true;
        chai.expect(infos[1].muting_history[0].report_id).to.equal(mute._id);
        muteTime = infos[1].muting_history[0].date;

        chai.expect(infos[2].muting_history).to.be.ok;
        chai.expect(infos[2].muting_history).to.have.lengthOf(1);

        chai.expect(infos[2].muting_history[0]).to.deep.equal({
          muted: true,
          report_id: mute._id,
          date: muteTime
        });

        chai.expect(infos[3].muting_history).not.to.be.ok;
        chai.expect(infos[4].muting_history).not.to.be.ok;
      })
      .then(() => utils.getDocs(['clinic', 'person', 'person2', 'clinic2']))
      .then(updated => {
        chai.expect(updated[0].muted).to.equal(muteTime);
        chai.expect(updated[1].muted).to.equal(muteTime);

        chai.expect(updated[2].muted).not.to.be.ok;
        chai.expect(updated[3].muted).not.to.be.ok;
      })
      .then(() => utils.saveDoc(unmute))
      .then(() => sentinelUtils.waitForSentinel(unmute._id))
      .then(() => sentinelUtils.getInfoDocs([unmute._id, 'clinic', 'person', 'clinic2', 'person2']))
      .then(infos => {
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(2);
        chai.expect(infos[1].muting_history[0]).to.deep.equal({
          muted: true,
          report_id: mute._id,
          date: muteTime
        });
        chai.expect(infos[1].muting_history[1].muted).to.be.false;
        chai.expect(infos[1].muting_history[1].report_id).to.equal(unmute._id);

        chai.expect(infos[2].muting_history).to.be.ok;
        chai.expect(infos[2].muting_history).to.have.lengthOf(2);
        chai.expect(infos[2].muting_history[0]).to.deep.equal({
          muted: true,
          report_id: mute._id,
          date: muteTime
        });
        chai.expect(infos[2].muting_history[1].muted).to.be.false;
        chai.expect(infos[2].muting_history[1].report_id).to.equal(unmute._id);

        chai.expect(infos[3].muting_history).not.to.be.ok;
        chai.expect(infos[4].muting_history).not.to.be.ok;
      })
      .then(() => utils.getDocs(['clinic', 'person', 'person2', 'clinic2']))
      .then(updated => {
        chai.expect(updated[0].muted).not.to.be.ok;
        chai.expect(updated[1].muted).not.to.be.ok;
        chai.expect(updated[2].muted).not.to.be.ok;
        chai.expect(updated[3].muted).not.to.be.ok;
      });
  });

  it('should not update cascading contacts unless necessary', () => {
    const settings = {
      transitions: { muting: true },
      muting: {
        mute_forms: ['mute'],
        unmute_forms: ['unmute']
      },
      forms: { mute: { }, unmute: { } }
    };

    const muteClinic = {
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

    const mutePerson = {
      _id: uuid(),
      type: 'data_record',
      form: 'mute',
      fields: {
        patient_id: 'person',
      },
      reported_date: new Date().getTime(),
      contact: {
        _id: 'person',
        parent:  { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    let personMuteTime;
    let clinicMuteTime;

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(extraContacts))
      .then(() => utils.saveDoc(mutePerson))
      .then(() => sentinelUtils.waitForSentinel(mutePerson._id))
      .then(() => sentinelUtils.getInfoDocs([mutePerson._id, 'clinic', 'person', 'person3']))
      .then(([ mutePersonInfo, clinicInfo, personInfo, person3Info ]) => {
        chai.expect(mutePersonInfo.transitions).to.be.ok;
        chai.expect(mutePersonInfo.transitions.muting).to.be.ok;

        chai.expect(clinicInfo.muting_history).to.be.undefined;

        chai.expect(personInfo.muting_history).to.be.ok;
        chai.expect(personInfo.muting_history).to.have.lengthOf(1);
        chai.expect(personInfo.muting_history[0].muted).to.be.true;
        chai.expect(personInfo.muting_history[0].report_id).to.equal(mutePerson._id);
        personMuteTime = personInfo.muting_history[0].date;

        chai.expect(person3Info.muting_history).to.be.undefined;
      })
      .then(() => utils.getDocs(['clinic', 'person', 'person3']))
      .then(([ updatedClinic, updatedPerson, updatedPerson3 ]) => {
        chai.expect(updatedClinic.muted).to.be.undefined;
        chai.expect(updatedPerson.muted).to.equal(personMuteTime);
        chai.expect(updatedPerson3.muted).to.be.undefined;
      })
      .then(() => utils.saveDoc(muteClinic))
      .then(() => sentinelUtils.waitForSentinel(muteClinic._id))
      .then(() => sentinelUtils.getInfoDocs([muteClinic._id, 'clinic', 'person', 'person3']))
      .then(([ muteClinicInfo, clinicInfo, personInfo, person3Info ]) => {
        chai.expect(muteClinicInfo.transitions).to.be.ok;
        chai.expect(muteClinicInfo.transitions.muting).to.be.ok;

        chai.expect(clinicInfo.muting_history).to.be.ok;
        chai.expect(clinicInfo.muting_history).to.have.lengthOf(1);
        chai.expect(clinicInfo.muting_history[0].muted).to.be.true;
        chai.expect(clinicInfo.muting_history[0].report_id).to.equal(muteClinic._id);
        clinicMuteTime = clinicInfo.muting_history[0].date;

        chai.expect(personInfo.muting_history).to.be.ok;
        chai.expect(personInfo.muting_history).to.have.lengthOf(2);
        chai.expect(personInfo.muting_history[1]).to.deep.equal({
          muted: true,
          report_id: muteClinic._id,
          date: clinicMuteTime,
        });

        chai.expect(person3Info.muting_history).to.be.ok;
        chai.expect(person3Info.muting_history).to.have.lengthOf(1);
        chai.expect(person3Info.muting_history[0]).to.deep.equal({
          muted: true,
          report_id: muteClinic._id,
          date: clinicMuteTime,
        });
      })
      .then(() => utils.getDocs(['clinic', 'person', 'person3']))
      .then(([ updatedClinic, updatedPerson, updatedPerson3 ]) => {
        chai.expect(updatedClinic.muted).to.equal(clinicMuteTime);
        chai.expect(updatedPerson.muted).to.equal(personMuteTime); // not changed
        chai.expect(updatedPerson3.muted).to.equal(clinicMuteTime);
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
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(1);
        chai.expect(infos[1].muting_history[0].muted).to.be.true;
        chai.expect(infos[1].muting_history[0].report_id).to.equal(mute._id);
        mutePersonTime = infos[1].muting_history[0].date;

        chai.expect(infos[2].muting_history).not.to.be.ok;
        chai.expect(infos[3].muting_history).not.to.be.ok;
      })
      .then(() => utils.getDocs(['person', 'clinic', 'health_center']))
      .then(updated => {
        chai.expect(updated[0].muted).to.equal(mutePersonTime);
        chai.expect(updated[1].muted).not.to.be.ok;
        chai.expect(updated[2].muted).not.to.be.ok;
      })
      .then(() => utils.saveDoc(muteHC))
      .then(() => sentinelUtils.waitForSentinel(muteHC._id))
      .then(() => sentinelUtils.getInfoDocs([muteHC._id, 'person', 'health_center', 'clinic', 'district_hospital']))
      .then(infos => {
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(2);
        chai.expect(infos[1].muting_history[0]).to.deep.equal({
          muted: true,
          date: mutePersonTime,
          report_id: mute._id
        });

        chai.expect(infos[2].muting_history).to.be.ok;
        chai.expect(infos[2].muting_history).to.have.lengthOf(1);
        chai.expect(infos[2].muting_history[0].muted).to.be.true;
        chai.expect(infos[2].muting_history[0].report_id).to.equal(muteHC._id);
        muteHCTime = infos[2].muting_history[0].date;

        chai.expect(infos[1].muting_history[1]).to.deep.equal({
          muted: true,
          date: muteHCTime,
          report_id: muteHC._id
        });

        chai.expect(infos[3].muting_history).to.be.ok;
        chai.expect(infos[3].muting_history).to.have.lengthOf(1);
        chai.expect(infos[3].muting_history[0]).to.deep.equal({
          muted: true,
          date: muteHCTime,
          report_id: muteHC._id
        });

        chai.expect(infos[4].muting_history).not.to.be.ok;
      })
      .then(() => utils.getDocs(['person', 'health_center', 'clinic', 'district_hospital']))
      .then(updated => {
        chai.expect(updated[0].muted).to.equal(mutePersonTime);
        chai.expect(updated[1].muted).to.equal(muteHCTime);
        chai.expect(updated[2].muted).to.equal(muteHCTime);
        chai.expect(updated[3].muted).not.to.be.ok;
      })
      .then(() => utils.saveDoc(unmute))
      .then(() => sentinelUtils.waitForSentinel(unmute._id))
      .then(() => sentinelUtils.getInfoDocs([unmute._id, 'person', 'health_center', 'clinic', 'district_hospital']))
      .then(infos => {
        chai.expect(infos[0].transitions).to.be.ok;
        chai.expect(infos[0].transitions.muting).to.be.ok;
        chai.expect(infos[0].transitions.muting.ok).to.be.true;

        chai.expect(infos[1].muting_history).to.be.ok;
        chai.expect(infos[1].muting_history).to.have.lengthOf(3);
        chai.expect(infos[1].muting_history[2].muted).to.be.false;
        chai.expect(infos[1].muting_history[2].report_id).to.equal(unmute._id);

        chai.expect(infos[2].muting_history).to.be.ok;
        chai.expect(infos[2].muting_history).to.have.lengthOf(2);
        chai.expect(infos[2].muting_history[1].muted).to.be.false;
        chai.expect(infos[2].muting_history[1].report_id).to.equal(unmute._id);

        chai.expect(infos[3].muting_history).to.be.ok;
        chai.expect(infos[3].muting_history).to.have.lengthOf(2);
        chai.expect(infos[3].muting_history[1].muted).to.be.false;
        chai.expect(infos[3].muting_history[1].report_id).to.equal(unmute._id);

        chai.expect(infos[4].muting_history).not.to.be.ok;
      })
      .then(() => utils.getDocs(['person', 'health_center', 'clinic', 'district_hospital']))
      .then(() => updated => {
        chai.expect(updated[0].muted).not.to.be.ok;
        chai.expect(updated[1].muted).not.to.be.ok;
        chai.expect(updated[2].muted).not.to.be.ok;
        chai.expect(updated[3].muted).not.to.be.ok;
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
        chai.expect(infoPerson.transitions).to.be.ok;
        chai.expect(infoPerson.transitions.muting).to.be.ok;
        chai.expect(infoPerson.transitions.muting.ok).to.be.true;

        chai.expect(infoPerson.muting_history).to.be.ok;
        chai.expect(infoPerson.muting_history).to.have.lengthOf(1);
        chai.expect(infoPerson.muting_history[0].muted).to.be.true;
        chai.expect(infoPerson.muting_history[0].report_id).to.equal(mute._id);

        chai.expect(infoPersonWithContactType.transitions.muting.ok).to.be.true;
        chai.expect(infoPersonWithContactType.muting_history).to.have.lengthOf(1);
        chai.expect(infoPersonWithContactType.muting_history[0].report_id).to.equal(mute._id);
      })
      .then(() => utils.getDocs([person._id, personWithContactType._id]))
      .then(([updatedPerson, updatedPersonWithContactType]) => {
        chai.expect(updatedPerson.muted).to.be.ok;
        chai.expect(updatedPersonWithContactType.muted).to.be.ok;
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

  describe('client_side muting', () => {
    it('should add infodoc muting history for contacts muted client_side and silence registrations', () => {
      const contact = {
        _id: uuid(),
        type: 'person',
        name: 'jane',
        muted: 12345,
        patient_id: 'the_person',
        muting_history: {
          last_update: 'client_side',
          server_side: { muted: false },
          client_side: [
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
      const now = new Date();

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
          chai.expect(new Date(updatedContact.muted)).to.be.greaterThan(now);
          chai.expect(updatedContact.muting_history.last_update).to.equal('server_side');
          chai.expect(updatedContact.muting_history.server_side.muted).to.be.true;

          chai.expect(infodoc.transitions.muting.ok).to.be.true;
          chai.expect(infodoc.muting_history).to.deep.equal([
            { muted: true, date: updatedContact.muted, report_id: 'report3' },
          ]);
        })
        .then(() => utils.getDocs(reportIds))
        .then(updatedReports => {
          expectStates(updatedReports[0], 'muted', 'muted');
          expectStates(updatedReports[1], 'muted', 'muted');
        });
    });

    it('should add infodoc muting history for contacts unmuted client-side and schedule registrations', () => {
      const contact = {
        _id: uuid(),
        type: 'person',
        name: 'jane',
        patient_id: 'the_person',
        muting_history: {
          last_update: 'client_side',
          server_side: { muted: true },
          client_side: [
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
          chai.expect(updatedContact.muted).to.be.undefined;
          chai.expect(updatedContact.muting_history.last_update).to.equal('server_side');
          chai.expect(updatedContact.muting_history.server_side.muted).to.be.false;
        })
        .then(() => sentinelUtils.getInfoDoc(contact._id))
        .then(infodoc => {
          chai.expect(infodoc.transitions.muting.ok).to.be.true;
        })
        .then(() => utils.getDocs(reportIds))
        .then(updatedReports => {
          expectStates(updatedReports[0], 'scheduled', 'muted');
          expectStates(updatedReports[1], 'scheduled', 'muted');
        });
    });

    it('should replay client_side muting history when descendents have client_side muting histories', () => {
      /*
       Timeline:
       - clinic exists
       - person exists
       - before sync:
       - person is muted
       - clinic is muted
       - new person is added under clinic <- they are muted client-side
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
          server_side: { muted: false },
          client_side: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
          ],
          last_update: 'client_side',
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
          client_side: [
            { report_id: 'mutes_person', muted: true, date: 500 },
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
            { report_id: 'mutes_person_again', muted: true, date: 3000 }
          ],
          last_update: 'client_side',
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
          client_side: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person', muted: false, date: 2000 },
          ],
          last_update: 'client_side',
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
          client_side_transitions: {
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
          client_side_transitions: {
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
          client_side_transitions: {
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
          client_side_transitions: {
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

          chai.expect(updatedClinic.muted).to.be.undefined;
          chai.expect(updatedClinic.muting_history.server_side.muted).to.be.false;
          chai.expect(updatedClinic.muting_history.last_update).to.equal('server_side');
          chai.expect(findMutingHistoryForReport(clinicInfo.muting_history, 'mutes_clinic').muted).to.be.true;
          chai.expect(
            findMutingHistoryForReport(clinicInfo.muting_history, 'unmutes_new_person').muted
          ).to.be.false;

          chai.expect(updatedPerson.muted).to.be.ok;
          chai.expect(updatedPerson.muting_history.server_side.muted).to.be.true;
          chai.expect(updatedPerson.muting_history.last_update).to.equal('server_side');
          chai.expect(
            findMutingHistoryForReport(personInfo.muting_history, 'unmutes_new_person').muted
          ).to.be.false;
          chai.expect(
            findMutingHistoryForReport(personInfo.muting_history, 'mutes_person_again').muted
          ).to.be.true;

          chai.expect(updatedNewPerson.muted).to.be.undefined;
          chai.expect(updatedNewPerson.muting_history.server_side.muted).to.be.false;
          chai.expect(updatedNewPerson.muting_history.last_update).to.equal('server_side');
          chai.expect(findMutingHistoryForReport(newPersonInfo.muting_history, 'mutes_clinic').muted).to.be.true;
          chai.expect(
            findMutingHistoryForReport(newPersonInfo.muting_history, 'unmutes_new_person').muted
          ).to.be.false;
        })
        // muting won't run again if the replayed docs get updated!
        .then(() => utils.getDoc('mutes_clinic'))
        .then(updatedReport => utils.saveDoc(updatedReport))
        .then(() => sentinelUtils.waitForSentinel('mutes_clinic'))
        .then(() => utils.getDocs([clinic._id, person._id, newPerson._id]))
        .then(([ updatedClinic, updatedPerson, updatedNewPerson ]) => {
          // nothing changed
          chai.expect(updatedClinic.muted).to.be.undefined;
          chai.expect(updatedPerson.muted).to.be.ok;
          chai.expect(updatedNewPerson.muted).to.be.undefined;
        });
    });

    it('should replay already processed reports when replaying client-side muting history', () => {
      // when a report from a contact's muting history is synced muuuch later
      /*
       Timeline:
       - clinic exists
       - person exists
       - before sync:
       - person is muted
       - clinic is muted
       - new person is added under clinic <- they are muted client-side
       - new person is unmuted (which also unmutes person and clinic)
       - person is muted again
       - everything is synced except the mute clinic, which is synced later
       */

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
          server_side: { muted: false },
          client_side: [
            { report_id: 'mutes_clinic_replay', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person_replay', muted: false, date: 2000 },
          ],
          last_update: 'client_side',
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
          client_side: [
            { report_id: 'mutes_person_replay', muted: true, date: 500 },
            { report_id: 'mutes_clinic_replay', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person_replay', muted: false, date: 2000 },
            { report_id: 'mutes_person_again_replay', muted: true, date: 3000 }
          ],
          last_update: 'client_side',
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
          client_side: [
            { report_id: 'mutes_clinic_replay', muted: true, date: 1000 },
            { report_id: 'unmutes_new_person_replay', muted: false, date: 2000 },
          ],
          last_update: 'client_side',
        }
      };

      const reports = [
        {
          _id: 'mutes_person_replay',
          content_type: 'xml',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 500,
          client_side_transitions: {
            muting: true
          },
        },
        {
          _id: 'unmutes_new_person_replay',
          type: 'data_record',
          content_type: 'xml',
          form: 'unmute',
          fields: {
            patient_id: 'the_newnew_person',
          },
          reported_date: 2000,
          client_side_transitions: {
            muting: true
          },
        },
        {
          _id: 'mutes_person_again_replay',
          content_type: 'xml',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 3000,
          client_side_transitions: {
            muting: true
          },
        },
      ];

      const mutesClinic = {
        _id: 'mutes_clinic_replay',
        type: 'data_record',
        content_type: 'xml',
        form: 'mute',
        fields: {
          place_id: 'the_new_clinic',
        },
        reported_date: 1000,
        client_side_transitions: {
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
          sentinelUtils.getInfoDocs([clinic._id, person._id, newPerson._id]),
          utils.getDocs(reportIds),
        ]))
        .then(([ updatedContacts, infoDocs, updatedReports ]) => {
          const [ updatedClinic, updatedPerson, updatedNewPerson ] = updatedContacts;
          const [ clinicInfo, personInfo, newPersonInfo ] = infoDocs;
          const findMutingHistoryForReport = (history, reportId) => history.find(item => item.report_id === reportId);

          chai.expect(updatedClinic.muted).to.be.undefined;
          chai.expect(updatedClinic.muting_history.server_side.muted).to.be.false;
          chai.expect(updatedClinic.muting_history.last_update).to.equal('server_side');
          chai.expect(
            findMutingHistoryForReport(clinicInfo.muting_history, 'unmutes_new_person_replay').muted
          ).to.be.false;

          chai.expect(updatedPerson.muted).to.be.ok;
          chai.expect(updatedPerson.muting_history.server_side.muted).to.be.true;
          chai.expect(updatedPerson.muting_history.last_update).to.equal('server_side');
          chai.expect(
            findMutingHistoryForReport(personInfo.muting_history, 'mutes_person_again_replay').muted
          ).to.be.true;

          chai.expect(updatedNewPerson.muted).to.be.undefined;
          chai.expect(updatedNewPerson.muting_history.server_side.muted).to.be.false;
          chai.expect(updatedNewPerson.muting_history.last_update).to.equal('server_side');
          chai.expect(
            findMutingHistoryForReport(newPersonInfo.muting_history, 'unmutes_new_person_replay').muted
          ).to.be.false;

          // tasks are added to reports
          const [updatedMutesPerson, updatedUnmutesNewPerson, updatedMutesPersonAgain] = updatedReports;
          chai.expect(updatedMutesPerson.tasks).to.have.lengthOf(1);
          chai.expect(updatedMutesPerson.tasks[0].messages[0].message).to.equal('Contact muted');

          chai.expect(updatedUnmutesNewPerson.tasks).to.have.lengthOf(1);
          chai.expect(updatedUnmutesNewPerson.tasks[0].messages[0].message).to.equal('Contact unmuted');

          chai.expect(updatedMutesPersonAgain.tasks).to.have.lengthOf(1);
          chai.expect(updatedMutesPersonAgain.tasks[0].messages[0].message).to.equal('Contact muted');

        })
        // push a doc from the client-side muting history
        .then(() => utils.saveDoc(mutesClinic))
        .then(() => sentinelUtils.waitForSentinel(mutesClinic._id))
        .then(() => utils.getDocs([clinic._id, person._id, newPerson._id, ...reportIds]))
        .then(([ updatedClinic, updatedPerson, updatedNewPerson, ...updatedReports ]) => {
          // nothing changed
          chai.expect(updatedClinic.muted).to.be.undefined;
          chai.expect(updatedPerson.muted).to.be.ok;
          chai.expect(updatedNewPerson.muted).to.be.undefined;

          // tasks are not duplicated on replayed reports
          const [updatedMutesPerson, updatedUnmutesNewPerson, updatedMutesPersonAgain] = updatedReports;
          chai.expect(updatedMutesPerson.tasks).to.have.lengthOf(1);
          chai.expect(updatedUnmutesNewPerson.tasks).to.have.lengthOf(1);
          chai.expect(updatedMutesPersonAgain.tasks).to.have.lengthOf(1);
        })
        .then(() => sentinelUtils.getInfoDocs(reportIds))
        .then(([mutesPersonInfo, unmutesNewPersonInfo, mutesPersonAgainInfo]) => {
          chai.expect(getMutingRev(mutesPersonInfo)).to.equal(1); // not replayed
          chai.expect(getMutingRev(unmutesNewPersonInfo)).to.be.greaterThan(1);  // replayed
          chai.expect(getMutingRev(mutesPersonAgainInfo)).to.be.greaterThan(1);  // replayed
        })
        // update the report again
        .then(() => utils.getDoc(mutesClinic._id))
        .then(report => utils.saveDoc(report))
        .then(() => utils.getDocs([clinic._id, person._id, newPerson._id]))
        .then(([ updatedClinic, updatedPerson, updatedNewPerson ]) => {
          // nothing changed
          chai.expect(updatedClinic.muted).to.be.undefined;
          chai.expect(updatedPerson.muted).to.be.ok;
          chai.expect(updatedNewPerson.muted).to.be.undefined;
        })
        .then(() => sentinelUtils.getInfoDocs(reportIds))
        .then(([mutesPersonInfo, unmutesNewPersonInfo, mutesPersonAgainInfo]) => {
          chai.expect(getMutingRev(mutesPersonInfo)).to.equal(1); // not replayed
          chai.expect(getMutingRev(unmutesNewPersonInfo)).to.be.greaterThan(1); // replayed
          chai.expect(getMutingRev(mutesPersonAgainInfo)).to.be.greaterThan(1); // replayed
        });
    });

    it('should work with circular client-side muting', () => {
      // the code should not produce this, this would be a result of manual tampering with the data.
      // nevertheless ...

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
          server_side: { muted: false },
          client_side: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_person', muted: false, date: 2000 },
            { report_id: 'mutes_clinic', muted: true, date: 4000 },
          ],
          last_update: 'client_side',
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
          client_side: [
            { report_id: 'mutes_clinic', muted: true, date: 1000 },
            { report_id: 'unmutes_person', muted: false, date: 2000 },
            { report_id: 'mutes_clinic', muted: true, date: 4000 },
          ],
          last_update: 'client_side',
        }
      };

      const reports = [
        {
          _id: 'unmutes_person',
          type: 'data_record',
          content_type: 'xml',
          form: 'unmute',
          fields: {
            patient_id: 'the_new_person',
          },
          reported_date: 2000,
          client_side_transitions: {
            muting: true
          },
        },
      ];

      const mutesClinic =  {
        _id: 'mutes_clinic',
        type: 'data_record',
        content_type: 'xml',
        form: 'mute',
        fields: {
          place_id: 'the_new_clinic',
        },
        reported_date: 1000,
        client_side_transitions: {
          muting: true
        },
      };

      const reportIds = reports.map(r => r._id);
      const docs = _.shuffle([clinic, person, ...reports]);

      return utils
        .updateSettings(settings, 'sentinel')
        .then(() => utils.saveDocs(docs))
        .then(() => sentinelUtils.waitForSentinel(reportIds))
        .then(() => utils.getDocs([clinic._id, person._id]))
        .then(([ updatedClinic, updatedPerson ]) => {
          // nothing changed
          chai.expect(updatedClinic.muted).to.be.undefined;
          chai.expect(updatedPerson.muted).to.be.undefined;
        })
        .then(() => utils.saveDoc(mutesClinic))
        .then(() => sentinelUtils.waitForSentinel())
        .then(() => utils.getDocs([clinic._id, person._id]))
        .then(([ updatedClinic, updatedPerson ]) => {
          // nothing changed
          chai.expect(updatedClinic.muted).to.be.ok;
          chai.expect(updatedPerson.muted).to.be.ok;
        });
    });
  });
});
