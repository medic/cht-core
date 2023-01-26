const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const utils = require('../../../utils');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');

describe('Delete Contacts', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const onlineUser = userFactory.build({ place: healthCenter._id, roles: [ 'program_officer' ] });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  let patientDocs;

  beforeEach(async () => {
    await utils.saveDocs([ ...places.values() ]);
    patientDocs = await utils.saveDocs([ patient ]);
    await utils.createUsers([ onlineUser ]);
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToPeople();
    await commonPage.waitForPageLoaded();
  });

  it('Should delete contact', async () => {
    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.waitForContactLoaded();

    const patientExists = !!(await contactPage.getAllRHSPeopleNames()).find(person => person === patient.name);
    expect(patientExists).to.be.true;

    await contactPage.selectRHSRowById(patientDocs[0].id);
    await contactPage.deletePerson();
    await contactPage.waitForContactLoaded();

    const patientStillExists = !!(await contactPage.getAllRHSPeopleNames()).find(person => person === patient.name);
    expect(patientStillExists).to.be.false;
  });
});
