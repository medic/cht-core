
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

const selectAllDangerSigns = async () => {
  const checkboxes = await $$('input[name="/assessment/group_danger_signs/g_danger_signs"]');
  for (const checkbox of checkboxes) {
    await checkbox.click();
  }
  return checkboxes.length;
};

const uploadForm = async () => {
  await utils.saveDoc(formDocument);
};

const checkDewormingBox = async () => {
  const dewormingCheckBox = await $('input[type="checkbox"][name="/assessment/group_deworm_vit/deworming_received"]');
  await dewormingCheckBox.click();
  await dewormingCheckBox.click();
};

const insertMuacScore = async (value) => {
  const muacInput = await $('[name="/assessment/group_nutrition_assessment/muac_score"]');
  await muacInput.setValue(value);
  await(await $('[name="/assessment/group_nutrition_assessment/child_weight"]')).click();
};

const waitForQuestion = async (symptom) => {
  const title = await $(`[name="/assessment/group_${symptom}"]`);
  await title.waitForDisplayed();
};
const selectVaccines = async (choice) => {
  const radioButton =
  await $(`[name="/assessment/group_imm/group_imm_2mo_9mo/vaccines_received_9mo"][value="${choice}"]`);
  await radioButton.click();
};
const selectRadioButton = async (group, choice) => {
  const radioButton =
  group === 'cough'?await $(`[name="/assessment/group_${group}/patient_${group}s"][value="${choice}"]`):
    await $(`[name="/assessment/group_${group}/patient_${group}"][value="${choice}"]`);
  await radioButton.click();
};

const selectBreastfeeding = async (choice) => {
  const radioButton =
  await $(`[name="/assessment/group_nutrition_assessment/group_under_2yr/breastfeeding"][value="${choice}"]`);
  await radioButton.click();
};

const selectOedemia = async (choice) => {
  const radioButton = await $(`[name="/assessment/group_nutrition_assessment/has_oedema"][value="${choice}"]`);
  await radioButton.click();
};

const getMuacAssessmentDisplayed = async (color) => {
  const form = await $(`label.question.note.or-branch.non-select.or-appearance-h1.or-appearance-${color}`);
  return await form.isDisplayed();
};

module.exports = {
  selectPatient,
  selectAllDangerSigns,
  uploadForm,
  checkDewormingBox,
  insertMuacScore,
  muacModerate,
  muacNormal,
  muacSevere,
  waitForQuestion,
  selectRadioButton,
  selectOedemia,
  selectBreastfeeding,
  selectVaccines,
  getMuacAssessmentDisplayed,
};

