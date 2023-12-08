const contactPageDefault = require('@page-objects/default/contacts/contacts.wdio.page');
const commonPageDefault = require('@page-objects//default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

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
const ancVisitsCompleted = () => {
  return $(`${PAST_PREG_CARD_SELECTOR} div[test-id="contact.profile.anc_visit"] p.card-field-value`);
};
const contactPhone = () => $('#contact_summary .cell.phone > div > p');

const addPlace = async (type, placeName, contactName, rightSideAction=true) => {
  if (rightSideAction) {
    await commonPageDefault.clickFastActionFAB({ actionId: type });
  } else {
    await commonPageDefault.clickFastActionFlat({ waitForList: false });
  }
  await (await contactPageDefault.newPrimaryContactButton()).waitForDisplayed();
  await (await contactPageDefault.newPrimaryContactButton()).click();
  await (await contactPageDefault.newPrimaryContactName()).setValue(contactName);
  await contactPageDefault.genericForm.nextPage();
  await (await contactPageDefault.writeNamePlace(type)).click();
  await (await contactPageDefault.customPlaceNameField()).setValue(placeName);
  await (await contactPageDefault.externalIdField(type)).setValue('1234457');
  await (await contactPageDefault.notes(type)).setValue(`Some ${type} notes`);
  await (await contactPageDefault.genericForm.submitButton()).click();
  const dashedType = type.replace('_', '-');
  await (await contactPageDefault.contactCardIcon(dashedType)).waitForDisplayed();
  await (await contactPageDefault.contactCard()).waitForDisplayed();
};


const addHealthPrograms = async (program, vaccines = []) => {
  await commonPageDefault.openMoreOptionsMenu();
  await (await contactPageDefault.editContactButton()).waitForClickable();
  await (await contactPageDefault.editContactButton()).click();
  await commonEnketoPage.selectCheckBox('Health programs', program);
  if (program === 'Immunizations') {
    for (const vaccine of vaccines) {
      await commonEnketoPage.selectCheckBox('Select vaccines', vaccine);
    }
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

const getCurrentPlaceEditFormValues = async (type) => {
  return {
    name: await contactPageDefault.nameField(type).getValue(),
    externalId: await contactPageDefault.externalIdField(type).getValue(),
    notes: await contactPageDefault.notes(type).getValue(),
  };
};

const getPhone = async () => {
  await contactPhone().waitForDisplayed();
  return (await contactPhone()).getText();
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
  getCurrentPlaceEditFormValues,
  getPhone,
};
