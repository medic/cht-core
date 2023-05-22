const utils = require('@utils');
const helper = require('../../../helper');
const fs = require('fs');

const xml = fs.readFileSync(`${__dirname}/../../../../config/standard/forms/app/delivery.xml`, 'utf8');

const docs = [
  {
    _id: 'form:standard_delivery',
    internalId: 'D',
    title: 'Standard Delivery',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  },
];

const selectRadioButton = async value => {
  await element(by.css(`[value=${value}]`)).click();
};

module.exports = {
  configureForm: (userContactDoc) => {
    return utils.seedTestData(userContactDoc, docs);
  },

  //patient page
  getPatientPageTitle: () => {
    return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
  },

  selectPatientName: async name => {
    const select = element(by.css('.selection'));
    await helper.waitUntilReadyNative(select);
    await select.click();
    const search = await element(by.css('.select2-search__field'));
    await search.click();
    await search.sendKeys(name);
    await helper.waitElementToBeVisibleNative(element(by.css('.name')));
    await element(by.css('.name')).click();
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
  enterDeliveryDate: async deliveryDate => {
    const datePicker = element(by.css('[placeholder="yyyy-mm-dd"]'));
    await datePicker.click();
    //type date in the text box as '2017-04-23'
    await datePicker.sendKeys(deliveryDate);
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

  getFollowUpMessage: async () => {
    const css = '[lang="en"] [data-value=" /delivery/chw_sms "]';
    await helper.waitElementToBeVisibleNative(element(by.css(css)));
    return element(by.css(css)).getText();
  },
};
