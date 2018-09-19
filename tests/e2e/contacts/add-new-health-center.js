const commonElements = require('../../page-objects/common/common.po.js'),
  contactPage = require('../../page-objects/contacts/contacts.po.js'),
  utils = require('../../utils');

describe('Add new health center tests : ', () => {
  afterEach(utils.afterEach);
  beforeEach(utils.beforeEach);

  it('should add new health center', () => {
    commonElements.goToPeople();
    contactPage.addNewDistrict('Auckland');
    contactPage.completeNewPersonForm('Kiwimate');
    contactPage.addHealthCenter();
  });
});
