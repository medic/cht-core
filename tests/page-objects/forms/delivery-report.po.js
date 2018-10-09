const utils = require('../../utils'),
  helper = require('../../helper'),
  genericForm = require('./generic-form.po');

const xml = require('./data/delivery-report.po.data').xml;

const docs = [
  {
    _id: 'form:delivery',
    internalId: 'D',
    title: 'Delivery',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: new Buffer(xml).toString('base64'),
      },
    },
  },
];

const selectRadioButton = value => {
  element(by.css(`[value=${value}]`)).click();
};

module.exports = {
  configureForm: (contactId, done) => {
    utils.seedTestData(done, contactId, docs);
  },

  //patient page
  getPatientPageTitle: () => {
    return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
  },

  selectPatientName: name => {
    genericForm.waitForPageToBeReady();
    element(by.css('.selection')).click();
    const search = element(by.css('.select2-search__field'));
    search.click();
    search.sendKeys(name);
    helper.waitElementToBeVisible(element(by.css('.name')));
    element(by.css('.name')).click();
  },

  //Delivery Info page -- Pregnancy outcomes
  selectLiveBirthButton: () => {
    selectRadioButton('healthy');
  },
  selectStillBirthButton: () => {
    selectRadioButton('still_birth');
  },

  selectMiscarriageButton: () => {
    selectRadioButton('miscarriage');
  },

  //Delivery Info page -- Location of delivery
  selectFacilityButton: () => {
    selectRadioButton('f');
  },

  selectHomeSkilledButton: () => {
    selectRadioButton('s');
  },

  selectHomeNonSkilledButton: () => {
    selectRadioButton('ns');
  },

  //Delivery Info page -- Delivery date
  enterDeliveryDate: deliveryDate => {
    const datePicker = element(by.css('[placeholder="yyyy-mm-dd"]'));
    datePicker.click();
    //type date in the text box as '2017-04-23'
    datePicker.sendKeys(deliveryDate);
  },

  reset: () => {
    element(by.css('.icon.icon-refresh')).click();
  },

  //note to CHW
  getNoteToCHW: () => {
    return element(by.css('textarea')).getAttribute('value');
  },

  //summary page
  getOutcomeText: () => {
    return element(
      by.css(
        '[lang="en"] [data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]'
      )
    ).getText();
  },

  getDeliveryLocationSummaryText: () => {
    return element(
      by.css(
        '[lang="en"] [data-value=" /delivery/group_summary/r_delivery_location "]'
      )
    ).getText();
  },

  getFollowUpMessage: () => {
    return element(
      by.css('[lang="en"] [data-value=" /delivery/group_note/g_chw_sms "]')
    ).getText();
  },
};
