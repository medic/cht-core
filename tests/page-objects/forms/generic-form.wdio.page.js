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
  const reportInvalidBtn = await $('.verify-error');
  await reportInvalidBtn.click();
  const reportInvalidMessage = await $('.verify-error.active');
  expect(await reportInvalidMessage.getText()).to.equal('Has errors');
};

const validateReport = async () => {
  const reportValidBtn = await $('.verify-valid');
  await reportValidBtn.click();
  const reportValidMessage = await $('.verify-valid.active');
  expect(await reportValidMessage.getText()).to.equal('Correct');
};

module.exports = {
  submitButton,
  nextPage,
  openReportReviewMenu,
  invalidateReport,
  validateReport,
  nameField
};
