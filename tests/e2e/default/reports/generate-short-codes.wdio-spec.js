const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const personFactory = require('../../../factories/cht/contacts/person');
const place = require('../../../factories/cht/contacts/place');
const places = place.generateHierarchy();
const clinic = places.find((place) => place.type === 'clinic');

const contact = personFactory.build(
  {
    parent: {
      _id: clinic._id,
      parent: clinic.parent
    },
    phone: '+254712345670'
  });

const docs = [...places, contact];

describe('generating short codes', () => {
  const forms = {
    'CASEID': {
      'meta': { 'code': 'CASEID', 'icon': 'icon-healthcare', 'translation_key': 'Case Id Form' },
      'fields': {}
    }
  };

  const registrations = [{
    form: 'CASEID', events: [ { name: 'on_create', trigger: 'add_case' } ]
  }];

  const transitions = {
    update_clinics: true, registration: true
  };

  before(async () => {
    await utils.saveDocs(docs);
    await utils.updateSettings({forms, registrations, transitions}, true);

    await loginPage.cookieLogin();
  });

  it('create case ID', async () => {
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
    await (await reportsPage.firstReport()).click();
    expect(await (await reportsPage.submitterName()).getText()).to.contain(contact.name);
    expect(await (await reportsPage.submitterPhone()).getText()).to.contain(contact.phone);
    expect(await (await reportsPage.submitterPlace()).getText()).to.contain(clinic.name);
    expect(await (await reportsPage.selectedCaseIdLabel()).getText()).to.contain('Case ID');
    expect(await (await reportsPage.selectedCaseId()).getText()).to.match(/^\d{5}$/);
  });
});

