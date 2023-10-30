const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const appSettings = require('./test-app_settings');

describe('Reports Subject', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const healthCenter = places.get('health_center');
  const clinic = places.get('clinic');

  const user = userFactory.build({ place: clinic._id });

  const person = personFactory.build({
    phone: '+50689999999',
    patient_id: '123456',
    parent: {_id: clinic._id, parent: clinic.parent}
  });

  const waitElementTextEquals = async (elementGetter, expectedText) => await browser.waitUntil(async () =>
    await elementGetter.getText() === expectedText);

  const verifyListReportContent = async ({
    formName,
    subject = person.name,
    lineage = `${clinic.name}${healthCenter.name}${districtHospital.name}`
  }) => {
    await commonPage.refresh();
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);
    expect(firstReportInfo.heading).to.equal(subject);
    expect(firstReportInfo.form).to.equal(formName);
    expect(firstReportInfo.lineage).to.equal(lineage);
  };

  const verifyOpenReportContent = async ({
    formName,
    subject,
    lineage = `${clinic.name}${healthCenter.name}${districtHospital.name}`,
    senderName = `Submitted by ${user.contact.name}`,
    senderPhone = user.phone
  }) => {
    const openReportInfo = await reportsPage.getOpenReportInfo();
    expect(openReportInfo.patientName).to.equal(subject);
    expect(openReportInfo.reportName).to.equal(formName);
    expect(openReportInfo.lineage).to.equal(lineage);
    expect(openReportInfo.senderName).to.equal(senderName);
    expect(openReportInfo.senderPhone).to.equal(senderPhone);
  };

  before(async () => {
    await utils.updateSettings(appSettings.WITH_SMS_FORMS, true);
    await utils.saveDocs([...places.values(), person]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
  });

  after(async () => await utils.revertSettings(true));

  afterEach(async () => await utils.deleteAllDocs([/^form:/].concat(...places.values()).concat(person._id)));

  it('should create a report using patient_id', async () => {
    const report = {
      _id: 'REF_REF_V1',
      form: 'RR',
      type: 'data_record',
      from: user.phone,
      fields: {
        patient_id: person.patient_id
      },
      sms_message: {
        from: user.phone,
        message: `1!RR!${person.patient_id}`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'REF_REF' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });
  });

  it('should create a report using doc id', async () => {
    const report = {
      _id: 'REF_REF_V2',
      form: 'RR',
      type: 'data_record',
      from: user.phone,
      fields: {
        patient_id: person._id
      },
      sms_message: {
        from: user.phone,
        message: `1!RR!${person._id}`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'REF_REF' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });
  });

  it('should create a report using unknown patient_id ', async () => {
    const report = {
      _id: 'REF_REF_I',
      form: 'RR',
      type: 'data_record',
      from: user.phone,
      fields: {
        patient_id: '111111'
      },
      sms_message: {
        from: user.phone,
        message: '1!RR!111111',
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'REF_REF', subject: 'Unknown subject' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: 'Unknown subject' });
  });

  it('should create a report using patient name', async () => {
    const report = {
      _id: 'NAM_NAM_V',
      form: 'NN',
      type: 'data_record',
      from: user.phone,
      fields: {
        patient_name: person.name
      },
      sms_message: {
        from: user.phone,
        message: `1!NN!${person.name}`,
        form: 'NN',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'NAM_NAM' });
    await verifyOpenReportContent({ formName: 'NAM_NAM', subject: person.name });
  });

  it('should create a report using missing required patient name', async () => {
    const report = {
      _id: 'NAM_NAM_I',
      form: 'NN',
      type: 'data_record',
      from: user.phone,
      errors: [
        {
          fields: 'patient_name',
          code: 'sys.missing_fields'
        }
      ],
      fields: {
        patient_name: ''
      },
      sms_message: {
        from: user.phone,
        message: `1!RR!`,
        form: 'NN',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'NAM_NAM', subject: 'Unknown subject' });
    await verifyOpenReportContent({ formName: 'NAM_NAM', subject: 'Unknown subject' });
  });

  it('should create a report using place_id with a place_uuid', async () => {
    const report = {
      _id: 'PREF_PREF_V',
      form: 'P',
      type: 'data_record',
      from: user.phone,
      fields: {
        place_id: clinic._id
      },
      sms_message: {
        from: user.phone,
        message: `1!P!${clinic._id}`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`
    });
    await verifyOpenReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`
    });
  });

  it('should create a report using place_id with a shortcode', async () => {
    const report = {
      _id: 'PREF_PREF_V',
      form: 'P',
      type: 'data_record',
      from: user.phone,
      fields: {
        place_id: clinic.place_id
      },
      sms_message: {
        from: user.phone,
        message: `1!P!${clinic.place_id}`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`
    });
    await verifyOpenReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`
    });
  });

  it('should create a report using unknown place_id', async () => {
    const report = {
      _id: 'PREF_PREF_I',
      form: 'P',
      type: 'data_record',
      from: user.phone,
      fields: {
        place_id: '12'
      },
      sms_message: {
        from: user.phone,
        message: `1!P!12`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'PID_PID', subject: 'Unknown subject' });
    await verifyOpenReportContent({ formName: 'PID_PID', subject: 'Unknown subject' });
  });

  it('should create a report which has an unknown sender and a known subject', async () => {
    const report = {
      _id: 'PID_US',
      form: 'P',
      type: 'data_record',
      from: '555',
      fields: {
        place_id: clinic._id
      },
      sms_message: {
        from: '555',
        message: `1!P!${clinic._id}`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`,
    });
    await verifyOpenReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`,
      senderName: 'Submitted by 555',
      senderPhone: '',
    });
  });

  it('should create a report which has an unknown sender with no phone number', async () => {
    const report = {
      _id: 'PID_USNP',
      form: 'P',
      type: 'data_record',
      from: '',
      fields: {
        place_id: clinic._id
      },
      sms_message: {
        from: '',
        message: `1!P!${clinic._id}`,
        form: 'RR',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`
    });
    await verifyOpenReportContent({
      formName: 'PID_PID',
      subject: clinic.name,
      lineage: `${healthCenter.name}${districtHospital.name}`,
      senderName: 'Unknown sender',
      senderPhone: '',
    });
  });

  it('changes to a loaded or list report should be reflected in the UI ',  async () => {
    const reportTest = {
      _id: 'REF_REF_V3',
      form: 'RR',
      type: 'data_record',
      from: user.phone,
      fields: {
        patient_id: person.patient_id
      },
      contact: {
        _id: user.contact._id,
        parent: user.parent,
      },
    };

    await utils.saveDocs([reportTest]);
    await sentinelUtils.waitForSentinel([reportTest._id]);

    await verifyListReportContent({ formName: 'REF_REF' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });

    const userContact = personFactory.build({
      phone: '+50689888888',
      patient_id: '654321',
      name: 'Cleo',
      parent: {_id: healthCenter._id, parent: healthCenter.parent}
    });
    const newPerson = personFactory.build({
      phone: '+50689777777',
      patient_id: '098765',
      name: 'Filippo',
      parent: {_id: healthCenter._id, parent: healthCenter.parent}
    });

    const newUser = userFactory.build({ username: 'new-user', place: healthCenter._id, contact: userContact });

    await utils.saveDocs([newPerson]);
    await utils.createUsers([newUser]);

    // change both patient and submitter
    const reportDoc = await utils.getDoc(reportTest._id);
    reportDoc.contact = {_id: newUser.contact._id, parent: newUser.contact.parent};
    reportDoc.fields.patient_id = newPerson.patient_id;
    await utils.saveDoc(reportDoc);

    // wait until this is reflected in the UI, without refreshing!
    await waitElementTextEquals(reportsPage.patientName(), newPerson.name);
    await waitElementTextEquals(reportsPage.senderPhone(), newUser.contact.phone);

    await verifyListReportContent({
      formName: 'REF_REF',
      subject: newPerson.name,
      lineage: `${healthCenter.name}${districtHospital.name}`
    });
    await verifyOpenReportContent({
      formName: 'REF_REF',
      subject: newPerson.name,
      lineage: `${healthCenter.name}${districtHospital.name}`,
      senderName: `Submitted by ${newUser.contact.name}`,
      senderPhone: newUser.contact.phone,
    });
  });

  it('should create a report which does not have a subject', async () => {
    const report = {
      _id: 'SURVEY_REPORT',
      form: 'S',
      type: 'data_record',
      from: user.phone,
      fields: {
        survey_subject: 'something'
      },
      sms_message: {
        from: user.phone,
        message: `1!S!something`,
        form: 'S',
      },
    };

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

    await verifyListReportContent({ formName: 'SURVEY', subject: user.contact.name });
    await verifyOpenReportContent({ formName: 'SURVEY', senderName: `${user.contact.name}`});
  });
});
