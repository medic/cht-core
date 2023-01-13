const FIELD_PATH = '.question-label[lang="en"][data-itext-id="/training_cards_text_only/';
const ENKETO_MODAL = '.enketo-modal';

const trainingCardsForm = () => $(ENKETO_MODAL);
const cardText = (field) => $(FIELD_PATH + field);
const quitTrainingBtn = () => $(`${ENKETO_MODAL} .item-content .btn.btn-danger`);

const waitForTrainingCards = async () => {
  await (await trainingCardsForm()).waitForDisplayed();
};

const getCardContent = async (field) => {
  return await (await cardText(field)).getText();
};

const quitTraining = async () => {
  await (await quitTrainingBtn()).waitForClickable();
  await (await quitTrainingBtn()).click();
};

module.exports = {
  waitForTrainingCards,
  getCardContent,
  quitTraining,
};
