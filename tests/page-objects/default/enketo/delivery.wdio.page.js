const moment = require('moment');

const getField = (type, name, expression = '') => $(`input[type="${type}"][name="/delivery/${name}"]${expression}`);
const getRadioField = (name, value) => getField('radio', name, `[value="${value}"]`);

const deliveryConditionWomanOutcomeField = (value) => getRadioField('condition/woman_outcome', value);
const deliveryPostnatalDangerFeverField = (value) => getRadioField('pnc_danger_sign_check/fever', value);
const deliveryPostnatalDangerSevereHeadacheField = (value) => {
  return getRadioField('pnc_danger_sign_check/severe_headache', value);
};
const deliveryPostnatalDangerVaginalBleedingField = (value) => {
  return getRadioField('pnc_danger_sign_check/vaginal_bleeding', value);
};
const deliveryPostnatalDangerVaginalDischargeField = (value) => {
  return getRadioField('pnc_danger_sign_check/vaginal_discharge', value);
};
const deliveryPostnatalDangerConvulsionField = (value) => getRadioField('pnc_danger_sign_check/convulsion', value);
const deliveryOutcomeBabiesDeliveredField = (value) => getRadioField('delivery_outcome/babies_delivered', value);
const deliveryOutcomeBabiesAliveField = (value) => getRadioField('delivery_outcome/babies_alive', value);
const dateOfDeliveryField = () => {
  return $('form > section.or-group.or-branch.or-appearance-field-list.current > label:nth-child(6) > div > input');
};
const deliveryPlaceField = (value) => getRadioField('delivery_outcome/delivery_place', value);
const deliveryModeField = (value) => getRadioField('delivery_outcome/delivery_mode', value);

const BABY_DETAILS_NAME = 'babys_condition/baby_repeat/baby_details/';
const getBabyDetailsField = (name, value) => {
  return $(`input[type="radio"][data-name="/delivery/${BABY_DETAILS_NAME}${name}"][value="${value}"]`);
};
const babyConditionField = (value) => getBabyDetailsField(`baby_condition`, value);
const babyNameField = () => getField('text', `${BABY_DETAILS_NAME}baby_name`);
const babySexField = (value) => getBabyDetailsField(`baby_sex`, value);
const babyBirthWeightKnowField = (value) => getBabyDetailsField(`birth_weight_know`, value);
const babyBirthLengthKnowField = (value) => getBabyDetailsField(`birth_length_know`, value);
const babyVaccinesReveivedField = (value) => getBabyDetailsField(`vaccines_received`, value);
const babyBreastfeedingField = (value) => getBabyDetailsField(`breastfeeding`, value);
const babyBreastfeedingWithin1HourField = (value) => getBabyDetailsField(`breastfed_within_1_hour`, value);
const babyInfectedUmbilicalCordField = (value) => getBabyDetailsField(`infected_umbilical_cord`, value);
const babyConvulsionField = (value) => getBabyDetailsField(`convulsion`, value);
const babyDifficultyFeedingField = (value) => getBabyDetailsField(`difficulty_feeding`, value);
const babyVomitField = (value) => getBabyDetailsField(`vomit`, value);
const babyDrowsyField = (value) => getBabyDetailsField(`drowsy`, value);
const babyStiffField = (value) => getBabyDetailsField(`stiff`, value);
const babyYellowSkinField = (value) => getBabyDetailsField(`yellow_skin`, value);
const babyFeverField = (value) => getBabyDetailsField(`fever`, value);
const babyBlueSkinField = (value) => getBabyDetailsField(`blue_skin`, value);
const deliveryPncVisitsField = (value) => getField('checkbox', 'pnc_visits/pnc_visits_attended', `[value="${value}"]`);

const SUMMARY_SECTION = 'section[name="/delivery/summary"]';
const getSummaryField = (name) => $(`${SUMMARY_SECTION} span[data-value=" /delivery/${name} "]`);
const getSummaryLabel = (name) => $(`${SUMMARY_SECTION} span[data-itext-id="/delivery/summary/${name}:label"]`);
const sumPatientName = () => getSummaryField('patient_name');
const sumPatientAge = () => getSummaryField('patient_age_in_years');
const sumWomanCondition = () => getSummaryLabel('r_condition_well');
const sumDeliveryDate = () => getSummaryField('delivery_outcome/delivery_date');
const sumDeliveryPlace = () => getSummaryField('summary/custom_translations/delivery_place_label');
const sumDeliveredBabies = () => getSummaryField('delivery_outcome/babies_delivered_num');
const sumDeceasedBabies = () => getSummaryField('delivery_outcome/babies_deceased_num');
const sumPncVisits = () => getSummaryLabel('r_pnc_visit_none');

const womanDeathDate = () => $('section[name="/delivery/death_info_woman"] .widget.date .input-small');
const womanDeathPlace = (value) => {
  return $(`input[data-name="/delivery/death_info_woman/woman_death_place"][value="${value}"]`);
};
const womanDeliveredBabies = (value) => {
  return $(`input[data-name="/delivery/death_info_woman/woman_death_birth"][value="${value}"]`);
};
const womanDeathNote = () => $('input[name="/delivery/death_info_woman/woman_death_add_notes"]');

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

const fillWomanDeathInformation = async ({
  date: dateValue = moment().format('YYYY-MM-DD'),
  place: placeValue = 'health_facility',
  deliveredBabies: deliveredBabiesValue = 'no',
  notes: notesValue = 'Test notes - Mother\'s death '
} = {}) => {
  await browser.keys('Escape'); // close the datepicker because it hides fields below
  await womanDeathPlace(placeValue).click();
  await womanDeliveredBabies(deliveredBabiesValue).click();
  await womanDeathNote().setValue(notesValue);
  await womanDeathDate().setValue(dateValue);
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
  fillWomanDeathInformation,
};
