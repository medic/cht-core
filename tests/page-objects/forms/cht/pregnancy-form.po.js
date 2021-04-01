const helper = require('../../../helper');
const genericForm = require('../generic-form.po');
const inputBase = 'input[name="/pregnancy/';
const registerName = `${inputBase}gestational_age/register_method/lmp_method"]`;
const lmp = element(by.css(`${registerName}[value=method_lmp]`));
const weeksOrMonths = element(by.css(`${registerName}[value=method_approx]`));

const lmpApproxName = `${inputBase}gestational_age/method_approx/lmp_approx"]`;
const weeks = element(by.css(`${lmpApproxName}[value=approx_weeks]`));
const numberOfWeeks = element(by.css(`${inputBase}gestational_age/method_approx/lmp_approx_weeks"]`));


const numberOfVisits = element(by.css(`${inputBase}anc_visits_hf/anc_visits_hf_past/visited_hf_count"]`));

const scheduledVisitsName = `${inputBase}anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"]`;
const iDontKnow = element(by.css(`${scheduledVisitsName}[value=no]`));

const firstPregnancyName = `${inputBase}risk_factors/risk_factors_history/first_pregnancy"]`;
const noFirst = element(by.css(`${firstPregnancyName}[value=no]`));
const prevMiscarriageName = `${inputBase}risk_factors/risk_factors_history/previous_miscarriage"]`;
const noPrevMiscarriage = element(by.css(`${prevMiscarriageName}[value=no]`));

const secondaryConditionName = `${inputBase}risk_factors/risk_factors_present/secondary_condition"]`;
const noneOfTheAboveConditions =  element(by.css(`${secondaryConditionName}[value=none]`));
const additionalRiskName = `${inputBase}risk_factors/risk_factors_present/additional_risk_check"]`;
const noAdditionalRisk =  element(by.css(`${additionalRiskName}[value=no]`));

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

<<<<<<< HEAD
const deworming = `${inputBase}safe_pregnancy_practices/deworming/deworming_med"]`;
const yesDewormed = element(by.css(`${deworming}[value=yes]`));
=======
>>>>>>> added a cht suite for cht-release tests, added check for suite to not overwrite config if we want default, added pregnancy flow tests including filling form
const hivTestName = `${inputBase}safe_pregnancy_practices/hiv_status/hiv_tested"]`;
const yesHIVTest = element(by.css(`${hivTestName}[value=yes]`));

module.exports = {
  lmp,
  weeksOrMonths,
  fillPregnancyForm: async () => {
    await helper.waitUntilReadyNative(genericForm.formTitle);
    await helper.clickElementNative(weeksOrMonths);
    await genericForm.nextPageNative();
    await helper.clickElementNative(weeks);
<<<<<<< HEAD
    await numberOfWeeks.sendKeys('34');
=======
    await numberOfWeeks.sendKeys('11');
>>>>>>> added a cht suite for cht-release tests, added check for suite to not overwrite config if we want default, added pregnancy flow tests including filling form
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await numberOfVisits.sendKeys('0');
    await genericForm.nextPageNative();
    await helper.clickElementNative(iDontKnow);
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await helper.clickElementNative(noFirst);
    await helper.clickElementNative(noPrevMiscarriage);
    await genericForm.nextPageNative();
    await helper.clickElementNative(noneOfTheAboveConditions);
    await helper.clickElementNative(noAdditionalRisk);
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
    await genericForm.nextPageNative();
<<<<<<< HEAD
    await helper.clickElementNative(yesDewormed);
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
=======
>>>>>>> added a cht suite for cht-release tests, added check for suite to not overwrite config if we want default, added pregnancy flow tests including filling form
    await helper.clickElementNative(yesHIVTest);
    await genericForm.nextPageNative();
    await genericForm.submitNative();
  }
};
