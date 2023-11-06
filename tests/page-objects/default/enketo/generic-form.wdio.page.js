const utils = require('@utils');
const commonPage = require('../common/common.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');

const submitButton = () => $('.enketo .submit');
const cancelButton = () => $('.enketo .cancel');
const nextButton = () => $('button.btn.btn-primary.next-page');
const nameField = () => $('#report-form form [name="/data/name"]');
const errorContainer = () => $('.empty-selection');
const formTitle = () => $('.enketo form #form-title');

const currentFormView = () => $('.enketo form .current');

const validationErrors = () => $$('.invalid-required');
const waitForValidationErrorsToDisappear = () => browser.waitUntil(async () => !(await validationErrors()).length);

const nextPage = async (numberOfPages = 1, waitForLoad = true) => {
  if (waitForLoad) {
    if ((await validationErrors()).length) {
      await (await formTitle()).click(); // focus out to trigger re-validation
      await waitForValidationErrorsToDisappear();
    }
  }

  for (let i = 0; i < numberOfPages; i++) {
    const currentPageId = (await currentFormView()).elementId;
    await (await nextButton()).waitForDisplayed();
    await (await nextButton()).waitForClickable();
    await (await nextButton()).click();
    waitForLoad && await browser.waitUntil(async () => (await currentFormView()).elementId !== currentPageId);
  }
};

const fieldByName = (formId, name) => $(`#report-form [name="/${formId}/${name}"]`);

const invalidateReport = async () => {
  await reportsPage.openReviewAndSelectOption('invalid-option');
  await commonPage.waitForPageLoaded();
  expect(await reportsPage.getSelectedReviewOption()).to.equal('Has errors');
};

const validateReport = async () => {
  await reportsPage.openReviewAndSelectOption('valid-option');
  await commonPage.waitForPageLoaded();
  expect(await reportsPage.getSelectedReviewOption()).to.equal('Correct');
};

const selectContact = async (inputName, contactName) => {
  const select2Selection = () => $(`section[name="${inputName}"] .select2-selection`);
  await (await select2Selection()).click();
  const searchField = await $('.select2-search__field');
  await searchField.setValue(contactName);
  const contact = await $('.name');
  await contact.waitForDisplayed();
  await contact.click();
  await browser.waitUntil(async () =>
    (await (await select2Selection()).getText()).toLowerCase().endsWith(contactName.toLowerCase()));
};
const editForm = async () => {
  await commonPage.openMoreOptionsMenu();
  await (await reportsPage.editReportButton()).waitForClickable();
  await (await reportsPage.editReportButton()).click();
};

const verifyReport = async () => {
  const reportId = await reportsPage.getCurrentReportId();
  const initialReport = await utils.getDoc(reportId);
  expect(initialReport.verified).to.be.undefined;

  await invalidateReport();
  const invalidatedReport = await utils.getDoc(reportId);
  expect(invalidatedReport.verified).to.be.false;
  expect(invalidatedReport.patient).to.be.undefined;

  await validateReport();
  const validatedReport = await utils.getDoc(reportId);
  expect(validatedReport.verified).to.be.true;
  expect(validatedReport.patient).to.be.undefined;
};

const submitForm = async () => {
  await waitForValidationErrorsToDisappear();
  await (await submitButton()).waitForClickable();
  await (await submitButton()).click();
};

const cancelForm = async () => {
  await (await cancelButton()).waitForClickable();
  await (await cancelButton()).click();
};

const getErrorMessage = async () => {
  await (await errorContainer()).waitForDisplayed();
  return await (await errorContainer()).getText();
};

const getFormTitle = async () => {
  await (await formTitle()).waitForDisplayed();
  return await (await formTitle()).getText();
};

const selectYesNoOption = async (selector, value = 'yes') => {
  const element = await $(`${selector}[value="${value}"]`);
  await element.waitForDisplayed();
  await element.click();
  return value === 'yes';
};

module.exports = {
  getFormTitle,
  getErrorMessage,
  submitButton,
  cancelButton,
  nextPage,
  invalidateReport,
  validateReport,
  nameField,
  fieldByName,
  selectContact,
  verifyReport,
  editForm,
  cancelForm,
  submitForm,
  currentFormView,
  formTitle,
  selectYesNoOption,
};
