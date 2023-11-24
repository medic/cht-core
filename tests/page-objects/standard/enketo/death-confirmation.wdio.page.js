const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const confirmDeath = (value) => $(`input[name="/death_confirmation/death_report/death"][value="${value}"]`);
const additionalNotes = () => $('input[name="/death_confirmation/death_report/notes"]');
const deathDate = () => $('section[name="/death_confirmation/death_report"] input.ignore.input-small');
const deathPlace = (value) => $(`input[name="/death_confirmation/death_report/place"][value="${value}"]`);

const getFormInformation = async () => {
  const deathConfirmationNote = 'span[data-itext-id="/death_confirmation/death_report/n_2:label"]' +
    enketoCommonPage.ACTIVE;
  const childName = 'span[data-value=" /death_confirmation/child_name "]';
  const chwName = 'span[data-value=" /death_confirmation/chw_name "]';

  return {
    submittedReportChildName: await $('span[data-itext-id="/death_confirmation/death_report/n_1:label"]' +
    enketoCommonPage.ACTIVE)
      .$(childName)
      .getText(),
    deathConfirmationNoteChildName: await $(deathConfirmationNote).$(childName).getText(),
    deathConfirmationNoteChwName: await $(deathConfirmationNote).$(chwName).getText(),
    deathConfirmationNoteChwPhone: await $(deathConfirmationNote)
      .$('span[data-value=" /death_confirmation/chw_phone "]')
      .getText(),
  };
};

const selectConfirmDeathValue = async (value = 'yes') => {
  const isDeath = await confirmDeath(value);
  await isDeath.waitForClickable();
  await isDeath.click();
};

const setDeathDate = async (value) => {
  const date = await deathDate();
  await date.waitForDisplayed();
  await date.setValue(value);
};

const selectDeathPlace = async (value = 'home') => {
  const place = await deathPlace(value);
  await place.waitForClickable();
  await place.click();
};

const setAdditionalNotes = async (value = 'Test note') => {
  const note = await additionalNotes();
  await note.waitForDisplayed();
  await note.setValue(value);
};

module.exports = {
  getFormInformation,
  selectConfirmDeathValue,
  setDeathDate,
  selectDeathPlace,
  setAdditionalNotes,
};
