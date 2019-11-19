const helper = require('../../helper');
const photoUpload = require('../../page-objects/forms/photo-upload.po');
const common = require('../../page-objects/common/common.po');
const utils = require('../../utils');
const constants = require('../../constants');
const path = require('path');

const userContactDoc = {
  _id: constants.USER_CONTACT_ID,
  name: 'Jack',
  date_of_birth: '',
  phone: '+64274444444',
  alternate_phone: '',
  notes: '',
  type: 'person',
  reported_date: 1478469976421,
  parent: {
    _id: 'some_parent',
  },
};

describe('Submit Photo Upload form', () => {
  beforeAll(done => {
    Promise.resolve()
      .then(() => photoUpload.configureForm(userContactDoc, done))
      .catch(done.fail);
  });

  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('upload photo', () => {
    common.goToReports();

    // select form
    const addButton = element(
      by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
    );
    helper.waitElementToPresent(addButton);
    helper.clickElement(addButton);
    element(by.xpath('//a[@href="#/reports/add/photo-upload"]')).click();
    helper.waitElementToPresent(
      element(by.css('#photo-upload input[type=file]'))
    );
    element(by.css('#photo-upload input[type=file]')).sendKeys(
      path.join(__dirname, '../../../webapp/src/img/simprints.png')
    );
    helper.waitElementToPresent(
      element(by.css('#photo-upload .file-picker .file-preview img'))
    );
    //submit
    photoUpload.submit();
    helper.waitElementToPresent(element(by.css('div.details')));
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
    helper.waitElementToPresent(element(by.css('.report-image')));
    expect(element(by.css('.report-image')).isPresent()).toBeTruthy();
  });
});
