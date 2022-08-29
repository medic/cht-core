const deliveryConditionWomanOutcomeField = (value) =>
  $(`input[type="radio"][name="/delivery/condition/woman_outcome"][value="${value}"]`);
const deliveryPosnatalDangerFeverField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/fever"][value="${value}"]`);
const deliveryPosnatalDangerSevereFeverField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/severe_headache"][value="${value}"]`);
const deliveryPosnatalDangerVaginalBleedingField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/vaginal_bleeding"][value="${value}"]`);
const deliveryPosnatalDangerVaginalDischargeField = (value) =>
  $(`input[type="radio"][name="/delivery/pnc_danger_sign_check/vaginal_discharge"][value="${value}"]`);
const deliveryPosnatalDangerConvulsionField = (value) =>
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
const babysNameField = () =>
  $(`input[type="text"][name="/delivery/babys_condition/baby_repeat/baby_details/baby_name"]`);
const babysSexField = (value) =>
  $(`input[type="radio"][data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_sex"][value="${value}"]`);
const babysBirthWeightKnowField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know"][value="${value}"]`);
const babysBirthLengthKnowField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know"][value="${value}"]`);
const babysVaccinesReveivedField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/vaccines_received"][value="${value}"]`);
const babyBreatfeedingField = (value) =>
  $(`input[type="radio"]` +
    `[data-name="/delivery/babys_condition/baby_repeat/baby_details/breatfeeding"][value="${value}"]`);
const babyBreatfeedingWithin1HourField = (value) =>
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
const submitButton = () => $('#contact-report .form-footer .btn.submit.btn-primary');

const selectDeliveryConditionWomanOutcome = async (value) => {
  return (await deliveryConditionWomanOutcomeField(value)).click();
};

const selectDeliveryPosnatalDangerSignsFever = async (value) => {
  return (await deliveryPosnatalDangerFeverField(value)).click();
};

const selectDeliveryPosnatalDangerSevereFever = async (value) => {
  return (await deliveryPosnatalDangerSevereFeverField(value)).click();
};

const selectDeliveryPosnatalDangerVaginalBleeding = async (value) => {
  return (await deliveryPosnatalDangerVaginalBleedingField(value)).click();
};

const selectDeliveryPosnatalDangerVaginalDischarge = async (value) => {
  return (await deliveryPosnatalDangerVaginalDischargeField(value)).click();
};

const selectDeliveryPosnatalDangerConvulsion = async (value) => {
  return (await deliveryPosnatalDangerConvulsionField(value)).click();
};

const selectDeliveryOutcomeBabiesDelivered = async (value) => {
  return (await deliveryOutcomeBabiesDeliveredField(value)).click();
};

const selectDeliveryOutcomeBabiesAlive = async (value) => {
  return (await deliveryOutcomeBabiesAliveField(value)).click();
};

const setDeliveryOutcomeDateOfDelivery = async (value) => {
  return (await dateOfDeliveryField()).addValue(value);
};

const selectDeliveryOutcomeDeliveryPlace = async (value) => {
  return (await deliveryPlaceField(value)).click();
};

const selectDeliveryOutcomeDeliveryMode = async (value) => {
  await (await deliveryModeField(value)).waitForDisplayed();
  return (await deliveryModeField(value)).click();
};

const selectDeliveryBabysCondition = async (value) => {
  return (await babyConditionField(value)).click();
};

const setDeliveryBabysName = async (value) => {
  return (await babysNameField(value)).addValue(value);
};

const selectDeliveryBabysSex = async (value) => {
  return (await babysSexField(value)).click();
};

const selectDeliveryBabysBirthWeightKnow = async (value) => {
  return (await babysBirthWeightKnowField(value)).click();
};

const selectDeliveryBabysBirthLengthKnow = async (value) => {
  return (await babysBirthLengthKnowField(value)).click();
};

const selectDeliveryBabysVaccinesReveived = async (value) => {
  return (await babysVaccinesReveivedField(value)).click();
};

const selectDeliveryBabyBreatfeeding = async (value) => {
  return (await babyBreatfeedingField(value)).click();
};

const selectDeliveryBabyBreatfeedingWithin1Hour = async (value) => {
  return (await babyBreatfeedingWithin1HourField(value)).click();
};

const selectDeliveryBabyInfectedUmbilicalCord = async (value) => {
  return (await babyInfectedUmbilicalCordField(value)).click();
};

const selectDeliveryBabyConvulsion = async (value) => {
  return (await babyConvulsionField(value)).click();
};

const selectDeliveryBabyDifficultyFeeding = async (value) => {
  return (await babyDifficultyFeedingField(value)).click();
};

const selectDeliveryBabyVomit = async (value) => {
  return (await babyVomitField(value)).click();
};

const selectDeliveryBabyDrowsy = async (value) => {
  return (await babyDrowsyField(value)).click();
};

const selectDeliveryBabyStiff = async (value) => {
  return (await babyStiffField(value)).click();
};

const selectDeliveryBabyYellowSkin = async (value) => {
  return (await babyYellowSkinField(value)).click();
};

const selectDeliveryBabyFever = async (value) => {
  return (await babyFeverField(value)).click();
};

const selectDeliveryBabyBlueSkin = async (value) => {
  return (await babyBlueSkinField(value)).click();
};

const selectDeliveryPncVisits = async (value) => {
  return (await deliveryPncVisitsField(value)).click();
};

const submitForm = async () => {
  await (await submitButton()).click();
};

module.exports = {
  selectDeliveryConditionWomanOutcome,
  selectDeliveryPosnatalDangerSignsFever,
  selectDeliveryPosnatalDangerSevereFever,
  selectDeliveryPosnatalDangerVaginalBleeding,
  selectDeliveryPosnatalDangerVaginalDischarge,
  selectDeliveryPosnatalDangerConvulsion,
  selectDeliveryOutcomeBabiesDelivered,
  selectDeliveryOutcomeBabiesAlive,
  selectDeliveryOutcomeDeliveryPlace,
  setDeliveryOutcomeDateOfDelivery,
  selectDeliveryOutcomeDeliveryMode,
  selectDeliveryBabysCondition,
  setDeliveryBabysName,
  selectDeliveryBabysSex,
  selectDeliveryBabysBirthWeightKnow,
  selectDeliveryBabysBirthLengthKnow,
  selectDeliveryBabysVaccinesReveived,
  selectDeliveryBabyBreatfeeding,
  selectDeliveryBabyBreatfeedingWithin1Hour,
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
  submitForm
};
