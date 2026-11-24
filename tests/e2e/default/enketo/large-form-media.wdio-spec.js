/* global window */

const fs = require('fs');
const path = require('path');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');

describe('Large form media', () => {
  const FORM_ID = 'large-form-media';
  const FORM_DOC_ID = `form:${FORM_ID}`;
  const MEDIA_NAME = 'images/large.png';
  const MEDIA_BYTES = 11 * 1024 * 1024;

  const place = placeFactory.generateHierarchy(['district_hospital']).get('district_hospital');
  const user = userFactory.build({ place: place._id });

  const createLargeFormDoc = () => {
    const image = fs.readFileSync(path.join(__dirname, 'images/photo-for-upload-form.png'));
    const largeImage = Buffer.concat([image, Buffer.alloc(MEDIA_BYTES - image.length)]);
    const doc = commonPage.createFormDoc(path.join(__dirname, 'forms', FORM_ID));
    doc._attachments[MEDIA_NAME] = { content_type: 'image/png', data: largeImage.toString('base64') };
    return doc;
  };

  const waitForGeneratedForm = () => browser.waitUntil(async () => {
    const doc = await utils.getDoc(FORM_DOC_ID);
    return doc._attachments['form.html'] && doc._attachments['model.xml'];
  }, { timeoutMsg: 'The API did not generate the form' });

  const getLocalFormDoc = () => browser.execute(id => window.CHTCore.DB.get().get(id), FORM_DOC_ID);

  before(async () => {
    await utils.saveDocs([place, createLargeFormDoc()]);
    await waitForGeneratedForm();
    await utils.createUsers([user]);
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();
  });

  after(async () => {
    await browser.throttleNetwork('online');
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);
  });

  it('should display media downloaded at login while offline', async () => {
    const formDoc = await getLocalFormDoc();
    expect(Object.keys(formDoc._attachments)).to.have.members(['xml', 'form.html', 'model.xml']);
    expect(formDoc.form_media[MEDIA_NAME].length).to.equal(MEDIA_BYTES);

    await browser.throttleNetwork('offline');
    await commonPage.goToReports();
    await commonPage.openFastActionReport(FORM_ID, false);

    const image = await $(`#report-form img[data-media-src="${MEDIA_NAME}"]`);
    await image.waitForDisplayed();
    await browser.waitUntil(async () => await image.getProperty('naturalWidth') > 0, {
      timeoutMsg: 'The image was not loaded',
    });
  });
});
