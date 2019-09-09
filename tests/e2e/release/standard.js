const helper = require('../../helper');
const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');

describe('Creating contacts with standard config', function() {
  it('should create a new district hospital', async function() {
    const districtName = 'Test District';
    await commonElements.goToPeople();
    await contactPage.addNewDistrict(districtName);
    helper.waitUntilReady(contactPage.contactName);
    expect(contactPage.contactName.getText()).toBe(districtName);
  });
});