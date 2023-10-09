const fs = require('fs');
const utils = require('@utils');
const genericForm = require('./generic-form.wdio.page');
const xmlForm = fs.readFileSync(`${__dirname}/../../../../config/standard/forms/app/pregnancy_visit.xml`, 'utf8');
const formDocument = {
  _id: 'form:pregnancy-visit',
  internalId: 'pregnancy-visit',
  title: 'Pregnancy Visit',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xmlForm).toString('base64')
    }
  }
};

const FORM = 'form[data-form-id="pregnancy_home_visit"]';
const VAGINAL_BLEEDING = 'input[name="/pregnancy_home_visit/danger_signs/vaginal_bleeding"]';
const FITS = 'input[name="/pregnancy_home_visit/danger_signs/fits"]';
const ABDOMINAL_PAIN = 'input[name="/pregnancy_home_visit/danger_signs/severe_abdominal_pain"]';
const HEADACHE = 'input[name="/pregnancy_home_visit/danger_signs/severe_headache"]';
const VERY_PALE = 'input[name="/pregnancy_home_visit/danger_signs/very_pale"]';
const FEVER = 'input[name="/pregnancy_home_visit/danger_signs/fever"]';
const REDUCE_FETAL_MOV = 'input[name="/pregnancy_home_visit/danger_signs/reduced_or_no_fetal_movements"]';
const BREAKING_OF_WATER = 'input[name="/pregnancy_home_visit/danger_signs/breaking_water"]';
const EASILY_TIRED = 'input[name="/pregnancy_home_visit/danger_signs/easily_tired"]';
const SWELLING_HANDS = 'input[name="/pregnancy_home_visit/danger_signs/face_hand_swelling"]';
const BREATHLESSNESS = 'input[name="/pregnancy_home_visit/danger_signs/breathlessness"]';
const LLIN = 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/malaria/llin_use"]';
const IRON_FOLATE = 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/iron_folate/iron_folate_daily"]';
const HIV_TESTED = 'input[name="/pregnancy_home_visit/safe_pregnancy_practices/hiv_status/hiv_tested"]';

const visitOption = (value) => $(FORM +
  ` input[name="/pregnancy_home_visit/pregnancy_summary/visit_option"][value="${value}"]`);
const gestationalAgeCorrect = (value) => $(FORM +
  ` input[name="/pregnancy_home_visit/pregnancy_summary/g_age_correct"][value="${value}"]`);

const dangerSignLabel = () =>
  $('label.question.readonly.or-branch.non-select.or-appearance-h1.or-appearance-red > span.question-label');
const dangerSignSummary = () =>
  $$('label.question.readonly.or-branch.non-select.or-appearance-li');
const followUpMessage = () => $('[data-value=" /pregnancy_visit/chw_sms "]');

const selectPatient = async (patientName) => {
  await genericForm.selectContact('/pregnancy_visit/inputs/contact', patientName);
};
const selectDangerSign = async (value) => {
  const danger = await $(`input[value="${value}"]`);
  await danger.click();
};
const selectAllDangerSigns = async () => {
  const checkboxes = await $$('input[name="/pregnancy_visit/group_danger_signs/g_danger_signs"]');
  for (const checkbox of checkboxes) {
    await checkbox.click();
  }
  return checkboxes.length;
};
const addNotes = async (notes = 'Some notes') => {
  const notesArea = await $('textarea[name="/pregnancy_visit/group_note/g_chw_sms"]');
  await notesArea.setValue(notes);
};

const uploadPregnancyVisitForm = async () => {
  await utils.saveDoc(formDocument);
};

const selectVisitOption = async (value = 'yes') => {
  const option = await visitOption(value);
  await option.waitForClickable();
  await option.click();
};

const confirmGestationalAge = async (value = 'yes') => {
  const gestationalAge = await gestationalAgeCorrect(value);
  await gestationalAge.waitForClickable();
  await gestationalAge.click();
};

const countSummaryDangerSigns = async () => {
  return await $$(
    'section[name="/pregnancy_home_visit/summary"] ' +
    ':not(label.disabled) span[data-itext-id*="/pregnancy_home_visit/summary/r_danger_sign_"]'
  ).length;
};

module.exports = {
  VAGINAL_BLEEDING,
  FITS,
  ABDOMINAL_PAIN,
  HEADACHE,
  VERY_PALE,
  FEVER,
  REDUCE_FETAL_MOV,
  BREAKING_OF_WATER,
  EASILY_TIRED,
  SWELLING_HANDS,
  BREATHLESSNESS,
  LLIN,
  IRON_FOLATE,
  HIV_TESTED,
  selectPatient,
  selectDangerSign,
  selectAllDangerSigns,
  addNotes,
  dangerSignLabel,
  dangerSignSummary,
  followUpMessage,
  uploadPregnancyVisitForm,
  selectVisitOption,
  confirmGestationalAge,
  countSummaryDangerSigns,
};
