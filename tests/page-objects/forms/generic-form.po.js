const helper = require('../../helper');

module.exports = {
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
    const reportInvalidIcon = element(by.css('.detail>.status>.error'));
    const reportInvalidMessage = element(
      by.css('.verify-error>span:last-of-type')
    );
    helper.waitUntilReady(reportInvalidBtn);
    reportInvalidBtn.click();
    helper.waitUntilReady(reportInvalidIcon);
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

  submit: () => {
    const submitButton = element(by.css('[ng-click="onSubmit()"]'));
    helper.waitElementToBeClickable(submitButton);
    submitButton.click();
    helper.waitElementToBeVisible(element(by.css('div#reports-content')));
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
  },

  validateReport: () => {
    const reportValidBtn = element(by.css('[ng-include*="verify-valid"]'));
    const reportValidIcon = element(by.css('.detail>.status>.verified'));
    const reportValidMessage = element(
      by.css('.verify-valid>span:last-of-type')
    );
    helper.waitElementToBeClickable(reportValidBtn);
    reportValidBtn.click();
    helper.waitUntilReady(reportValidIcon);
    expect(reportValidMessage.getText()).toEqual('Correct');
  },

  waitForPageToBeReady: () => {
    helper.waitElementToBeClickable(element(by.css('.btn-link.cancel')));
    helper.waitForAngularComplete();
  }
};
