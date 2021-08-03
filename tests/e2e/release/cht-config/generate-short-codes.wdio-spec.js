const utils = require('../../../utils');
const sUtils = require('../../sentinel/utils');
const commonElements = require('../../../page-objects/common/common.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const reportsPage = require('../../../page-objects/reports/reportsPage.wdio');
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
  const submit =  (body) => {
    return  utils.request({
      method: 'POST',
      path: '/api/v2/records',
      headers: {
        'Content-type': 'application/json'
      },
      body: body
    });
  };

  const form = {
    'CASEID': {
      'meta': { 'code': 'CASEID', 'icon': 'icon-healthcare', 'translation_key': 'Case Id Form' },
      'fields': {},
      'use_sentinel': true
    }
  };

  const registration = [{
    form: 'CASEID', events: [ { name: 'on_create', trigger: 'add_case' } ]
  }];
  
  const transition = {
    update_clinics: true, registration: true
  };

  before(async () => {
    const originalSettings = await utils.getSettings();
    const transitions = Object.assign(originalSettings.transitions,transition);

    await utils.saveDocs(docs);
    await utils.updateSettings({
      forms:form,
      registrations: registration,
      transitions: transitions
    },
    true);

    await loginPage.cookieLogin();
  });

  after(async () => await utils.revertDb([], true));

  it('create case ID', async () => {
    await submit({
      _meta: {
        form: 'CASEID',
        from: contact.phone
      }
    });
    await sUtils.waitForSentinel();
    await commonElements.goToReports();
    await (await reportsPage.firstReport()).click();
    expect(await (await reportsPage.submitterName()).getText()).toMatch(contact.name);
    expect(await (await reportsPage.submitterPhone()).getText()).toBe(contact.phone);
    expect(await (await reportsPage.submitterPlace()).getText()).toBe(clinic.name);
    expect(await (await reportsPage.caseIdLabel()).getText()).toBe('Case ID');
    expect(await (await reportsPage.caseId()).getText()).toMatch(/^\d{5}$/);
  });
});

