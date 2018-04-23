const commonElements = require('../../page-objects/common/common.po.js'),
      contactPage = require('../../page-objects/contacts/contacts.po.js'),
      helper = require('../../helper'),
      utils = require('../../utils');

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
    contactPage.completeNewPersonForm('Bede');
    helper.waitUntilReady(element(by.css('.card .heading')));
    const district = element(by.css('.card h2'));
    expect(district.getText()).toBe('BedeDistrict');
    const name = element(by.css('.children h4 span'));
    expect(name.getText()).toBe('Bede');
  });
});
