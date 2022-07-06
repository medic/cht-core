
const fs = require('fs');
const utils = require('../../utils');
const xmlForm = fs.readFileSync(`${__dirname}/../../forms/assessment.xml`, 'utf8');
const genericForm = require('./generic-form.wdio.page');
const formDocument = {
  _id: 'form:assessment',
  internalId: 'assessment',
  title: 'Assess Patient',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xmlForm).toString('base64')
    }
  }
};

const muacNormal = () => $('label.question.note.or-branch.non-select.or-appearance-h1.or-appearance-lime');
const muacModerate = () => $('label.question.note.or-branch.non-select.or-appearance-h1.or-appearance-yellow');
const muacSevere = () => $('label.question.note.or-branch.non-select.or-appearance-h1.or-appearance-red');

const selectPatient = (patientName) => {
  return genericForm.selectContact('/assessment/inputs/contact', patientName);
};

const uploadForm = async () => {
  await utils.saveDoc(formDocument);
};

const insertMuacScore = async (value) => {
  const muacInput = await $('[name="/assessment/group_nutrition_assessment/muac_score"]');
  await muacInput.setValue(value);
  await(await $('[name="/assessment/group_nutrition_assessment/child_weight"]')).click();
};

const getMuacAssessmentDisplayed = async (color) => {
  const form = await $(`label.question.note.or-branch.non-select.or-appearance-h1.or-appearance-${color}`);
  return await form.isDisplayed();
};

module.exports = {
  selectPatient,
  uploadForm,
  insertMuacScore,
  muacModerate,
  muacNormal,
  muacSevere,
  getMuacAssessmentDisplayed,
  formDocument
};

