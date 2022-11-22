const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/standard/contacts/contacts.wdio.page');

describe('Creating contacts with standard config. ', () => {
  const PLACE_TYPES = { CLINIC: 'clinic', HEALTH_CENTER: 'health_center', DISTRICT: 'district_hospital' };
  const CONTACT_NAME_SUFFIX = ' Contact';
  const DISTRICT_NAME = 'District test';
  const HEALTH_CENTER_NAME = 'Health Center test';
  const CLINIC_NAME = 'Clinic test';

  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
  });

  it('should create a new district hospital', async () => {
    await commonPage.goToPeople();
    await contactPage.addPlace(PLACE_TYPES.DISTRICT, DISTRICT_NAME, DISTRICT_NAME + CONTACT_NAME_SUFFIX);
    await commonPage.waitForPageLoaded();
    const primaryContactName = await contactPage.contactPageDefault.getPrimaryContactName();
    const contactCardText = await contactPage.contactPageDefault.getContactCardText();
    expect(contactCardText).to.equal(DISTRICT_NAME);
    expect(primaryContactName).to.equal(DISTRICT_NAME + CONTACT_NAME_SUFFIX);
  });

  it('should create a new health center in the district hospital', async () => {
    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(DISTRICT_NAME);
    await contactPage.addPlace(PLACE_TYPES.HEALTH_CENTER, HEALTH_CENTER_NAME, HEALTH_CENTER_NAME + CONTACT_NAME_SUFFIX);
    await commonPage.waitForPageLoaded();
    const primaryContactName = await contactPage.contactPageDefault.getPrimaryContactName();
    const contactCardText = await contactPage.contactPageDefault.getContactCardText();
    expect(contactCardText).to.equal(HEALTH_CENTER_NAME);
    expect(primaryContactName).to.equal(HEALTH_CENTER_NAME + CONTACT_NAME_SUFFIX);
  });

  it('should create a new clinic in the health center', async () => {
    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(HEALTH_CENTER_NAME);
    await contactPage.addPlace(PLACE_TYPES.CLINIC, CLINIC_NAME, CLINIC_NAME + CONTACT_NAME_SUFFIX);
    await commonPage.waitForPageLoaded();
    const primaryContactName = await contactPage.contactPageDefault.getPrimaryContactName();
    const contactCardText = await contactPage.contactPageDefault.getContactCardText();
    expect(contactCardText).to.equal(CLINIC_NAME);
    expect(primaryContactName).to.equal(CLINIC_NAME + CONTACT_NAME_SUFFIX);
  });
});
