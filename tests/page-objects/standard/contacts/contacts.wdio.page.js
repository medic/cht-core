const contactPageDefault = require('../../contacts/contacts.wdio.page');

const HEALTH_PROGRAMS = { ANC: 'anc', PNC: 'pnc', IMM: 'imm', GPM: 'gpm'};
const healthProgram = (program) => $(`input[name="/data/health_center/use_cases"][value="${program}"]`);
const vaccines = () => $$('input[name="/data/health_center/vaccines"]');
const IMM_CARD_VACCINES_SELECTOR =
  'div[test-id="contact.profile.immunizations"] div[test-id*="contact.profile.imm"] .card-field-value';
const immCardVaccineValue = () => $(IMM_CARD_VACCINES_SELECTOR);
const immCardVaccinesValues = () => $$(IMM_CARD_VACCINES_SELECTOR);

const addPlace = async (type, placeName, contactName) => {
  const dashedType = type.replace('_', '-');
  await (await contactPageDefault.actionResourceIcon(dashedType)).waitForDisplayed();
  await (await contactPageDefault.actionResourceIcon(dashedType)).click();

  await (await contactPageDefault.newPrimaryContactButton()).waitForDisplayed();
  await (await contactPageDefault.newPrimaryContactButton()).click();
  await (await contactPageDefault.newPrimaryContactName()).addValue(contactName);
  await contactPageDefault.genericForm.nextPage();
  await (await contactPageDefault.writeNamePlace(type)).click();
  await (await contactPageDefault.newPlaceName()).addValue(placeName);
  await (await contactPageDefault.externalIdField(type)).addValue('1234457');
  await (await contactPageDefault.notes(type)).addValue(`Some ${type} notes`);
  await (await contactPageDefault.genericForm.submitButton()).click();
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
  await (await contactPageDefault.editContactButton()).waitForDisplayed();
  await (await contactPageDefault.editContactButton()).click();
  await healthProgram(program).click();
  if (program === HEALTH_PROGRAMS.IMM) {
    await addAllVaccines();
  }
  await contactPageDefault.genericForm.submitButton().click();
};

const getImmCardVaccinesValues = async () => {
  await (await immCardVaccineValue()).waitForDisplayed();
  return Promise.all((await immCardVaccinesValues()).map(value => value.getText()));
};

module.exports = {
  contactPageDefault,
  addPlace,
  addHealthPrograms,
  getImmCardVaccinesValues,  
};
