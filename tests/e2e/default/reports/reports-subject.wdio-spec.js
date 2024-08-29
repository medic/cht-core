const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const appSettings = require('./config/test-app_settings');

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

  const waitElementTextEquals = async (elementGetter, expectedText) => {
    return await browser.waitUntil(async () => await elementGetter.getText() === expectedText);
  };

  const verifyListReportContent = async ({
    formName,
    subject = person.name,
    lineage = `${clinic.name}${healthCenter.name}${districtHospital.name}`
  }) => {
    await commonPage.goToPeople();
    await commonPage.goToReports();
    const firstReport = await reportsPage.leftPanelSelectors.firstReport();
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

  const baseReport = (reportId, form, userPhone, fields) => {
    return {
      _id: reportId,
      form: form,
      type: 'data_record',
      from: userPhone,
      fields: fields,
    };
  };

  const createSmsReport = async (reportId, form, userPhone, message, fields, errors = [], ) => {
    const report = baseReport(reportId, form, userPhone, fields);
    report.sms_message = {
      from: userPhone,
      message: message,
      form: form,
    };
    report.errors = errors;

    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);
  };

  before(async () => {
    await utils.updateSettings(appSettings.WITH_SMS_FORMS, { ignoreReload: true });
    await utils.saveDocs([...places.values(), person]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
  });

  after(async () => await utils.revertSettings(true));

  afterEach(async () => await utils.deleteAllDocs([/^form:/].concat(...places.values()).concat(person._id)));

  it('should create a report using patient_id', async () => {
    await createSmsReport(
      'REF_REF_V1',
      'RR',
      user.phone,
      `1!RR!${person.patient_id}`,
      { patient_id: person.patient_id }
    );
    await verifyListReportContent({ formName: 'REF_REF' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });
  });

  it('should create a report using doc id', async () => {
    await createSmsReport(
      'REF_REF_V2',
      'RR',
      user.phone,
      `1!RR!${person._id}`,
      { patient_id: person._id }
    );
    await verifyListReportContent({ formName: 'REF_REF' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });
  });

  it('should create a report using unknown patient_id ', async () => {
    await createSmsReport('REF_REF_I', 'RR', user.phone, `1!RR!111111`, { patient_id: '111111' });
    await verifyListReportContent({ formName: 'REF_REF', subject: 'Unknown subject' });
    await verifyOpenReportContent({ formName: 'REF_REF', subject: 'Unknown subject' });
  });

  it('should create a report using patient name', async () => {
    await createSmsReport('NAM_NAM_V', 'NN', user.phone, `1!NN!${person.name}`, { patient_name: person.name } );
    await verifyListReportContent({ formName: 'NAM_NAM' });
    await verifyOpenReportContent({ formName: 'NAM_NAM', subject: person.name });
  });

  it('should create a report using missing required patient name', async () => {
    await createSmsReport(
      'NAM_NAM_I',
      'NN',
      user.phone,
      '1!RR!',
      { patient_name: '' },
      [{ fields: 'patient_name', code: 'sys.missing_fields' }]
    );
    await verifyListReportContent({ formName: 'NAM_NAM', subject: 'Unknown subject' });
    await verifyOpenReportContent({ formName: 'NAM_NAM', subject: 'Unknown subject' });
  });

  it('should create a report using place_id with a place_uuid', async () => {
    await createSmsReport('PREF_PREF_V', 'P', user.phone, `1!P!${clinic._id}`, { place_id: clinic._id });
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
    await createSmsReport('PREF_PREF_V', 'P', user.phone, `1!P!${clinic.place_id}`, { place_id: clinic.place_id });
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
    await createSmsReport('PREF_PREF_I', 'P', user.phone, '1!P!12', { place_id: '12' });
    await verifyListReportContent({ formName: 'PID_PID', subject: 'Unknown subject' });
    await verifyOpenReportContent({ formName: 'PID_PID', subject: 'Unknown subject' });
  });

  it('should create a report which has an unknown sender and a known subject', async () => {
    await createSmsReport('PID_US', 'P', '555', `1!P!${clinic._id}`, { place_id: clinic._id });
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
    await createSmsReport('PID_USNP', 'P', '', `1!P!${clinic._id}`, { place_id: clinic._id });
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
    const report = baseReport('REF_REF_V3', 'RR', user.phone, { patient_id: person.patient_id });
    report.contact = { _id: user.contact._id, parent: user.parent };
    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);

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
    const reportDoc = await utils.getDoc(report._id);
    reportDoc.contact = {_id: newUser.contact._id, parent: newUser.contact.parent};
    reportDoc.fields.patient_id = newPerson.patient_id;
    await utils.saveDoc(reportDoc);

    // wait until this is reflected in the UI, without refreshing!
    await waitElementTextEquals(reportsPage.rightPanelSelectors.patientName(), newPerson.name);
    await waitElementTextEquals(reportsPage.rightPanelSelectors.senderPhone(), newUser.contact.phone);

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
    await createSmsReport('SURVEY_REPORT', 'S', user.phone, '1!S!something', { survey_subject: 'something' });
    await verifyListReportContent({ formName: 'SURVEY', subject: user.contact.name });
    await verifyOpenReportContent({ formName: 'SURVEY', senderName: `${user.contact.name}`});
  });
});
