const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const personFactory = require('@factories/cht/contacts/person');
const place = require('@factories/cht/contacts/place');

describe('Generating short codes', () => {
  const places = place.generateHierarchy();
  const clinic = places.get('clinic');
  const contact = personFactory.build({ parent: { _id: clinic._id, parent: clinic.parent }, phone: '+254712345670' });

  const forms = {
    'CASEID': {
      'meta': { 'code': 'CASEID', 'icon': 'icon-healthcare', 'translation_key': 'Case Id Form' },
      'fields': {}
    }
  };

  const registrations = [{ form: 'CASEID', events: [{ name: 'on_create', trigger: 'add_case' }] }];
  const transitions = { update_clinics: true, registration: true };

  before(async () => {
    await utils.saveDocs([...places.values(), contact]);
    await utils.updateSettings({ forms, registrations, transitions }, { ignoreReload: true });

    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
    await utils.revertSettings(true);
  });

  it('should create case ID', async () => {
    await utils.request({
      method: 'POST',
      path: '/api/v2/records',
      body: {
        _meta: {
          form: 'CASEID',
          from: contact.phone
        }
      }
    });
    await sentinelUtils.waitForSentinel();
    await commonElements.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().click();

    const openReportInfo = await reportsPage.getOpenReportInfo();
    expect(openReportInfo.senderName).to.contain(contact.name);
    expect(openReportInfo.senderPhone).to.contain(contact.phone);
    expect(openReportInfo.lineage).to.contain(clinic.name);
    expect(await reportsPage.rightPanelSelectors.selectedCaseIdLabel().getText()).to.contain('Case ID');
    expect(await reportsPage.rightPanelSelectors.selectedCaseId().getText()).to.match(/^\d{5}$/);
  });
});

