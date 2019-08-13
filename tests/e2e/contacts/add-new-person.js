const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const helper = require('../../helper');
const utils = require('../../utils');

describe('Add new person tests : ', () => {
  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('should add new person', () => {
    commonElements.goToPeople();
    expect(commonElements.isAt('contacts-list'));
    contactPage.addNewDistrict('BedeDistrict');
    const district = element(by.css('.card h2'));
    helper.waitUntilReady(district);
    expect(district.getText()).toBe('BedeDistrict');
    const name = element(by.css('.children h4 span'));
    helper.waitUntilReady(name);
    expect(name.getText()).toBe('Bede');
  });
});
