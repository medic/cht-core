const contactPageDefault = require('../../default/contacts/contacts.wdio.page');
const commonPageDefault = require('../../default/common/common.wdio.page');

const HEALTH_PROGRAMS = { ANC: 'anc', PNC: 'pnc', IMM: 'imm', GPM: 'gpm'};
const healthProgram = (program) => $(`input[name="/data/health_center/use_cases"][value="${program}"]`);
const vaccines = () => $$('input[name="/data/health_center/vaccines"]');

const IMM_CARD_VACCINES_SELECTOR =
  'div[test-id="contact.profile.immunizations"] div[test-id*="contact.profile.imm"] .card-field-value';
const immCardVaccineValue = () => $(IMM_CARD_VACCINES_SELECTOR);
const immCardVaccinesValues = () => $$(IMM_CARD_VACCINES_SELECTOR);

const PREG_CARD_SELECTOR = 'div[test-id="contact.profile.pregnancy"]';
const pregnancyCard = () => $(PREG_CARD_SELECTOR);
const pregnancyRisk = () => $(`${PREG_CARD_SELECTOR} div[test-id="contact.profile.risk.title"] p.card-field-value`);
const pregnancyVisits = () => $(`${PREG_CARD_SELECTOR} div[test-id="contact.profile.visit"] p.card-field-value`);

const PAST_PREG_CARD_SELECTOR = 'div[test-id="contact.profile.past_pregnancies"]';
const pastPregnancyCard = () => $(PAST_PREG_CARD_SELECTOR);
const deliveryCode = () => $(`${PAST_PREG_CARD_SELECTOR} div[test-id*="contact.profile.delivery_code"] label`);
const ancVisitsCompleted = () => $(`${PAST_PREG_CARD_SELECTOR} ` +
  `div[test-id="contact.profile.anc_visit"] p.card-field-value`);

const addPlace = async (type, placeName, contactName, rightSideAction=true) => {
  if (rightSideAction) {
    await commonPageDefault.clickFastActionFAB({ actionId: type });
  } else {
    await commonPageDefault.clickFastActionFlat({ waitForList: false });
  }
  await (await contactPageDefault.newPrimaryContactButton()).waitForDisplayed();
  await (await contactPageDefault.newPrimaryContactButton()).click();
  await (await contactPageDefault.newPrimaryContactName()).addValue(contactName);
  await contactPageDefault.genericForm.nextPage();
  await (await contactPageDefault.writeNamePlace(type)).click();
  await (await contactPageDefault.newPlaceName()).addValue(placeName);
  await (await contactPageDefault.externalIdField(type)).addValue('1234457');
  await (await contactPageDefault.notes(type)).addValue(`Some ${type} notes`);
  await (await contactPageDefault.genericForm.submitButton()).click();
  const dashedType = type.replace('_', '-');
  await (await contactPageDefault.contactCardIcon(dashedType)).waitForDisplayed();
  await (await contactPageDefault.contactCard()).waitForDisplayed();
};

const addAllVaccines = async () => {
  const allVaccines = await vaccines();
  for (const vaccine of allVaccines) {
    await vaccine.waitForClickable();
    await vaccine.click();
  }
};

/**
 * Add health programs to a health facility, standard config
 *
 * @param {string} program - Refers to the different Health Programs
 *                            "anc" for Antenatal care
 *                            "pnc" for Postnatal care
 *                            "imm" for Immunizations and "gpm" for Growth monitoring (nutrition)
 */
const addHealthPrograms = async (program = HEALTH_PROGRAMS.ANC) => {
  await commonPageDefault.openMoreOptionsMenu();
  await (await contactPageDefault.editContactButton()).waitForClickable();
  await (await contactPageDefault.editContactButton()).click();
  await (await healthProgram(program)).waitForDisplayed();
  await (await healthProgram(program)).click();
  if (program === HEALTH_PROGRAMS.IMM) {
    await addAllVaccines();
  }
  await contactPageDefault.genericForm.submitButton().click();
};

const getImmCardVaccinesValues = async () => {
  await (await immCardVaccineValue()).waitForDisplayed();
  return await immCardVaccinesValues().map(value => value.getText());
};

const getPregnancyCardRisk = async () => {
  await (await pregnancyCard()).waitForDisplayed();
  return (await pregnancyRisk()).getText();
};

const getPregnancyCardVisits = async () => {
  await (await pregnancyCard()).waitForDisplayed();
  return (await pregnancyVisits()).getText();
};

const getDeliveryCode = async () => {
  await (await pastPregnancyCard()).waitForDisplayed();
  return (await deliveryCode()).getText();
};

const getAncVisits = async () => {
  await (await pastPregnancyCard()).waitForDisplayed();
  return (await ancVisitsCompleted()).getText();
};

module.exports = {
  contactPageDefault,
  addPlace,
  addHealthPrograms,
  getImmCardVaccinesValues,
  pregnancyCard,
  getPregnancyCardRisk,
  getPregnancyCardVisits,
  pastPregnancyCard,
  getDeliveryCode,
  getAncVisits,
};
