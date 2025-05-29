const { formTitle } = require('@page-objects/default/enketo/generic-form.wdio.page');

const currentSection =  () => $('section[class*="current"]');

const divContainer = () => $('div.container');

const getCurrentPageSection = async () => await currentSection().isExisting() ? currentSection() : divContainer();

const enabledFieldset = (section) => section.$$('fieldset.or-branch:not(.disabled)');

const addRepeatSectionButton = () => $(`button.add-repeat-btn`);

const radioButtonElement = async (question, value) => {
  return (await getCurrentPageSection())
    .$(`legend*=${question}`)
    .parentElement()
    .$(`label*=${value}`);
};

const getCorrectFieldsetSection = async (section) => {
  const countFieldset = await enabledFieldset(section).length;
  if (countFieldset){
    return enabledFieldset(section)[countFieldset-1];
  }
  return section;
};

const isElementDisplayed = async (type, text) => {
  return await (await getCurrentPageSection()).$(`${type}*=${text}`).isDisplayed();
};

const selectRadioButton = async (question, value) => {
  await (await radioButtonElement(question, value)).click();
};

const selectCheckBox = async (question, value) => {
  const page = await getCurrentPageSection();
  const checkbox = await (await getCorrectFieldsetSection(page))
    .$(`legend*=${question}`)
    .nextElement()
    .$(`label*=${value}`);
  await checkbox.click();
};

const setValue = async (typeSelector, question, value) => {
  const element = await (await getCurrentPageSection())
    .$(`label*=${question}`)
    .$(typeSelector);
  await element.waitForDisplayed();
  await element.setValue(value);
};

const setInputValue = async (question, value) => {
  await setValue('input', question, value);
};

const setDateValue = async (question, value) => {
  await setValue('input.ignore.input-small', question, value);
  //To close the date widget
  await formTitle().click();
};

const setTextareaValue = async (question, value) => {
  await setValue('textarea', question, value);
};

const addFileInputValue = async (question, value, { repeatIndex = 0 } = {}) => {
  const element = await (await getCurrentPageSection())
    .$$(`label*=${question}`)[repeatIndex]
    .$('input[type=file]');
  await element.addValue(value);
};

const validateSummaryReport = async (textArray) => {
  const element = await getCurrentPageSection();
  for (const text of textArray) {
    expect(await element.$(`span*=${text}`).isDisplayed()).to.be.true;
  }
};

const getValue = async (typeSelector, question) => {
  return await (await getCurrentPageSection())
    .$(`label*=${question}`)
    .$(typeSelector)
    .getValue();
};

const getInputValue = async (question) => {
  return await getValue('input', question);
};

const getTextareaValue = async (question) => {
  return await getValue('textarea', question);
};

const scrollToQuestion = async (label) => {
  return await (await getCurrentPageSection())
    .$(`label*=${label}`)
    .scrollIntoView(false);
};

const isRequiredMessageDisplayed = async (question) => {
  await formTitle().click();
  const requiredMsg = (await getCurrentPageSection())
    .$(`label*=${question}`)
    .$('.or-required-msg.active');
  return await requiredMsg.isDisplayed();
};

const isConstraintMessageDisplayed = async (question) => {
  await formTitle().click();
  const requiredMsg = (await getCurrentPageSection())
    .$(`label*=${question}`)
    .$('.or-constraint-msg.active');
  return await requiredMsg.isDisplayed();
};

const addRepeatSection = async () => {
  const repeatButton  = await addRepeatSectionButton();
  await repeatButton.click();
};

const drawShapeOnCanvas = async (question) => {
  const canvas = await (await getCurrentPageSection())
    .$(`label*=${question}`)
    .$('canvas');
  await canvas.waitForDisplayed();
  await browser.action('pointer')
    .move({ origin: canvas })
    .down()
    .move({ origin: canvas, x: 50, y: 0 })
    .move({ origin: canvas, x: 50, y: 50 })
    .move({ origin: canvas, x: 0, y: 50 })
    .move({ origin: canvas, x: 0, y: 0 })
    .move({ origin: canvas, x: 50, y: 0 })
    .up()
    .perform();
};

const isRadioButtonSelected = async (question, value) => {
  return await (await radioButtonElement(question, value)).getAttribute('data-checked');
};

module.exports = {
  isElementDisplayed,
  selectRadioButton,
  selectCheckBox,
  setInputValue,
  setDateValue,
  setTextareaValue,
  addFileInputValue,
  validateSummaryReport,
  getInputValue,
  getTextareaValue,
  isRequiredMessageDisplayed,
  isConstraintMessageDisplayed,
  addRepeatSection,
  drawShapeOnCanvas,
  isRadioButtonSelected,
  scrollToQuestion,
};
