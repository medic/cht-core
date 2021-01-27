const helper = require('../../helper');
const utils = require('../../utils');
const nameField = element(by.css('#report-form form [name="/data/name"]'));
const submitButton = element(by.css('#report-form .submit'));
const submittedName = element(by.css('#reports-content .details ul li:first-child p'));
const addButton = element(by.css('.general-actions>.actions>.dropdown-toggle>.fa-plus'));

module.exports = {
  submittedName,
  submitButton,
  nameField,
  editForm: () => {
    helper.waitForAngularComplete();
    const editFormBtn = element.all(
      by.css('[href^="#/reports/edit"]>.fa-pencil')
    );
    helper.waitUntilReady(editFormBtn);
    editFormBtn.click();
  },

  goBack: () => {
    element(by.css('button.btn.btn-default.previous-page')).click();
  },

  invalidateReport: () => {
    const reportInvalidBtn = element(by.css('[ng-include*="verify-invalid"]'));
    helper.waitUntilReady(reportInvalidBtn);
    reportInvalidBtn.click();
    const reportInvalidIcon = element(by.css('.detail>.status>.error'));
    helper.waitUntilReady(reportInvalidIcon);
    const reportInvalidMessage = element(by.css('.verify-error>span:last-of-type'));
    expect(reportInvalidMessage.getText()).toEqual('Has errors');
  },

  nextPage: multiple => {
    const nextButton = element(by.css('button.btn.btn-primary.next-page'));
    if (multiple) {
      for (let i = 0; i < multiple; i++) {
        helper.waitForAngularComplete();
        helper.waitElementToBeClickable(nextButton);
        nextButton.click();
      }
    } else {
      helper.waitUntilReady(nextButton);
      helper.waitElementToBeClickable(nextButton);
      nextButton.click();
    }
  },

  reportApprove: () => {
    helper.waitForAngularComplete();
    const checkBtn = element(by.css('.fa-check'));
    helper.waitUntilReady(checkBtn);
    checkBtn.click();
  },

  selectForm: () => {
    utils.deprecated('selectForm','selectFormNative');
    const addButton = element(
      by.css('.general-actions>.actions>.dropdown-toggle>.fa-plus')
    );
    helper.waitUntilReady(addButton);
    helper.waitElementToBeClickable(addButton);
    helper.waitForAngularComplete();
    addButton.click();
    element(
      by.css(
        '.action-container .general-actions .dropup.open .dropdown-menu li:first-child a'
      )
    ).click();
    helper.waitElementToPresent(element(by.css('#report-form')));
  },

  selectFormNative: async (formId) => {
    await helper.waitUntilReady(addButton);
    await helper.waitElementToBeClickable(addButton);
    await addButton.click();
    const form = module.exports.formByHref(formId);
    await form.click();
    await helper.waitElementToPresent(element(by.css('#report-form')));
  },

  formByHref: (href) => {
    const css = `.action-container .general-actions .dropup.open .dropdown-menu li a[href="#/reports/add/${href}"]`;
    return element(by.css(css));
  },

  submit: () => {
    const submitButton = element(by.css('.btn.submit.btn-primary'));
    helper.waitElementToBeClickable(submitButton);
    submitButton.click();
    helper.waitElementToBeVisible(element(by.css('div#reports-content')));
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
  },

  validateReport: () => {
    const reportValidBtn = element(by.css('[ng-include*="verify-valid"]'));
    helper.waitElementToBeClickable(reportValidBtn);
    reportValidBtn.click();
    const reportValidIcon = element(by.css('.detail>.status>.verified'));
    helper.waitUntilReady(reportValidIcon);
    const reportValidMessage = element(by.css('.verify-valid>span:last-of-type'));
    expect(reportValidMessage.getText()).toEqual('Correct');
  },

  waitForPageToBeReady: () => {
    helper.waitElementToBeClickable(element(by.css('.btn-link.cancel')));
    helper.waitForAngularComplete();
  }
};
