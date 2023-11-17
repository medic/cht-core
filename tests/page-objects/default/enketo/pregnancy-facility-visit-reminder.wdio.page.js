const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

const FORM = 'form[data-form-id="pregnancy_facility_visit_reminder"]';

const formTitle = () => $(`${FORM} #form-title`);
const ancVisitDate = () => $(FORM +
  ' span[data-value=" /pregnancy_facility_visit_reminder/visit_date_for_task "]');
const reminderMethod = (value) => $(FORM +
  ` input[name="/pregnancy_facility_visit_reminder/facility_visit_reminder/remind_method"][value="${value}"]`);

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
