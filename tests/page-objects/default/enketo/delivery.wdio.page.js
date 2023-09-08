const deliveryConditionWomanOutcomeField = (value) =>
  $(`input[type="radio"][name="/delivery/condition/woman_outcome"][value="${value}"]`);
const deliveryPostnatalDangerFeverField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/fever"][value="${value}"]`);
const deliveryPostnatalDangerSevereHeadacheField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/severe_headache"][value="${value}"]`);
const deliveryPostnatalDangerVaginalBleedingField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/vaginal_bleeding"][value="${value}"]`);
const deliveryPostnatalDangerVaginalDischargeField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/vaginal_discharge"][value="${value}"]`);
const deliveryPostnatalDangerConvulsionField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/convulsion"][value="${value}"]`);
const deliveryOutcomeBabiesDeliveredField = (value) =>
  $(`input[type="radio"][name="/delivery/delivery_outcome/babies_delivered"][value="${value}"]`);
const deliveryOutcomeBabiesAliveField = (value) =>
  $(`input[type="radio"][name="/delivery/delivery_outcome/babies_alive"][value="${value}"]`);
const dateOfDeliveryField = () =>
  $('form > section.or-group.or-branch.or-appearance-field-list.current > label:nth-child(6) > div > input');
const deliveryPlaceField = (value) =>
  $(`input[type="radio"][name="/delivery/delivery_outcome/delivery_place"][value="${value}"]`);
const deliveryModeField = (value) =>
  $(`input[type="radio"][name="/delivery/delivery_outcome/delivery_mode"][value="${value}"]`);
const babyConditionField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition"][value="${value}"]`);
const babyNameField = () =>
  $(`input[type="text"][name="/delivery/babys_condition/baby_repeat/baby_details/baby_name"]`);
const babySexField = (value) =>
  $(`input[type="radio"][data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex"][value="${value}"]`);
const babyBirthWeightKnowField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know"][value="${value}"]`);
const babyBirthLengthKnowField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know"][value="${value}"]`);
const babyVaccinesReveivedField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received"][value="${value}"]`);
const babyBreastfeedingField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfeeding"][value="${value}"]`);
const babyBreastfeedingWithin1HourField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour"][value="${value}"]`);
const babyInfectedUmbilicalCordField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord"][value="${value}"]`);
const babyConvulsionField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/convulsion"][value="${value}"]`);
const babyDifficultyFeedingField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding"][value="${value}"]`);
const babyVomitField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/vomit"][value="${value}"]`);
const babyDrowsyField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/drowsy"][value="${value}"]`);
const babyStiffField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/stiff"][value="${value}"]`);
const babyYellowSkinField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin"][value="${value}"]`);
const babyFeverField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/fever"][value="${value}"]`);
const babyBlueSkinField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin"][value="${value}"]`);
const deliveryPncVisitsField = (value) =>
  $(`input[type="checkbox"]` +
    `[name="/delivery/pnc_visits/pnc_visits_attended"][value="${value}"]`);

const SUMMARY_SECTION = 'section[name="/delivery/summary"]';
const sumPatientName = () => $(`${SUMMARY_SECTION} span[data-value=" /delivery/patient_name "]`);
const sumPatientAge = () => $(`${SUMMARY_SECTION} span[data-value=" /delivery/patient_age_in_years "]`);
const sumWomanCondition = () => $(`${SUMMARY_SECTION} span[data-itext-id="/delivery/summary/r_condition_well:label"]`);
const sumDeliveryDate = () => $(`${SUMMARY_SECTION} span[data-value=" /delivery/delivery_outcome/delivery_date "]`);
const sumDeliveryPlace = () => $(SUMMARY_SECTION +
  ' span[data-value=" /delivery/summary/custom_translations/delivery_place_label "]');
const sumDeliveredBabies = () => $(SUMMARY_SECTION +
  ' span[data-value=" /delivery/delivery_outcome/babies_delivered_num "]');
const sumDeceasedBabies = () => $(SUMMARY_SECTION +
  ' span[data-value=" /delivery/delivery_outcome/babies_deceased_num "]');
