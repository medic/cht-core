const utils = require('../../utils');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const submitButton = () => $('.enketo .submit');
const nextButton = () => $('button.btn.btn-primary.next-page');
const nameField = () => $('#report-form form [name="/data/name"]');


const nextPage = async (numberOfPages = 1) => {
  for (let i = 0; i < numberOfPages; i++) {
    await (await nextButton()).waitForDisplayed();
    await (await nextButton()).click();
  }
};

const fieldByName = (formId, name) => $(`#report-form [name="/${formId}/${name}"]`);

const openReportReviewMenu = async () => {
  const reviewButton = await $('.actions>.mm-icon-inverse>.fa-check');
  await reviewButton.click();
};


const invalidateReport = async () => {
  const reportInvalidBtn = await $('.actions .sub-actions .verify-error');
  await reportInvalidBtn.click();
  const reportInvalidMessage = await $('.actions .sub-actions .verify-error.active');
  expect(await reportInvalidMessage.getText()).to.equal('Has errors');
};

const validateReport = async () => {
  const reportValidBtn = await $('.actions .sub-actions .verify-valid');
  await reportValidBtn.click();
  const reportValidMessage = await $('.actions .sub-actions .verify-valid.active');
  expect(await reportValidMessage.getText()).to.equal('Correct');
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
  const editFormBtn = await $('[href^="#/reports/edit"]>.fa-pencil');
  await editFormBtn.click();
};

const verifyReport = async () => {
  const reportId = await reportsPage.getCurrentReportId();
  const initialReport = await utils.getDoc(reportId);
  expect(initialReport.verified).to.be.undefined;

  await openReportReviewMenu();
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

module.exports = {
  submitButton,
  nextPage,
  openReportReviewMenu,
  invalidateReport,
  validateReport,
  nameField,
  fieldByName,
  selectContact,
  verifyReport,
  editForm,
  submitForm,
};
