const genericFormPage = require('./generic-form.wdio.page');
const modalPage = require('../common/modal.wdio.page');

const ENKETO_MODAL = '.enketo-modal';

const trainingCardsForm = () => $(ENKETO_MODAL);
const cardText = (context, field) => $(`.question-label[lang="en"][data-itext-id="/${context}/${field}`);
const quitTrainingBtn = () => $(`${ENKETO_MODAL} .item-content .btn.btn-danger`);

const waitForTrainingCards = async () => {
  await (await trainingCardsForm()).waitForDisplayed();
};

const checkTrainingCardIsNotDisplayed = async () => {
  await (await trainingCardsForm()).waitForDisplayed({ reverse: true });
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

const submitTraining = async () => {
  await genericFormPage.submitForm();
  await modalPage.checkModalHasClosed();
};

module.exports = {
  checkTrainingCardIsNotDisplayed,
  waitForTrainingCards,
  getCardContent,
  getNextCardContent,
  quitTraining,
  confirmQuitTraining,
  submitTraining,
};
