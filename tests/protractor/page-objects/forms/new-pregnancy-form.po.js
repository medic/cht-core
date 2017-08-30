const helper = require('../../helper');

const getPatientNameDropDown = () => {
  element(by.id('select2-/delivery/inputs/contact/_id-wg-container'));
};

module.exports = {

  goNext: () => {
    element(by.css('.btn btn-primary next-page')).click();
  },

  goBack: () => {
    element(by.css('.btn btn-default previous-page')).click();
  },

  submit: () => {
    element(by.css('.btn submit btn-primary')).click();
  },

  getPatientPageTitle: () => {
    return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
  },

  selectPatientName: () => {
    getPatientNameDropDown().click();
  },

  selectLMPYesButton: () => {
    element(by.css('[value="calendar"]')).click();
  },

  selectLMPNoButton: () => {
    element(by.css('[value="approx"]')).click();
  },

  setLastCycleDate: (lmpDate) => {
    const datePicker = element(by.css('[placeholder="yyyy-mm-dd"]'));
    datePicker.click();
    datePicker.sendKeys(lmpDate);
  },

  reset: () => {
    element(by.css('.icon.icon-refresh')).click();
  },
  
  getEstimatedDeliveryDate: () => {
    return element(by.css('[data-value=" /pregnancy/group_lmp/g_edd "]')).getText();
  },

  checkFirstPregnancyCheckBox: () => {
    element(by.css('[value="r1"]')).click();
  },

  checkMoreThanFourChildrenCheckBox: () => {
    element(by.css('[value="r2"]')).click();
  },

  checkMastBabyYearBeforeCheckBox: () => {
    element(by.css('[value="r3"]')).click();
  },

  checkPreviousMiscarriagesCheckBox: () => {
    element(by.css('[value="r4"]')).click();
  },

  checkConditionsCheckBox: () => {
    element(by.css('[value="r5"]')).click();
  },

  checkHIVPisotiveCheckBox: () => {
    element(by.css('[value="r6"]')).click();
  },

  checkPainCheckBox: () => {
    element(by.css('[value="d1"]')).click();
  },

  checkBleedingCheckBox: () => {
    element(by.css('[value="d2"]')).click();
  },

  checkNauseaCheckBox: () => {
    element(by.css('[value="d3"]')).click();
  },

  checkFeverCheckBox: () => {
    element(by.css('[value="d4"]')).click();
  },

  checkHeadacheCheckBox: () => {
    element(by.css('[value="d5"]')).click();
  },

  checkWeightGainCheckBox: () => {
    element(by.css('[value="d6"]')).click();
  },

  checkLessMovementCheckBox: () => {
    element(by.css('[value="d7"]')).click();
  },

  checkBloodCheckBox: () => {
    element(by.css('[value="d8"]')).click();
  },

  checkDiarrheaCheckBox: () => {
    element(by.css('[value="d9"]')).click();
  },

  getTextArea: () => {
    return element(by.name('/pregnancy/group_note/chw_note'));
  },

  getId: () => {
    return element(by.css('[data-value=" /pregnancy/group_review/r_patient_id "]'));
  },

  getFollowUpMessage: () => {
    return element(by.css('[data-value=" /pregnancy/group_note/g_chw_sms "]'));
  },

  isRiskFactorDisplayed: (riskFactor) => {
    return helper.isTextDisplayed(riskFactor);
  },

  isDangerSignDisplayed: (dangerSign) => {
    return helper.isTextDisplayed(dangerSign);
  }
};
