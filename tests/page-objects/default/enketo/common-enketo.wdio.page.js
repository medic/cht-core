const currentSection =  () => $('section[class*="current"]');

const divContainer = () => $('div.container');

const getCurrentPageSection = async () => await currentSection().isExisting() ? currentSection() : divContainer();

const enabledFieldset = (section) => section.$$('fieldset.or-branch:not(.disabled)');

const getCorrectFieldsetSection = async (section) => {
  if (await enabledFieldset(section).length === 1){
    return enabledFieldset(section)[0];
  }
  return section;
};

const isElementDisplayed = async (type, text) => {
  return await (await getCurrentPageSection()).$(`${type}*=${text}`).isDisplayed();
};

const selectRadioButton = async (question, label) => {
  const radioButton = await (await getCurrentPageSection())
    .$(`legend*=${question}`)
    .parentElement()
    .$(`label*=${label}`);
  await radioButton.waitForClickable();
  await radioButton.click();
};

const selectCheckBox = async (question, text) => {
  const page = await getCurrentPageSection();
  const checkbox = await (await getCorrectFieldsetSection(page))
    .$(`legend*=${question}`)
    .nextElement()
    .$(`label*=${text}`);
  await checkbox.waitForClickable();
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
};

const setTextareaValue = async (question, value) => {
  await setValue('textarea', question, value);
};

const validateSummaryReport = async (textArray) => {
  const element = await getCurrentPageSection();
  for (const text of textArray) {
    expect(await (await element.$(`span*=${text}`)).isDisplayed()).to.be.true;
  }
};

module.exports = {
  isElementDisplayed,
  selectRadioButton,
  selectCheckBox,
  setInputValue,
  setDateValue,
  setTextareaValue,
  validateSummaryReport,
};
