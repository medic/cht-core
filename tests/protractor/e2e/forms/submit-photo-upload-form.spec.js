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

  it('open photo upload form', () => {
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
      return element(by.css('#report-form')).isPresent();
    }, 10000);

    browser.wait(() => {
      return element(by.css('.fake-file-input')).element(by.xpath('../../input')).isPresent();
    }, 10000);

    const fileElem1 = element(by.css('.fake-file-input')).element(by.xpath('../../input')),
          absolutePath = path.join(__dirname, '../../../../static/img/simprints.png');
    browser.executeScript('arguments[0].style.visibility = "visible"; arguments[0].style.height = "1px"; arguments[0].style.width = "1px";  arguments[0].style.opacity = 1', fileElem1.getWebElement());
    fileElem1.sendKeys(absolutePath);
    //submit
    photoUpload.submit();
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
    expect(element(by.css('.report-image')).isPresent()).toBeTruthy();
  });
});
