const genericForm = require('./generic-form.wdio.page');

const selectPatient = (patientName) => {
  return genericForm.selectContact('/pregnancy_danger_sign_follow_up/inputs/contact', patientName);
};

const selectVisitedHealthFacility = async () => {
  return (await $('input[name="/pregnancy_danger_sign_follow_up/danger_signs/visit_confirm"][value="yes"]')).click();
};

const selectNoDangerSigns = async () => {
  return (await $('input[name="/pregnancy_danger_sign_follow_up/danger_signs/danger_sign_present"][value="no"]'))
    .click();
};

module.exports = {
  selectPatient,
  selectVisitedHealthFacility,
  selectNoDangerSigns,
};
