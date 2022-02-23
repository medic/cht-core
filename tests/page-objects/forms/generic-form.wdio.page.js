const submitButton = () => $('.enketo .submit');
const nextButton = () => $('button.btn.btn-primary.next-page');
const nameField = () => $('#report-form form [name="/data/name"]');

const nextPage = async (numberOfPages = 1) => {
  for (let i = 0; i < numberOfPages; i++) {
    await (await nextButton()).waitForDisplayed();
    await (await nextButton()).click();
  }
};

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
  await (await $(`section[name="${inputName}"] .select2-selection`)).click();
  const searchField = await $('.select2-search__field');
  await searchField.setValue(contactName);
  const contact = await $('.name');
  await contact.waitForDisplayed();
  await contact.click();
};

module.exports = {
  submitButton,
  nextPage,
  openReportReviewMenu,
  invalidateReport,
  validateReport,
  nameField,
  selectContact,
};
