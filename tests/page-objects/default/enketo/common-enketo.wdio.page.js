const selectRadioButton = async (question, label) => {
  const radioButton = await (await (await (await $(`legend*=${question}`))
    .parentElement())
    .$(`span=${label}`))
    .previousElement();
  await radioButton.waitForClickable();
  await radioButton.click();
};

const selectCheckBox = async (label) => {
  const checkbox = await $(`span=${label}`).previousElement();
  await checkbox.waitForClickable();
  await checkbox.click();
};

module.exports = {
  selectRadioButton,
  selectCheckBox,
};
