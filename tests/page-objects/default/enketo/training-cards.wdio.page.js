const FIELD_PATH = '.question-label[lang="en"][data-itext-id="/training_cards_text_only/';

const trainingCardsForm = () => $('.enketo-modal');
const cardText = (field) => $(FIELD_PATH + field);

const waitForTrainingCards = async () => {
  await (await trainingCardsForm()).waitForDisplayed();
};

const getCardContent = async (field) => {
  return await (await cardText(field)).getText();
};

module.exports = {
  waitForTrainingCards,
  getCardContent,
};
