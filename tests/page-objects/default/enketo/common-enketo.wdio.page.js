const currentSection = () => $('section[class*="current"]');

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

const spanElement =  (text) => currentSection().$(`span*=${text}`);

const validateSummaryReport = async (textArray) => {
  for (const text of textArray) {
    expect(await (await spanElement(text)).isDisplayed()).to.be.true;
  }
};

module.exports = {
  selectRadioButton,
  selectCheckBox,
  spanElement,
  validateSummaryReport,
};
