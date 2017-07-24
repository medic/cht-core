const commonElements = require('../../page-objects/common/common.po.js'),
  contactPage = require('../../page-objects/contacts/contacts.po.js');

describe('Add new district tests : ', () => {
  it('should open new place form', () => {
    browser.driver.navigate().refresh();
    commonElements.goToPeople();
    expect(commonElements.isAt('contacts-list'));
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'contacts/');
    contactPage.addNewDistrict('BedeDistrict', 'Bede');
  });
});
