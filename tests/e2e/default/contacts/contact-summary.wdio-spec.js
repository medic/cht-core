const commonElements = require('../../../page-objects/default/common/common.wdio.page.js');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page.js');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');
const utils = require('../../../utils');

describe('Set contact summary and validate the info correspond', () => {
  const CONTACT_NAME = 'Maria Gomez';
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const districtHospitalPrimaryContact = userFactory.build({ place: districtHospital._id });
  const healthCenter = places.get('health_center');
  const parent = { _id: healthCenter._id, parent: healthCenter.parent };
  const healthCenterPrimaryContact = personFactory.build({ name: CONTACT_NAME, parent: parent });
  healthCenter.contact = {
    _id: healthCenterPrimaryContact._id,
    name: healthCenterPrimaryContact.name,
    phone: healthCenterPrimaryContact.phone
  };
  const docs = [...places.values(), districtHospitalPrimaryContact, healthCenterPrimaryContact];

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([districtHospitalPrimaryContact]);
    await loginPage.login(districtHospitalPrimaryContact);
    await commonPage.waitForPageLoaded();
  });
});
