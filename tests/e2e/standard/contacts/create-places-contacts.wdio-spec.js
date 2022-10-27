const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/standard/contacts/contacts.wdio.page');

describe('Creating contacts with standard config. ', () => {
  const PLACE_TYPES = { CLINIC: 'clinic', HEALTH_CENTER: 'health_center', DISTRICT: 'district_hospital' };
  const CONTACT_NAME_SUFFIX = ' Contact';
  const districtName = 'District test';
  const healthCenterName = 'Health Center test';
  const clinicName = 'Clinic test';

  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
  });

  it('should create a new district hospital', async () => {
    await commonPage.goToPeople();
    await contactPage.addPlace(PLACE_TYPES.DISTRICT, districtName, districtName + CONTACT_NAME_SUFFIX);
    await commonPage.waitForPageLoaded();
    expect(await (await contactPage.contactPageDefault.contactCard()).getText()).to.equal(districtName);
    expect(await contactPage.contactPageDefault.getPrimaryContactName()).to.equal(districtName + CONTACT_NAME_SUFFIX);
  });

  it('should create a new health center in the district hospital', async () => {
    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(districtName);
    await contactPage.addPlace(PLACE_TYPES.HEALTH_CENTER, healthCenterName, healthCenterName + CONTACT_NAME_SUFFIX);
    await commonPage.waitForPageLoaded();
    expect(await (await contactPage.contactPageDefault.contactCard()).getText()).to.equal(healthCenterName);
    expect(await contactPage.contactPageDefault.getPrimaryContactName()).to.equal(healthCenterName
      + CONTACT_NAME_SUFFIX);
  });

  it('should create a new clinic in the health center', async () => {
    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(healthCenterName);
    await contactPage.addPlace(PLACE_TYPES.CLINIC, clinicName, clinicName + CONTACT_NAME_SUFFIX);
    await commonPage.waitForPageLoaded();
    expect(await (await contactPage.contactPageDefault.contactCard()).getText()).to.equal(clinicName);
    expect(await contactPage.contactPageDefault.getPrimaryContactName()).to.equal(clinicName + CONTACT_NAME_SUFFIX);
  });
});
