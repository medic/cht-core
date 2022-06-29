
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

const muacNormal = () => $('[name="/assessment/group_nutrition_assessment/group_muac_color/r_note_normal"]');
const muacModerate = () => $('[name="/assessment/group_nutrition_assessment/group_muac_color/r_note_mam_24h"]');
const muacSevere = () => $('[name="/assessment/group_nutrition_assessment/group_muac_color/r_note_sam_24h"]');

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
  const dewormingCheckBox = await $('[data-itext-id="static_instance-select_vit_a-0"]');
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
};