const sumPncVisits = () => $(`${SUMMARY_SECTION} span[data-itext-id="/delivery/summary/r_pnc_visit_none:label"]`);

const selectDeliveryConditionWomanOutcome = async (value) => {
  const womanOutcome = await deliveryConditionWomanOutcomeField(value);
  await womanOutcome.waitForClickable();
  await womanOutcome.click();
};

const selectDeliveryPostnatalDangerSignsFever = async (value) => {
  const fever = await deliveryPostnatalDangerFeverField(value);
  await fever.waitForClickable();
  await fever.click();
};

const selectDeliveryPostnatalDangerSevereHeadache = async (value) => {
  const severeHeadache = await deliveryPostnatalDangerSevereHeadacheField(value);
  await severeHeadache.waitForClickable();
  await severeHeadache.click();
};

const selectDeliveryPostnatalDangerVaginalBleeding = async (value) => {
  const vaginalBleeding = await deliveryPostnatalDangerVaginalBleedingField(value);
  await vaginalBleeding.waitForClickable();
  await vaginalBleeding.click();
};

const selectDeliveryPostnatalDangerVaginalDischarge = async (value) => {
  const vaginalDischarge = await deliveryPostnatalDangerVaginalDischargeField(value);
  await vaginalDischarge.waitForClickable();
  await vaginalDischarge.click();
};

const selectDeliveryPostnatalDangerConvulsion = async (value) => {
  const convulsion = await deliveryPostnatalDangerConvulsionField(value);
  await convulsion.waitForClickable();
  await convulsion.click();
};

const selectDeliveryOutcomeBabiesDelivered = async (value) => {
  const babiesDelivered = await deliveryOutcomeBabiesDeliveredField(value);
  await babiesDelivered.waitForClickable();
  await babiesDelivered.click();
};

const selectDeliveryOutcomeBabiesAlive = async (value) => {
  const babiesAlive = await deliveryOutcomeBabiesAliveField(value);
  await babiesAlive.waitForClickable();
  await babiesAlive.click();
};

const setDeliveryOutcomeDateOfDelivery = async (value) => {
  const dateOfDelivery = await dateOfDeliveryField();
  await dateOfDelivery.waitForDisplayed();
  await dateOfDelivery.setValue(value);
};

const selectDeliveryOutcomeDeliveryPlace = async (value) => {
  const deliveryPlace = await deliveryPlaceField(value);
  await deliveryPlace.waitForClickable();
  await deliveryPlace.click();
};

const selectDeliveryOutcomeDeliveryMode = async (value) => {
  const deliveryMode =  await deliveryModeField(value);
  await deliveryMode.waitForClickable();
  await deliveryMode.click();
};

const selectDeliveryBabyCondition = async (value) => {
  const babyCondition = await babyConditionField(value);
  await babyCondition.waitForClickable();
  await babyCondition.click();
};

const setDeliveryBabyName = async (value) => {
  const babyName = await babyNameField(value);
  await babyName.waitForDisplayed();
  await babyName.setValue(value);
};

const selectDeliveryBabySex = async (value) => {
  const babySex = await babySexField(value);
  await babySex.waitForClickable();
  await babySex.click();
};

const selectDeliveryBabyBirthWeightKnown = async (value) => {
  const birthWeight = await babyBirthWeightKnowField(value);
  await birthWeight.waitForClickable();
  await birthWeight.click();
};

const selectDeliveryBabyBirthLengthKnown = async (value) => {
  const birthLength = await babyBirthLengthKnowField(value);
  await birthLength.waitForClickable();
  await birthLength.click();
};

const selectDeliveryBabyVaccinesReceived = async (value) => {
  const vaccinesReceived = await babyVaccinesReveivedField(value);
  await vaccinesReceived.waitForClickable();
  await vaccinesReceived.click();
};

const selectDeliveryBabyBreastfeeding = async (value) => {
  const babyBreastfeeding = await babyBreastfeedingField(value);
  await babyBreastfeeding.waitForClickable();
  await babyBreastfeeding.click();
};

