const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const helper = require('../../helper');
const utils = require('../../utils');

describe('Add new person tests : ', () => {
  afterEach(async () => { await utils.resetBrowser(); });

  afterAll(async () => { await utils.afterEachNative(); });

  it('should add new person', async () => {
    await commonElements.goToPeople();
    const district = 'BedeDistrict';
    await contactPage.addNewDistrict(district);
    await  helper.waitUntilReadyNative(contactPage.center());
    expect(await contactPage.center().getText()).toBe(district);
    await  helper.waitUntilReadyNative(contactPage.name());
    expect(await contactPage.name().getText()).toBe('Bede');
  });
});
