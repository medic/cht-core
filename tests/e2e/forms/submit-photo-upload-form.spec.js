const helper = require('../../helper'),
      photoUpload = require('../../page-objects/forms/photo-upload.po.js'),
      common = require('../../page-objects/common/common.po.js'),
      utils = require('../../utils'),
      path = require('path');

const contactId = 'some_contact_id';
const doc = {
  _id: contactId,
  name: 'Jack',
  date_of_birth: '',
  phone: '+64274444444',
  alternate_phone: '',
  notes: '',
  type: 'person',
  reported_date: 1478469976421,
  parent: {
    _id: 'some_parent'
  }
};

describe('Submit Photo Upload form', () => {
  beforeAll(done => {
    utils
      .saveDoc(doc)
      .then(() => photoUpload.configureForm(contactId, done))
      .catch(done.fail);
  });

  afterEach(done =>{
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('upload photo', () => {
    common.goToReports();
    browser.wait(() => {
      return element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')).isPresent();
    }, 10000);

    browser.sleep(1000); // let the refresh work here - #3691

    // select form
    const addButton = element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus'));
    browser.wait(() => {
      return addButton.isPresent();
    }, 10000);
    helper.clickElement(addButton);
    element(by.css('.action-container .general-actions .dropup.open .dropdown-menu li:first-child a')).click();

    browser.wait(() => {
      return element(by.css('#photo-upload input[type=file]')).isPresent();
    }, 10000);

    element(by.css('#photo-upload input[type=file]'))
      .sendKeys(path.join(__dirname, '../../../webapp/src/img/simprints.png'));
    browser.wait(() => element(by.css('#photo-upload .file-picker .file-preview img')).isPresent(), 10000);
    //submit
    photoUpload.submit();
    browser.wait(() => element(by.css('div.details')).isPresent(), 10000);
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
    browser.wait(() => element(by.css('.report-image')).isPresent(), 10000);
    expect(element(by.css('.report-image')).isPresent()).toBeTruthy();
  });
});
