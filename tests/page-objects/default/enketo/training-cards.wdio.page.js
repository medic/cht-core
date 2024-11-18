const genericFormPage = require('./generic-form.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const commonElements = require('@page-objects/default/common/common.wdio.page');

const trainingCardsForm = () => $('#training-cards-form');
const cardText = (context, field) => $(`.question-label[lang="en"][data-itext-id="/${context}/${field}`);
const quitTrainingBtn = () => $('.item-content button[test-id="quit-training"]');

const TRAINING_LIST_ID = '#trainings-list';
const ALL_TRAININGS = `${TRAINING_LIST_ID} li.content-row`;
const leftPanelSelectors = {
  allTrainings: () => $$(ALL_TRAININGS),
  trainingRowsText: () => $$(`${ALL_TRAININGS} .heading h4 span`),
  trainingByUUID: (uuid) => $(`${TRAINING_LIST_ID} li.content-row[data-record-id="${uuid}"]`),
};

const waitForTrainingCards = async () => {
  await (await trainingCardsForm()).waitForDisplayed();
};

const checkTrainingCardIsNotDisplayed = async () => {
  await (await trainingCardsForm()).waitForDisplayed({ reverse: true });
};

const getTrainingTitle = async () => {
  const title = await $('#form-title');
  await title.waitForDisplayed();
  return title.getText();
};

const getCardContent = async (context, field) => {
  return await (await cardText(context, field)).getText();
};

const getNextCardContent = async (context, field) => {
  await genericFormPage.nextPage();
  return await getCardContent(context, field);
};

const quitTraining = async () => {
  await genericFormPage.cancelForm();
  return await modalPage.getModalDetails();
};

const confirmQuitTraining = async () => {
  await (await quitTrainingBtn()).waitForClickable();
  await (await quitTrainingBtn()).click();
  await modalPage.checkModalHasClosed();
};

const submitTraining = async (checkModal = true) => {
  await genericFormPage.submitForm();
  if (checkModal) {
    await modalPage.checkModalHasClosed();
  }
};

const openTrainingMaterial = async (formID) => {
  await (await leftPanelSelectors.trainingByUUID(formID)).waitForClickable();
  await (await leftPanelSelectors.trainingByUUID(formID)).click();
};

const getAllTrainingsText = async () => {
  await (await leftPanelSelectors.allTrainings()[0]).waitForDisplayed();
  return commonElements.getTextForElements(leftPanelSelectors.trainingRowsText);
};

const isTrainingComplete = async (formId) => {
  return (await $(`[data-record-id="${formId}"] .mat-icon-check`)).isExisting();
};

module.exports = {
  checkTrainingCardIsNotDisplayed,
  confirmQuitTraining,
  getAllTrainingsText,
  getCardContent,
  getNextCardContent,
  getTrainingTitle,
  isTrainingComplete,
  openTrainingMaterial,
  quitTraining,
  submitTraining,
  waitForTrainingCards,
};
