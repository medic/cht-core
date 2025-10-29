const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const chtConfUtils = require('@utils/cht-conf');
const path = require('path');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('user contact summary in forms', () => {
  const places = placeFactory.generateHierarchy();

  const districtHospital = places.get('district_hospital');
  const districtHospitalContact = personFactory.build({ parent: districtHospital });
  const districtHospitalUser = userFactory.build({
    username: 'user_filter_district_hospital',
    place: districtHospital._id,
    contact: districtHospitalContact,
  });

  const patient = personFactory.build({ parent: districtHospital });

  before(async () => {
    await utils.saveDocs([ ...places.values(), patient ]);
    await utils.createUsers([ districtHospitalUser ]);

    const formContext = {
      expression: 'userSummary.show_form === true',
    };
    await utils.saveDocIfNotExists(
      commonPage.createFormDoc(`${__dirname}/forms/users-contact-summary`, null, formContext)
    );
    await chtConfUtils.initializeConfigDir();
    const contactSummaryFile = path.join(__dirname, 'config/users-contact-summary.js');
    const { contactSummary } = await chtConfUtils.compileConfig({ contactSummary: contactSummaryFile });
    await utils.updateSettings({ contact_summary: contactSummary }, { ignoreReload: true });
    await loginPage.login(districtHospitalUser);
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should hide form based on summary', async () => {
    await commonPage.goToReports();
    const labels = await commonPage.getFastActionItemsLabelsFlat();
    expect(labels).to.not.include('users-contact-summary');
  });

  it('should show form based on summary', async () => {
    const contact = await utils.getDoc(districtHospitalContact._id);
    contact.show_form = true;
    await utils.saveDoc(contact);

    await commonPage.sync({ reload: true, expectReload: true });
    const labels = await commonPage.getFastActionItemsLabelsFlat();
    expect(labels).to.include('users-contact-summary');
  });

  it('should provide user contact summary to form context', async () => {
    const contact = await utils.getDoc(districtHospitalContact._id);
    contact.show_form = true;
    contact.note = 'this is the text we expect';
    await utils.saveDoc(contact);

    await commonPage.sync({ reload: true, expectReload: true });
    await commonPage.openFastActionReport('users-contact-summary', false);
    expect(await commonEnketoPage.getInputValue('user note')).to.equal(contact.note);
  });
});
