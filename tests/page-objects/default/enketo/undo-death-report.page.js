const FORM = 'form[data-form-id="undo_death_report"]';

const confirmUndoDeathOption = (value) => {
  return $(`${FORM} input[name="/undo_death_report/undo/undo_information"][value="${value}"]`);
};
const patientName = () => $('span[data-value=" /undo_death_report/patient_display_name "]');

const setConfirmUndoDeathOption = async (value = 'yes') => {
  const confirmation = await confirmUndoDeathOption(value);
  await confirmation.waitForDisplayed();
  await confirmation.click();
};

const getConfirmationPatientName = async () => {
  const name = await patientName();
  await name.waitForDisplayed();
  return await name.getText();
};

module.exports = {
  setConfirmUndoDeathOption,
  getConfirmationPatientName,
};
