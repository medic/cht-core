const currentSection = () => $('section[class*="current"]');

const spanElement =  (text) => currentSection().$(`span*=${text}`);

const labelElement = (text) => currentSection().$(`label*=${text}`);

const selectRadioButton = async (question, label) => {
  const radioButton = await currentSection()
    .$(`legend*=${question}`)
    .parentElement()
    .$(`label*=${label}`);
  await radioButton.waitForClickable();
  await radioButton.click();
};

const selectCheckBox = async (text) => {
  let checkbox = await currentSection();
  if (await checkbox.$('fieldset.or-branch:not(.disabled)').isExisting()){
    checkbox = await checkbox.$('fieldset.or-branch:not(.disabled)');
  }
  checkbox = await checkbox.$(`label*=${text}`);
  await checkbox.waitForClickable();
  await checkbox.click();
};

const setValue = async (typeSelector, question, value) => {
  const element = await currentSection()
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
  for (const text of textArray) {
    expect(await (await spanElement(text)).isDisplayed()).to.be.true;
  }
};

module.exports = {
  spanElement,
  labelElement,
  selectRadioButton,
  selectCheckBox,
  setInputValue,
  setDateValue,
  setTextareaValue,
  validateSummaryReport,
};
