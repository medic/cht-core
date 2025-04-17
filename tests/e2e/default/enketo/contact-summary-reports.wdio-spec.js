const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const { cookieLogin } = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const path = require('path');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportsFactory = require('@factories/cht/reports/generic-report');

describe('Contact summary', () => {

  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const patient = personFactory.build({
    name: 'Patient',
    phone: '+50683444444',
    patient_id: '12345',
    parent: { _id: clinic._id, parent: clinic.parent }
  });
  const reports = Array
    .from({ length: 100 })
    .map(() => reportsFactory.report().build(
      { form: 'home_visit', content_type: 'xml' },
      { patient }
    ));

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/contact-summary-reports`));
    await chtConfUtils.initializeConfigDir();
    const contactSummaryFile = path.join(__dirname, 'config/contact-summary-reports.js');
    const { contactSummary } = await chtConfUtils.compileNoolsConfig({ contactSummary: contactSummaryFile });
    await utils.updateSettings({ contact_summary: contactSummary }, true);

    await utils.saveDocs([...places.values(), patient, ...reports]);

    await cookieLogin();
  });

  after(async () => {
    await utils.deleteDocs(['contact-summary-reports']);
    await utils.revertDb([/^form:/], true);
    await utils.revertSettings(true);
  });

  it('should load all reports', async () => {
    await commonPage.goToPeople(patient._id);
    await commonPage.openFastActionReport('contact-summary-reports', true);

    expect(await commonEnketoPage.getInputValue('Number of reports')).to.equal(reports.length.toString());
  });
});
