const genericForm = require('./generic-form.wdio.page');
const dateOfDeliveryField = () => $('[placeholder="yyyy-mm-dd"]');
const rightAddPerson = (create_key) => $(`span[test-id="rhs_add_contact"] p[test-key="${create_key}"]`);

const selectPatient = (patientName) => {
  return genericForm.selectContact('/delivery/inputs/contact', patientName);
};

const selectDeliveryConditionWomanOutcome = async (value) => {
  return (await $('input[type="radio"][name="/delivery/condition/woman_outcome"][value="' + value + '"]')).click();
};

const selectDeliveryPosnatalDangerSignsFever = async (value) => {
  return (await $('input[type="radio"][name="/delivery/pnc_danger_sign_check/fever"][value="' + value + '"]')).click();
};

const selectDeliveryPosnatalDangerSevereFever = async (value) => {
  return (await $('input[type="radio"][name="/delivery/pnc_danger_sign_check/severe_headache"][value="' + value + '"]')).click();
};

const selectDeliveryPosnatalDangerVaginalBleeding = async (value) => {
  return (await $('input[type="radio"][name="/delivery/pnc_danger_sign_check/vaginal_bleeding"][value="' + value + '"]')).click();
};

const selectDeliveryPosnatalDangerVaginalDischarge = async (value) => {
  return (await $('input[type="radio"][name="/delivery/pnc_danger_sign_check/vaginal_discharge"][value="' + value + '"]')).click();
};

const selectDeliveryPosnatalDangerConvulsion = async (value) => {
  return (await $('input[type="radio"][name="/delivery/pnc_danger_sign_check/convulsion"][value="' + value + '"]')).click();
};

const selectDeliveryOutcomeBabiesDelivered = async (value) => {
  return (await $('input[type="radio"][name="/delivery/delivery_outcome/babies_delivered"][value="' + value + '"]')).click();
};

const selectDeliveryOutcomeBabiesAlive = async (value) => {
  return (await $('input[type="radio"][name="/delivery/delivery_outcome/babies_alive"][value="' + value + '"]')).click();
};

const selectDeliveryOutcomeDateOfDelivery = async (value) => {
  return (await dateOfDeliveryField()).addValue(value);
};

const selectDeliveryOutcomeDeliveryPlace = async (value) => {
  return (await $('input[type="radio"][name="/delivery/delivery_outcome/delivery_place"][value="' + value + '"]')).click();
};

const selectDeliveryOutcomeDeliveryMode = async (value) => {
  return (await $('input[type="radio"][name="/delivery/delivery_outcome/delivery_mode"][value="' + value + '"]')).click();
};

module.exports = {
  selectPatient,
  selectDeliveryConditionWomanOutcome,
  selectDeliveryPosnatalDangerSignsFever,
  selectDeliveryPosnatalDangerSevereFever,
  selectDeliveryPosnatalDangerVaginalBleeding,
  selectDeliveryPosnatalDangerVaginalDischarge,
  selectDeliveryPosnatalDangerConvulsion,
  selectDeliveryOutcomeBabiesDelivered,
  selectDeliveryOutcomeBabiesAlive,
  selectDeliveryOutcomeDeliveryPlace,
  selectDeliveryOutcomeDateOfDelivery,
  selectDeliveryOutcomeDeliveryMode
};
