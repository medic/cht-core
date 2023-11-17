const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

const FORM_ID = 'pregnancy_facility_visit_reminder';
const FORM = `form[data-form-id="${FORM_ID}"]`;

const formTitle = () => $(`${FORM} #form-title`);
const ancVisitDate = () => {
  return $(`${FORM} span[data-value=" /${FORM_ID}/visit_date_for_task "]`);
};
const reminderMethod = (value) => {
  return $(`${FORM} input[name="/${FORM_ID}/facility_visit_reminder/remind_method"][value="${value}"]`);
};

const getAncReminderInfo = async () => {
  return {
    title: await formTitle().getText(),
    visitDate: await ancVisitDate().getText(),
  };
};

const selectReminderMethod = async (method = 'in_person') => {
  const reminderAnc = await reminderMethod(method);
  await reminderAnc.waitForClickable();
  await reminderAnc.click();
};

const submitAncReminder = async (method) => {
  await selectReminderMethod(method);
  await genericForm.submitForm();
};

module.exports = {
  selectReminderMethod,
  getAncReminderInfo,
  submitAncReminder,
};