const selectDeliveryBabyBreastfeedingWithin1Hour = async (value) => {
  const breastfeedingWithin1Hour = await babyBreastfeedingWithin1HourField(value);
  await breastfeedingWithin1Hour.waitForClickable();
  await breastfeedingWithin1Hour.click();
};

const selectDeliveryBabyInfectedUmbilicalCord = async (value) => {
  const infectedUmbilicalCord = await babyInfectedUmbilicalCordField(value);
  await infectedUmbilicalCord.waitForClickable();
  await infectedUmbilicalCord.click();
};

const selectDeliveryBabyConvulsion = async (value) => {
  const convulsion = await babyConvulsionField(value);
  await convulsion.waitForClickable();
  await convulsion.click();
};

const selectDeliveryBabyDifficultyFeeding = async (value) => {
  const difficultyFeeding = await babyDifficultyFeedingField(value);
  await difficultyFeeding.waitForClickable();
  await difficultyFeeding.click();
};

const selectDeliveryBabyVomit = async (value) => {
  const vomit = await babyVomitField(value);
  await vomit.waitForClickable();
  await vomit.click();
};

const selectDeliveryBabyDrowsy = async (value) => {
  const drowsy = await babyDrowsyField(value);
  await drowsy.waitForClickable();
  await drowsy.click();
};

const selectDeliveryBabyStiff = async (value) => {
  const stiff = await babyStiffField(value);
  await stiff.waitForClickable();
  await stiff.click();
};

const selectDeliveryBabyYellowSkin = async (value) => {
  const yellowSkin = await babyYellowSkinField(value);
  await yellowSkin.waitForClickable();
  await yellowSkin.click();
};

const selectDeliveryBabyFever = async (value) => {
  const fever = await babyFeverField(value);
  await fever.waitForClickable();
  await fever.click();
};

const selectDeliveryBabyBlueSkin = async (value) => {
  const blueSkin = await babyBlueSkinField(value);
  await blueSkin.waitForClickable();
  await blueSkin.click();
};

const selectDeliveryPncVisits = async (value) => {
  const pncVisits = await deliveryPncVisitsField(value);
  await pncVisits.waitForClickable();
  await pncVisits.click();
};

const getSummaryInfo = async () => {
  return {
    patientName: await sumPatientName().getText(),
    patientAge: await sumPatientAge().getText(),
    womanCondition: await sumWomanCondition().getText(),
    deliveryDate: await sumDeliveryDate().getText(),
    deliveryPlace: await sumDeliveryPlace().getText(),
    deliveredBabies: await sumDeliveredBabies().getText(),
    deceasedBabies: await sumDeceasedBabies().getText(),
    pncVisits: await sumPncVisits().getText(),
  };
};

module.exports = {
  selectDeliveryConditionWomanOutcome,
  selectDeliveryPostnatalDangerSignsFever,
  selectDeliveryPostnatalDangerSevereHeadache,
  selectDeliveryPostnatalDangerVaginalBleeding,
  selectDeliveryPostnatalDangerVaginalDischarge,
  selectDeliveryPostnatalDangerConvulsion,
  selectDeliveryOutcomeBabiesDelivered,
  selectDeliveryOutcomeBabiesAlive,
  selectDeliveryOutcomeDeliveryPlace,
  setDeliveryOutcomeDateOfDelivery,
  selectDeliveryOutcomeDeliveryMode,
  selectDeliveryBabyCondition,
  setDeliveryBabyName,
  selectDeliveryBabySex,
  selectDeliveryBabyBirthWeightKnown,
  selectDeliveryBabyBirthLengthKnown,
  selectDeliveryBabyVaccinesReceived,
  selectDeliveryBabyBreastfeeding,
  selectDeliveryBabyBreastfeedingWithin1Hour,
  selectDeliveryBabyInfectedUmbilicalCord,
  selectDeliveryBabyConvulsion,
  selectDeliveryBabyDifficultyFeeding,
  selectDeliveryBabyVomit,
  selectDeliveryBabyDrowsy,
  selectDeliveryBabyStiff,
  selectDeliveryBabyYellowSkin,
  selectDeliveryBabyFever,
  selectDeliveryBabyBlueSkin,
  selectDeliveryPncVisits,
  getSummaryInfo,
};
