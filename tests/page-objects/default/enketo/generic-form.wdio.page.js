const utils = require('../../../utils');
const commonPage = require('../common/common.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');

const REVIEW_MENU = '[test-id="report-review-menu"]';
const submitButton = () => $('.enketo .submit');
const cancelButton = () => $('.enketo .cancel');
const nextButton = () => $('button.btn.btn-primary.next-page');
const nameField = () => $('#report-form form [name="/data/name"]');

const nextPage = async (numberOfPages = 1) => {
  for (let i = 0; i < numberOfPages; i++) {
    await (await nextButton()).waitForDisplayed();
    await (await nextButton()).click();
  }
};

const fieldByName = (formId, name) => $(`#report-form [name="/${formId}/${name}"]`);

const isReportReviewMenuOpen = async () => {
  return await (await $(REVIEW_MENU)).isExisting();
};

const openReportReviewMenu = async () => {
  if (await isReportReviewMenuOpen()) {
    return;
  }
  const reviewButton = $('[test-id="report-review-button"]');
  await (await reviewButton).waitForDisplayed();
  await (await reviewButton).click();
};

const invalidateReport = async () => {
  await openReportReviewMenu();
  await (await $(`${REVIEW_MENU} .verify-error`)).click();
  await commonPage.waitForPageLoaded();
  // Opening again the menu because it was automatically closed after selecting a menu option.
  await openReportReviewMenu();
  const reportInvalidMessage = $(`${REVIEW_MENU} .verify-error.active`);
  await (await reportInvalidMessage).waitForDisplayed();
  expect((await reportInvalidMessage.getText()).trim()).to.equal('Has errors');
};

const validateReport = async () => {
  await openReportReviewMenu();
  await (await $(`${REVIEW_MENU} .verify-valid`)).click();
  await commonPage.waitForPageLoaded();
  // Opening again the menu because it was automatically closed after selecting a menu option.
  await openReportReviewMenu();
  const reportValidMessage = $(`${REVIEW_MENU} .verify-valid.active`);
  await (await reportValidMessage).waitForDisplayed();
  expect((await reportValidMessage.getText()).trim()).to.equal('Correct');
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
    (await (await select2Selection()).getText()).toLowerCase().endsWith(contactName.toLowerCase())
  );
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

const submitForm = () => submitButton().click();

const cancelForm = async () => {
  await (await cancelButton()).click();
};

module.exports = {
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
};
