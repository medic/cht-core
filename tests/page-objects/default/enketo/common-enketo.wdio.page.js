const fs = require('fs');
const utils = require('@utils');

const currentSection =  () => $('section[class*="current"]');

const divContainer = () => $('div.container');

const getCurrentPageSection = async () => await currentSection().isExisting() ? currentSection() : divContainer();

const enabledFieldset = (section) => section.$$('fieldset.or-branch:not(.disabled)');

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

const uploadForm = async (formName, saveDoc = true) => {
  const formXML = fs.readFileSync(`${__dirname}/../../../e2e/default/enketo/forms/${formName}.xml`, 'utf8');
  const formDoc = {
    _id: `form:${formName}`,
    internalId: formName,
    title: formName,
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(formXML).toString('base64'),
      },
    },
  };
  if (saveDoc) {
    await utils.saveDoc(formDoc);
  }
  return formDoc;
};

const getInputValue = async (question) => {
  return await (await getCurrentPageSection())
    .$(`label*=${question}`)
    .$('input')
    .getValue();
};

module.exports = {
  isElementDisplayed,
  selectRadioButton,
  selectCheckBox,
  setInputValue,
  setDateValue,
  setTextareaValue,
  validateSummaryReport,
  uploadForm,
  getInputValue,
};
