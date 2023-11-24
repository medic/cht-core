const FORM_ID = 'pregnancy_facility_visit_reminder';
const FORM = `form[data-form-id="${FORM_ID}"]`;

const getAncReminderInfo = async () => {
  const ancVisitDate = await $(`${FORM} span[data-value=" /${FORM_ID}/visit_date_for_task "]`);
  await ancVisitDate.waitForDisplayed();
  return await ancVisitDate.getText();
};

module.exports = {
  getAncReminderInfo,
};
