const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const helper = require('../../helper');
const utils = require('../../utils');

describe('Add new health center tests : ', () => {
  afterEach(utils.afterEach);
  beforeEach(utils.beforeEach);

  it('should add new health center', () => {
    commonElements.goToPeople();
    contactPage.addNewDistrict('Auckland');
    contactPage.addHealthCenter();
    const center = element(by.css('.card h2'));
    helper.waitUntilReady(center);
    expect(center.getText()).toBe('Mavuvu Clinic');
    const name = element(by.css('.children h4 span'));
    helper.waitUntilReady(name);
    expect(name.getText()).toBe('Gareth');
  });
});
