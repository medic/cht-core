const FORM = 'form[data-form-id="undo_death_report"]';

const confirmUndoDeathOption = (value) => $(FORM +
  ` input[name="/undo_death_report/undo/undo_information"][value="${value}"]`);

const setConfirmUndoDeathOption = async (value = 'yes') => {
  const confirmation = await confirmUndoDeathOption(value);
  await confirmation.waitForDisplayed();
  await confirmation.click();
};

module.exports = {
  setConfirmUndoDeathOption,
};
