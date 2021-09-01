const utils = require('../../utils');
const customTypeFactory = require('../../factories/cht/contacts/custom_type');
const login = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactsPage = require('../../page-objects/contacts/contacts.wdio.page');

describe('Creating custom places', () => {
  before(async () => {
    await utils.addTranslations('en', { 'contact.type.ngo.new': 'New NGO' });
    await utils.updateSettings({ contact_types: customTypeFactory.customTypes()},true);
    await login.cookieLogin();
    
  });
  it('the place button should show the appropriate title', async () => {
    await commonPage.goToPeople();
    await expect(await contactsPage.leftAddPlace()).toHaveText('New NGO');
  });
});
