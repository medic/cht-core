const helper = require('../../../helper');
const genericForm = require('../generic-form.po');
const inputBase = 'input[name="/pregnancy_home_visit/';

const startVisit = `${inputBase}pregnancy_summary/visit_option"]`;
const yesStartVisit = element(by.css(`${startVisit}[value=yes]`));

const ageCorrect = `${inputBase}pregnancy_summary/g_age_correct"]`;
const yesCorrect = element(by.css(`${ageCorrect}[value=yes]`));

const additionalVisits = `${inputBase}anc_visits_hf/anc_visits_hf_past/report_other_visits"]`;
const yesAdditionalVisits = element(by.css(`${additionalVisits}[value=yes]`));


const numberOfAdditionalVisits = element(by.css(`${inputBase}anc_visits_hf/anc_visits_hf_past/visited_hf_count"]`));

const dateIfKnown = `${inputBase}anc_visits_hf/anc_visits_hf_past/visited_date_ask_single"]`;
const dateNotKnown = element(by.css(`${dateIfKnown}[value=no]`));


const newRisks = `${inputBase}anc_visits_hf/risk_factors/new_risks"]`;
const noNewRisk = element(by.css(`${newRisks}[value=none]`));

const additionalRisks = `${inputBase}anc_visits_hf/risk_factors/additional_risk_check"]`;
const noAdditionalRisk = element(by.css(`${additionalRisks}[value=no]`));

const upcomingAppointments = 
  `${inputBase}anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"]`;
const noUpcomingAppointments = element(by.css(`${upcomingAppointments}[value=no]`));

const dangerSignsBase = `${inputBase}danger_signs/`;
const vaginalBleedingName = `${dangerSignsBase}vaginal_bleeding"]`;
const fitsName = `${dangerSignsBase}fits"]`;
const abdominalName = `${dangerSignsBase}severe_abdominal_pain"]`;
const headacheName = `${dangerSignsBase}severe_headache"]`;
const paleName = `${dangerSignsBase}very_pale"]`;
const feverName = `${dangerSignsBase}fever"]`;
const fetalMovementsName = `${dangerSignsBase}reduced_or_no_fetal_movements"]`;
const breakingWaterName = `${dangerSignsBase}breaking_water"]`;
const easilyTiredName = `${dangerSignsBase}easily_tired"]`;
const swellingName = `${dangerSignsBase}face_hand_swelling"]`;
const breathlessnessName = `${dangerSignsBase}breathlessness"]`;
const noVaginalBleedings =  element(by.css(`${vaginalBleedingName}[value=no]`));
const noFits =  element(by.css(`${fitsName}[value=no]`));
const noAbdominalPain =  element(by.css(`${abdominalName}[value=no]`));
const noHeadache =  element(by.css(`${headacheName}[value=no]`));
const noPale =  element(by.css(`${paleName}[value=no]`));
const noFever =  element(by.css(`${feverName}[value=no]`));
const noFetalMovements =  element(by.css(`${fetalMovementsName}[value=no]`));
const noBreakingWater =  element(by.css(`${breakingWaterName}[value=no]`));
const noTired =  element(by.css(`${easilyTiredName}[value=no]`));
const noSwelling =  element(by.css(`${swellingName}[value=no]`));
const noBreathlessness =  element(by.css(`${breathlessnessName}[value=no]`));


const usesLLIN = `${inputBase}safe_pregnancy_practices/malaria/uses_llin"]`;

const yesLLIN = element(by.css(`${usesLLIN}[value=yes]`));

const ironFolateName = `${inputBase}safe_pregnancy_practices/iron_folate/iron_folate_daily"]`;
const yesIronFolate = element(by.css(`${ironFolateName}[value=yes]`));

const deworming = `${inputBase}safe_pregnancy_practices/deworming/deworming_med"]`;
const yesDeworming = element(by.css(`${deworming}[value=yes]`));

const tetanus = `${inputBase}safe_pregnancy_practices/tetanus/tt_imm_received"]`;
const yesTetanus = element(by.css(`${tetanus}[value=yes]`));


module.exports = {
  fillPregnancyForm: async () => {
    await helper.waitUntilReadyNative(genericForm.formTitle);
    await helper.clickElementNative(yesStartVisit);
    await helper.clickElementNative(yesCorrect);
    await genericForm.nextPageNative();
    await helper.clickElementNative(yesAdditionalVisits);
    await numberOfAdditionalVisits.sendKeys('1', protractor.Key.TAB);
    await helper.waitUntilReadyNative(dateNotKnown);
    await helper.clickElementNative(dateNotKnown);
    await helper.clickElementNative(noAdditionalVisits);
    await genericForm.nextPageNative();
    await helper.clickElementNative(noNewRisk);
    await helper.clickElementNative(noAdditionalRisk);
    await genericForm.nextPageNative();
    await helper.clickElementNative(noUpcomingAppointments);
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await helper.clickElementNative(noVaginalBleedings);
    await helper.clickElementNative(noFits);
    await helper.clickElementNative(noAbdominalPain);
    await helper.clickElementNative(noHeadache);
    await helper.clickElementNative(noPale);
    await helper.clickElementNative(noFever);
    await helper.clickElementNative(noFetalMovements);
    await helper.clickElementNative(noBreakingWater);
    await helper.clickElementNative(noTired);
    await helper.clickElementNative(noSwelling);
    await helper.clickElementNative(noBreathlessness);
    await genericForm.nextPageNative();
    await helper.clickElementNative(yesLLIN);
    await genericForm.nextPageNative();
    await helper.clickElementNative(yesIronFolate);
    await genericForm.nextPageNative();
    await helper.clickElementNative(yesDeworming);
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await helper.clickElementNative(yesTetanus);
    await genericForm.nextPageNative();
    await genericForm.submitNative();
  }
};
