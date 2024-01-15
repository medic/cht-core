const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const BCG_VACCINE = 'input[name="/immunization_visit/group_bcg/g_bcg"]';
const CHOLERA_VACCINE = 'input[name="/immunization_visit/group_cholera/g_cholera"]';
const HEPATITIS_A_VACCINE = 'input[name="/immunization_visit/group_hep_a/g_hep_a"]';
const HEPATITIS_B_VACCINE = 'input[name="/immunization_visit/group_hep_b/g_hep_b"]';
const HPV_VACCINE = 'input[name="/immunization_visit/group_hpv/g_hpv"]';
const FLU_VACCINE = 'input[name="/immunization_visit/group_flu/g_flu"]';
const JAP_ENCEPHALITIS_VACCINE = 'input[name="/immunization_visit/group_jap_enc/g_jap_enc"]';
const MENINGOCOCCAL_VACCINE = 'input[name="/immunization_visit/group_meningococcal/g_meningococcal"]';
const MMR_VACCINE = 'input[name="/immunization_visit/group_mmr/g_mmr"]';
const MMRV_VACCINE = 'input[name="/immunization_visit/group_mmrv/g_mmrv"]';
const POLIO_VACCINE = 'input[name="/immunization_visit/group_polio/g_polio"]';
const PENTAVALENT_VACCINE = 'input[name="/immunization_visit/group_pentavalent/g_pentavalent"]';
const DPT_BOOSTER_VACCINE = 'input[name="/immunization_visit/group_dpt/g_dpt"]';
const PNEUMOCOCCAL_VACCINE = 'input[name="/immunization_visit/group_pneumococcal/g_pneumococcal"]';
const ROTAVIRUS_VACCINE = 'input[name="/immunization_visit/group_rotavirus/g_rotavirus"]';
const TYPHOID_VACCINE = 'input[name="/immunization_visit/group_typhoid/g_typhoid"]';
const VITAMIN_A_VACCINE = 'input[name="/immunization_visit/group_vitamin_a/g_vitamin_a"]';
const YELLOW_FEVER_VACCINE = 'input[name="/immunization_visit/group_yellow_fever/g_yellow_fever"]';

const pregDetailsLabel = '"/immunization_visit/group_review/r_pregnancy_details:label"';

const notes = () => $(`${enketoCommonPage.smsNote('immunization_visit')}`);
const vaccines = () => $$('input[name="/immunization_visit/group_select_vaccines/g_vaccines"]');
const patientNameSummary = () => {
  const immVisit = enketoCommonPage.patientNameSummary('immunization_visit');
  return $(`span[data-itext-id=${pregDetailsLabel}]${enketoCommonPage.ACTIVE} ${immVisit}`);
};
const patientIdSummary = () => {
  const immVisit = enketoCommonPage.patientIdSummary('immunization_visit', 'review');
  return $(`span[data-itext-id=${pregDetailsLabel}]${enketoCommonPage.ACTIVE} ${immVisit}`);
};
// Excluding the 'last-child' because it represents the follow-up message from the summary page form
const vaccinesAvailableSummary = () => {
  return $$('label.question.readonly.or-branch.non-select.or-appearance-li:not(:last-child)');
};
const vaccinesDisableSummary = () => {
  return $$('label.question.readonly.or-branch.non-select.or-appearance-li.disabled');
};
const followUpSmsNote1 = () => $(enketoCommonPage.followUpSmsNote1('immunization_visit', 'review'));
const followUpSmsNote2 = () => $(enketoCommonPage.followUpSmsNote2('immunization_visit', 'review'));

const selectAppliedVaccines = async (selector, option = 'no') => {
  const vaccinesSelector = await $$(`${selector}[value*="${option}"]`);
  for (const vaccine of vaccinesSelector) {
    await vaccine.click();
  }
  return vaccinesSelector.length;
};

const selectAllVaccines = async () => {
  const cbVaccines = await vaccines();
  for (const vaccine of cbVaccines) {
    await vaccine.click();
  }
};

const addNotes = async (note = 'Test notes') => await (await notes()).setValue(note);

const getSummaryDetails = async () => {
  const vaccinesAvaible = await vaccinesAvailableSummary();
  const vaccinesDisabled = await vaccinesDisableSummary();
  return {
    patientName: await patientNameSummary().getText(),
    patientId: await patientIdSummary().getText(),
    appliedVaccines: vaccinesAvaible.length - vaccinesDisabled.length,
    followUpSmsNote1: await followUpSmsNote1().getText(),
    followUpSmsNote2: await followUpSmsNote2().getText(),
  };
};

module.exports = {
  BCG_VACCINE,
  CHOLERA_VACCINE,
  HEPATITIS_A_VACCINE,
  HEPATITIS_B_VACCINE,
  HPV_VACCINE,
  FLU_VACCINE,
  JAP_ENCEPHALITIS_VACCINE,
  MENINGOCOCCAL_VACCINE,
  MMR_VACCINE,
  MMRV_VACCINE,
  POLIO_VACCINE,
  PENTAVALENT_VACCINE,
  DPT_BOOSTER_VACCINE,
  PNEUMOCOCCAL_VACCINE,
  ROTAVIRUS_VACCINE,
  TYPHOID_VACCINE,
  VITAMIN_A_VACCINE,
  YELLOW_FEVER_VACCINE,
  selectAllVaccines,
  selectAppliedVaccines,
  addNotes,
  getSummaryDetails,
};
