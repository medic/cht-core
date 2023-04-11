const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const gatewayApiUtils = require('../../../gateway-api.utils');
const placeFactory = require('@factories/cht/contacts/place');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const sentinelUtils = require('@utils/sentinel');

const formId = 'CASEID';
const formTitle = 'Case Id Form';

const places = placeFactory.generateHierarchy();
const hcId = places.get('health_center')._id;

const user = userFactory.build({ place: hcId });

const forms = {
  CASEID: {
    meta: { code: formId, icon: 'icon-healthcare', translation_key: formTitle },
    fields: {}
  }
};

const registrations = [{
  form: formId, events: [{ name: 'on_create', trigger: 'add_case' }]
}];

const transitions = {
  self_report: true
};

const self_report = [{ form: formId }];

const docs = [...places.values(), user];

describe('Link SMS to patient without passing id', () => {
  before(async () => {
    await utils.saveDocs(docs);
    await utils.updateSettings({ forms, registrations, transitions, self_report }, true);
    await loginPage.cookieLogin();
  });

  it('Send SMS without patient_id and report created under person', async () => {
    await utils.createUsers([user]);
    await sentinelUtils.waitForSentinel();
    await gatewayApiUtils.api.postMessage({
      id: 'some-message-id',
      from: user.phone,
      content: formId
    });

    await commonPage.goToPeople(user.contact._id);
    const allRHSReports = await contactPage.getAllRHSReportsNames();

    expect([formTitle]).to.have.members(allRHSReports);
  });
});


