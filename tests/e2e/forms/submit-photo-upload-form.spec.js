const helper = require('../../helper');
const photoUpload = require('../../page-objects/forms/photo-upload.po');
const common = require('../../page-objects/common/common.po');
const genericForm = require('../../page-objects/forms/generic-form.po');
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
  beforeAll(async () => {
    await photoUpload.configureFormNative(userContactDoc);
  });

  afterEach(utils.resetBrowser);

  afterAll(utils.afterEach);

  it('upload photo', async () => {
    await common.goToReportsNative();
    await genericForm.selectFormNative('photo-upload');
    await helper.waitElementToPresentNative(photoUpload.imagePathInput());
    await photoUpload.imagePathInput().sendKeys(
      path.join(__dirname, '../../../webapp/src/img/setup-wizard-demo.png')
    );
    await helper.waitUntilReadyNative(photoUpload.imagePreview());

    await genericForm.submitNative();
    await helper.waitUntilReadyNative(element(by.css('.report-image')));
    expect(await element(by.css('.report-image')).isPresent()).toBeTruthy();
  });
});
