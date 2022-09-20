const helper = require('../../../helper');
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const commonElements = require('../../../page-objects/protractor/common/common.po.js');
const contactPage = require('../../../page-objects/protractor/contacts/contacts.po.js');
const uuid = require('uuid');
const districtId = uuid.v4();
const districtName = uuid.v4();
const healtchCenterName = uuid.v4();

describe('Creating contacts with standard config', () => {
  const expectedDocs = [
    {
      _id: districtId,
      name: districtName,
      type: 'district_hospital',
      reported_date: Date.now(),
    },
    {
      _id: uuid.v4,
      parent: {
        _id: districtId
      },
      name: healtchCenterName,
      type: 'health_center',
      reported_date: Date.now(),
    }
  ];

  beforeAll(async () => {
    await utils.saveDocs(expectedDocs);
    await sentinelUtils.waitForSentinel();
  });
  afterAll(() => utils.revertDb());

  it('should create a new district hospital', async () => {
    const expectDistrictName = 'Test District';
    await commonElements.goToPeople();
    await contactPage.addNewDistrict(expectDistrictName);
    await helper.waitUntilReadyNative(contactPage.contactName);
    expect(await contactPage.contactName.getText()).toBe(expectDistrictName);
  });

  it('should create a new health center', async () => {
    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(districtName);
    const hcName = 'Health Center 1';
    await contactPage.addHealthCenter(hcName);
    await helper.waitUntilReadyNative(contactPage.contactName);
    expect(await contactPage.contactName.getText()).toBe(hcName);
  });

  it('should create a new clinic', async () => {
    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(healtchCenterName);
    await contactPage.addClinic();
    await helper.waitUntilReadyNative(contactPage.contactName);
    expect(await contactPage.contactName.getText()).toBe('Clinic 1');
  });
});

