const { element } = require('protractor');
const helper = require('../../../helper');
const utils = require('../../../utils');
const nameField = element(by.css('#report-form form [name="/data/name"]'));
const submitButton = element(by.css('.enketo .submit'));
const submittedName = element(by.css('#reports-content .details ul li:first-child p'));
const formTitle = element(by.id('form-title'));
const nextButton = element(by.css('button.btn.btn-primary.next-page'));

const leftActionBarButtons = () => element.all(by.css('.general-actions .actions.dropup > a'));

const fillForm = async (formFields) => {
  for (const [fieldName] of Object.entries(formFields)) {
    const field = formFields[fieldName];
    const elm = element(by.css(field.css));
    if (field.textField) {
      await elm.sendKeys(field.value);
    } else {
      const radioButton = element(by.css(`${field.css}[value=${field.value}]`));
      await helper.clickElementNative(radioButton);
    }
    if (field.endOfPage){
      await module.exports.nextPageNative();
    }
  }
};

module.exports = {
  fillForm,
  submittedName,
  submitButton,
  nameField,
  formTitle,
  editForm: () => {
    helper.waitForAngularComplete();
    const moreOptionsMenu = element.all(
      by.css('.more-options-menu-container>.mat-menu-trigger')
    );
    helper.waitUntilReady(moreOptionsMenu);
    moreOptionsMenu.click();

    const editFormBtn = element.all(
      by.css('.mat-menu-content .mat-menu-item[test-id="edit-reports"]')
    );
    helper.waitUntilReady(editFormBtn);
    editFormBtn.click();
  },

  editFormNative: async () => {
    const moreOptionsMenu = element.all(
      by.css('.more-options-menu-container>.mat-menu-trigger')
    );
    helper.waitUntilReadyNative(moreOptionsMenu);
    moreOptionsMenu.click();

    const editFormBtn = element(
      by.css('.mat-menu-content .mat-menu-item[test-id="edit-reports"]')
    );
    await helper.waitUntilReadyNative(editFormBtn);
    await editFormBtn.click();
  },

  goBack: () => {
    element(by.css('button.btn.btn-default.previous-page')).click();
  },

  invalidateReportNative: async () => {
    const reportInvalidBtn = element(by.css('.verify-error'));
    await helper.waitUntilReadyNative(reportInvalidBtn);
    await reportInvalidBtn.click();
    const reportInvalidIcon = element(by.css('.detail>.status>.error'));
    await helper.waitUntilReadyNative(reportInvalidIcon);
    const reportInvalidMessage = element(by.css('.verify-error.active'));
    await helper.waitUntilReadyNative(reportInvalidMessage);
    expect(await reportInvalidMessage.getText()).toEqual('Has errors');
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

  nextPageNative: async (numberOfPages = 1) => {
    const nextButton = element(by.css('button.btn.btn-primary.next-page'));

    for (let i = 0; i < numberOfPages; i++) {
      await helper.waitUntilReadyNative(nextButton);
      await helper.waitElementToBeClickable(nextButton);
      await nextButton.click();
    }
  },
  nextButton,

  reportApprove: () => {
    helper.waitForAngularComplete();
    const checkBtn = element(by.css('.fa-check'));
    helper.waitUntilReady(checkBtn);
    checkBtn.click();
  },

  reportApproveNative: async () => {
    const reviewButton = element.all(by.css('.actions>.mm-icon-inverse>.fa-check')).get(0);
    await helper.waitUntilReadyNative(reviewButton);
    await reviewButton.click();
  },

  selectForm: () => {
    utils.deprecated('selectForm', 'selectFormNative');
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

  selectFormNative: async (formId, nonAdminUser = false) => {
    if (!nonAdminUser) { // non-admin may or may not get the "select" mode button, depending on permissions
      const expectedActionbarButtons = 3;
      // wait for all actionbar links to appear
      await browser.wait(async () => await leftActionBarButtons().count() === expectedActionbarButtons, 1000);
    }

    try {
      await module.exports.openForm(formId);
    } catch (err) {
      console.warn('Failed to click to open form');
      await module.exports.openForm(formId);
    }

    // waiting for form
    await helper.waitUntilReadyNative(element(by.css('#report-form #form-title')));
  },

  openForm: async (formId) => {
    const addButton = element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus'));
    await helper.waitUntilReadyNative(addButton);

    const openForm = async () => {
      await addButton.click();
      const form = module.exports.formByHref(formId);
      await helper.waitElementToBeVisibleNative(form, 1000);
      await form.click();
    };

    try {
      await openForm();
    } catch (err) {
      console.warn('Failed to open form, trying again');
      await openForm();
    }

    // waiting for form
    await helper.waitUntilReadyNative(element(by.css('#report-form #form-title')));
  },

  formByHref: (href) => {
    const css = `.action-container .general-actions .dropup.open .dropdown-menu li a[href="#/reports/add/${href}"]`;
    return element(by.css(css));
  },

  submit: () => {
    const submitButton = element(by.css('.btn.submit.btn-primary'));
    helper.scrollElementIntoView(submitButton);
    helper.waitElementToBeClickable(submitButton);
    submitButton.click();
    helper.waitElementToBeVisible(element(by.css('div#reports-content')));
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
  },

  submitNative: async () => {
    const submitButton = element(by.css('.btn.submit.btn-primary'));
    await helper.waitElementToBeClickable(submitButton);
    await submitButton.click();
    await helper.waitElementToDisappearNative(submitButton);
  },

  submitReports: async () => {
    const submitButton = element(by.css('.btn.submit.btn-primary'));
    await helper.waitElementToBeClickable(submitButton);
    await submitButton.click();
    await helper.waitElementToPresentNative(element(by.css('div#reports-content')));
    const details = element(by.css('div.details'));
    await helper.waitUntilReadyNative(details);
    expect(await details.isPresent()).toBeTruthy();
  },

  validateReportNative: async () => {
    const reportValidBtn = element(by.css('.verify-valid'));
    await helper.waitElementToBeClickable(reportValidBtn);
    await reportValidBtn.click();
    const reportValidIcon = element(by.css('.detail>.status>.verified'));
    await helper.waitUntilReadyNative(reportValidIcon);
    const reportValidMessage = element(by.css('.verify-valid.active'));
    await helper.waitUntilReadyNative(reportValidMessage);
    expect(await reportValidMessage.getText()).toEqual('Correct');
  },

  waitForPageToBeReady: () => {
    helper.waitElementToBeClickable(element(by.css('.btn-link.cancel')));
    helper.waitForAngularComplete();
  }
};
