const utils = require('../../../utils');
const sUtils = require('../../sentinel/utils');
const commonElements = require('../../../page-objects/common/common.wdio.page');
const { cookieLogin } = require('../../../page-objects/login/login.wdio.page');
const reportsPage = require('../../../page-objects/reports/reportsPage.wdio');
const PHONE = '+254712345670';
const PARENT_ID ='parent-' + Date.now();
const CONTACT_ID ='contact-'+ Date.now();

const parentPlace = {
  _id: PARENT_ID,
  type: 'district_hospital',
  name: 'Test Hostpital',
  contact: {
    _id: CONTACT_ID,
    parent: {
      _id: PARENT_ID
    }
  }
};

const contact = {
  parent: {
    _id: PARENT_ID,
    parent: parentPlace.parent
  },
  name: 'Test Contact',
  phone: PHONE,
  reported_date: 1557404580557,
  type: 'person',
  _id: CONTACT_ID
};

const docs = [parentPlace, contact];

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
  beforeEach(async () => await cookieLogin());

  before(async () => {
    await utils.deleteAllDocs;
    const forms = {
      'CASEID': {'meta': {'code': 'CASEID', 'icon': 'icon-healthcare', 'translation_key': 'Case Id Form'},
        'fields': {}, 'use_sentinel': true
      }
    };

    const registrations = [{'form': 'CASEID', 'events': [ { 'name': 'on_create', 'trigger': 'add_case' } ]}];

    await utils.saveDocs(docs);
    await utils.updateSettings({forms:forms, registrations:registrations,
      transitions:{
        'update_clinics': true,
        'registration': true}, contact_types:[{'id': 'district_hospital'}]},
    false, true);
  });

  it('create case ID', async () => {
    await submit({
      _meta: {
        form: 'CASEID',
        from: PHONE
      },
      some_data: 'hello',
      a_number: 42,
      a_boolean: false,
      another_boolean: 0,
      an_optional_date: '2018-11-10'
    });
    await sUtils.waitForSentinel();
    await commonElements.goToReports();
    await (await reportsPage.firstReport()).click();
    await browser.pause(20000);
    await browser.saveScreenshot('screen.png');
    expect(await (await reportsPage.submitterName()).getText()).toMatch(contact.name);
    const caseId = await reportsPage.getCaseId();
    expect(caseId.length).toEqual(5);
    expect(await reportsPage.getCaseId()).toMatch(/^\d{5}$/);
  });
});

