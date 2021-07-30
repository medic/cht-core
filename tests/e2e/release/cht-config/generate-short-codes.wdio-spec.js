const utils = require('../../../utils');
const sUtils = require('../../sentinel/utils');
const commonElements = require('../../../page-objects/common/common.wdio.page');
const { cookieLogin } = require('../../../page-objects/login/login.wdio.page');
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
  beforeEach(async () => await cookieLogin());

  before(async () => {
    const forms = {
      'CASEID': {'meta': {'code': 'CASEID', 'icon': 'icon-healthcare', 'translation_key': 'Case Id Form'},
        'fields': {}, 'use_sentinel': true
      }
    };
    const registrations = [{'form': 'CASEID', 'events': [ { 'name': 'on_create', 'trigger': 'add_case' } ]}];

    await utils.saveDocs(docs);
    await utils.updateSettings({forms:forms, registrations:registrations,
      transitions:{'update_clinics': true,'registration': true}},
    false, true);
  });

  after(async () => await utils.deleteAllDocs());

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
    expect(await reportsPage.submitterName()).toMatch(contact.name);
    expect(await reportsPage.submitterPhone()).toBe(contact.phone);
    expect(await reportsPage.submitterPlace()).toBe(clinic.name);
    expect(await reportsPage.getCaseIdLabel()).toBe('Case ID');
    expect(await reportsPage.getCaseId()).toMatch(/^\d{5}$/);
  });
});

