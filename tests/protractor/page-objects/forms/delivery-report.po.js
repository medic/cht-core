const utils = require('../../utils'),
  auth = require('../../auth')(),
  helper = require('../../helper'),
  path = require('path'),
  fs = require('fs');
  
const FILE = path.join(__dirname, '..', '..', 'resources/xml/delivery-form.xml');
const userSettingsDocId = `org.couchdb.user:${auth.user}`;
const contactId = '3b3d50d275280d2568cd36281d00348b';
const docs = [
  {
    _id: 'form:delivery',
    internalId: 'D',
    title: 'Delivery',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: new Buffer(fs.readFileSync(FILE)).toString('base64')
      }
    }
  }];

const selectRadioButton = (value) => {
  element(by.css(`[value=${value}]`)).click();
};

module.exports = {
  configureForm: (done) => {
    utils.seedTestData(done, contactId, docs);
  },
  teardown: done => {
    utils.afterEach()
      .then(() => utils.getDoc(userSettingsDocId))
      .then((user) => {
        user.contact_id = undefined;
        return utils.saveDoc(user);
      })
      .then(done, done);
  },
  nextPage: () => {
    const nextButton = element(by.css('button.btn.btn-primary.next-page'));
    helper.waitElementToBeClickable(nextButton);
    nextButton.click();
  },

  goBack: () => {
    element(by.css('button.btn.btn-default.previous-page')).click();
  },

  submit: () => {
    const submitButton = element(by.css('[ng-click="onSubmit()"]'));
    helper.waitElementToBeClickable(submitButton);
    submitButton.click();
    helper.waitElementToBeVisisble(element(by.css('div#reports-content')));
  },

  getPatientPageTitle: () => {
    return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
  },

  selectPatientName: (name) => {
    browser.driver.navigate().refresh();
    helper.waitElementToBeClickable(element(by.css('button.btn.btn-primary.next-page')));

    element(by.css('.selection')).click();
    const search = element(by.css('.select2-search__field'));
    search.click();
    search.sendKeys(name);
    helper.waitElementToBeVisisble(element(by.css('.name')));
    element(by.css('.name')).click();
  },

   selectLiveBirthButton: () => {
    selectRadioButton('healthy');
  },
  selectStillBirthButton: () => {
    selectRadioButton('still_birth');
  },

  selectMiscarriageButton: () => {
    selectRadioButton('miscarriage');
  },

  selectFacilityButton: () => {
    selectRadioButton('f');
  },

  selectHomeSkilledButton: () => {
    selectRadioButton('s');
  },

  selectHomeNonSkilledButton: () => {
    selectRadioButton('ns');
  },

  enterDeliveryDate: (deliveryDate) => {
    const datePicker = element(by.css('[placeholder="yyyy-mm-dd"]'));
    datePicker.click();
    datePicker.sendKeys(deliveryDate);
  },

  reset: () => {
    element(by.css('.icon.icon-refresh')).click();
  },

  getNoteToCHW: () => {
    return element(by.css('textarea')).getAttribute('value');
  },

  getOutcomeText: () => {
    return element(by.css('[data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]'))
      .getInnerHtml();
  },

  getDeliveryLocationSummaryText: () => {
    return element(by.css('[data-value=" /delivery/group_summary/r_delivery_location "]'))
      .getInnerHtml();
  },

  getFollowUpMessage: () => {
    return element(by.css('[data-value=" /delivery/group_note/g_chw_sms "]')).getInnerHtml();
  },
};