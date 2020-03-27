const utils = require('../../utils');
const helper = require('../../helper');
const genericForm = require('./generic-form.po');
const fs = require('fs');

const xml = fs.readFileSync(`${__dirname}/../../../config/standard/forms/app/delivery.xml`, 'utf8');

const docs = [
  {
    _id: 'form:delivery',
    internalId: 'D',
    title: 'Delivery',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  },
];

const selectRadioButton = value => {
  element(by.css(`[value=${value}]`)).click();
};

module.exports = {
  configureForm: (userContactDoc, done) => {
    utils.seedTestData(done, userContactDoc, docs);
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
    const locator = '[data-value=" /delivery/group_note/default_chw_sms_text "]';
    const  e = element.all(by.css(locator)).filter(function(elem) {
      return elem.getText().then(function(text) {
        return text;
      });
    });
    return e.first().getText();
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
    const css = '[lang="en"] [data-value=" /delivery/chw_sms "]';
    helper.waitElementToBeVisible(element(by.css(css)));
    return element(by.css(css)).getText();
  },
};
