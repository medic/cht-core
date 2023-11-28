const currentSection =  () => $('section[class*="current"]');

const divContainer = () => $('div.container');

const isElementDisplayed = async (type, text) => {
  const page = await currentSection().isExisting() ? currentSection() : divContainer();
  return await page.$(`${type}*=${text}`).isDisplayed();
};

const selectRadioButton = async (question, label) => {
  const page = await currentSection().isExisting() ? currentSection() : divContainer();
  const radioButton = await page
    .$(`legend*=${question}`)
    .parentElement()
    .$(`label*=${label}`);
  await radioButton.waitForClickable();
  await radioButton.click();
};

const selectCheckBox = async (text) => {
  const page = await currentSection().isExisting() ? currentSection() : divContainer();
  let checkbox = await page;
  if (await checkbox.$('fieldset.or-branch:not(.disabled)').isExisting()){
    checkbox = await checkbox.$('fieldset.or-branch:not(.disabled)');
  }
  checkbox = await checkbox.$(`label*=${text}`);
  await checkbox.waitForClickable();
  await checkbox.click();
};

const setValue = async (typeSelector, question, value) => {
  const page = await currentSection().isExisting() ? currentSection() : divContainer();
  const element = await page
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
  const element = await currentSection().isExisting() ? currentSection() : divContainer();
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
