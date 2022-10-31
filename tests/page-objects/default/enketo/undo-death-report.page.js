const FORM ='form[data-form-id="undo_death_report"]';

const submitReporConfirmation = (value) => $(`${FORM} ` +
  `input[name="/undo_death_report/undo/undo_information"][value="${value}"]`);

const selectSubmitReportConfirmation = async (value = 'yes') => {
  const confirmation = await submitReporConfirmation(value);
  await confirmation.waitForDisplayed();
  await confirmation.click();
};

module.exports = {
  selectSubmitReportConfirmation,
};
