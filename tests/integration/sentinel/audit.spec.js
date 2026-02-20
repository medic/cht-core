const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const moment = require('moment/moment');
const testForm = require('./transitions/test-stubs');
const constants = require('@constants');
const uuid = require('uuid').v4;
const { CONTACT_TYPES } = require('@medic/constants');

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'contact',
    contact_type: 'district_hospital',
    place_id: 'the_district_hospital',
    reported_date: new Date().getTime()
  },
  {
    _id: CONTACT_TYPES.HEALTH_CENTER,
    name: 'Health Center',
    type: 'contact',
    contact_type: CONTACT_TYPES.HEALTH_CENTER,
    place_id: 'the_health_center',
    parent: { _id: 'district_hospital' },
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic',
    name: 'Clinic',
    type: 'contact',
    contact_type: 'clinic',
    place_id: 'the_clinic',
    parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'person',
      parent: {
        _id: 'clinic',
        parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } }
      }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'patient',
    parent: { _id: 'clinic', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  },
];

const getContactsByReference = async (shortcodes) => {
  const keys = shortcodes.map(shortcode => ['shortcode', shortcode]);
  const qs = { keys: JSON.stringify(keys), include_docs: true };
  const results = await utils.requestOnTestDb({ path: '/_design/shared-contacts/_view/contacts_by_reference', qs });
  return results.rows.map(row => row.doc);
};

const waitForReminders = async (expectedLogs) => {
  const opts = {
    startkey: 'reminderlog:',
    endkey: 'reminderlog:\ufff0',
    include_docs: true
  };
  const results = await utils.sentinelDb.allDocs(opts);
  if (results.rows.length >= expectedLogs) {
    return;
  }
  await utils.delayPromise(200);
  return waitForReminders(expectedLogs);
};

const checkAudit = (audit, doc) => {
  const revCount = parseInt(doc._rev.split('-')[0]);
  expect(audit.history.length).to.equal(revCount);
  const lastChange = audit.history.at(-1);
  expect(lastChange.rev).to.equal(doc._rev);
  expect(lastChange.user).to.equal(constants.USERNAME);
  expect(lastChange.date).to.be.ok;
  expect(lastChange.service).to.equal('sentinel');
};

describe('auditing', () => {
  before(async () => {
    await utils.saveDocs(contacts);
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  afterEach(async () => {
    await utils.revertDb(contacts.map(c => c._id), true);
  });

  it('should audit db.post and db.put', async () => {
    const patientPhone = '+9779841123123';
    const patientNameAndPhone = { // has just the `patient_name`and phone so should create this person
      _id: uuid(),
      type: 'data_record',
      form: 'FORM-A',
      from: '+9779841212345',
      fields: {
        patient_name: 'Minerva',
        phone_number: patientPhone
      },
      reported_date: moment().valueOf(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: CONTACT_TYPES.HEALTH_CENTER, parent: { _id: 'district_hospital' } } }
      }
    };

    await utils.updateSettings(testForm.forms.NP, { ignoreReload: 'sentinel' });
    await utils.saveDoc(patientNameAndPhone);
    await sentinelUtils.waitForSentinel();

    const updated = await utils.db.get(patientNameAndPhone._id);
    const auditDoc = await utils.auditDb.get(patientNameAndPhone._id);

    checkAudit(auditDoc, updated);

    const newPatientId = updated.patient_id;
    const [patient] = await getContactsByReference([newPatientId]);
    const patientAudit = await utils.auditDb.get(patient._id);

    checkAudit(patientAudit, patient);
  });
  
  it('should audit bulk docs', async () => {
    const start = moment().utc();
    const momentToTextExpression = date => `at ${date.format('HH:mm')} on ${date.format('ddd')}`;

    const remindersConfig = [
      {
        form: 'FORMX',
        text_expression: momentToTextExpression(start.clone().subtract(30, 'minutes')),
        message: '{{name}} should do something'
      },
    ];
    const forms = {
      FORM1: {
        meta: { code: 'FORMX' },
        fields: { param: { position: 0, type: 'string' } }
      },
    };
    const transitions = { update_clinics: true };

    await utils.updateSettings(
      { transitions, forms, reminders: remindersConfig },
      { ignoreReload: 'sentinel' }
    );

    await utils.runSentinelTasks();
    await waitForReminders(1);

    const reminderDocs = await utils.db.allDocs(
      { startkey: 'reminder:', endkey: 'reminder:\ufff0', include_docs: true }
    );
    const reminderAuditDocs = await utils.auditDb.allDocs(
      { startkey: 'reminder:', endkey: 'reminder:\ufff0', include_docs: true }
    );

    expect(reminderDocs.rows.length).to.equal(1);
    reminderDocs.rows.forEach((row, i) => {
      checkAudit(reminderAuditDocs.rows[i].doc, row.doc);
    });

  }); 

});
