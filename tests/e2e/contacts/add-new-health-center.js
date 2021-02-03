const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const helper = require('../../helper');
const utils = require('../../utils');

describe('Add new health center tests : ', () => {
  afterEach(async () => { await utils.afterEachNative(); });
  beforeEach(async () => { await utils.beforeEach(); });

  it('should add new health center', async () => {
    await commonElements.goToPeople();
    await contactPage.addNewDistrict('Auckland');
    await contactPage.addHealthCenter();
   
    await  helper.waitUntilReadyNative(contactPage.center());
    expect(await contactPage.center().getText()).toBe('Mavuvu Clinic');
    await  helper.waitUntilReadyNative(contactPage.name());
    expect(await contactPage.name().getText()).toBe('Gareth');
  });
});
