const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../page-objects/standard/contacts/contacts.wdio.page');

describe('Creating contacts with standard config', () => {
  const districtName = 'District test';
  const healthCenterName = 'Health Center test';
  const clinicName = 'Clinic test';

  beforeAll(async () => {
    await loginPage.cookieLogin();
  });
  afterAll(() => utils.revertDb());

  it('should create a new district hospital', async () => {
    await commonElements.goToPeople();
    await contactPage.addPlace('district_hospital', districtName, districtName + ' Contact');
    await commonPage.waitForPageLoaded();
    expect(await contactPage.contactName.getText()).toBe(districtName);
  });

  it('should create a new health center in the district hospital', async () => {
    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(districtName);

    await contactPage.addPlace('health_center', healthCenterName, healthCenterName + ' Contact');
    await commonPage.waitForPageLoaded();
    expect(await contactPage.contactName.getText()).toBe(healthCenterName);
  });

  it('should create a new clinic in the health center', async () => {
    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(healtchCenterName);
    await contactPage.addPlace('clinic', clinicName, clinicName + ' Contact');
    await commonPage.waitForPageLoaded();
    expect(await contactPage.contactName.getText()).toBe(clinicName);
  });
});
