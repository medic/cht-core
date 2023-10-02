const genericForm = require('./generic-form.wdio.page');

const formId = 'pregnancy_danger_sign_follow_up';
const dangerSigns = [
  'vaginal_bleeding',
  'fits',
  'severe_abdominal_pain',
  'severe_headache',
  'very_pale',
  'fever',
  'reduced_or_no_fetal_movements',
  'breaking_water',
  'easily_tired',
  'face_hand_swelling',
  'breathlessness',
];

const selectPatient = (patientName) => {
  return genericForm.selectContact(`/${formId}/inputs/contact`, patientName);
};

const selectVisitedHealthFacility = async (visited) => {
  const value = visited ? 'yes' : 'no';
  return (await $(`input[name="/${formId}/danger_signs/visit_confirm"][value="${value}"]`)).click();
};

const selectDangerSigns = async (hasDangerSigns) => {
  const value = hasDangerSigns ? 'yes' : 'no';
  await (await $(`input[name="/${formId}/danger_signs/danger_sign_present"][value="${value}"]`)).click();

  if (!hasDangerSigns) {
    return;
  }

  for (const dangerSign of dangerSigns) {
    await (await $(`input[name="/${formId}/danger_signs/${dangerSign}"][value="${value}"]`)).click();
  }
};

module.exports = {
  selectPatient,
  selectVisitedHealthFacility,
  selectDangerSigns,
};
