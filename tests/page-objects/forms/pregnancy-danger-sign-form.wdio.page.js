const selectPatient = async (patientName) => {
  await (await $('section[name="/pregnancy_danger_sign_follow_up/inputs/contact"] .select2-selection')).click();
  const searchField = await $('.select2-search__field');
  await searchField.setValue(patientName);
  const patient = await $('.name');
  await patient.waitForDisplayed();
  await patient.click();
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
