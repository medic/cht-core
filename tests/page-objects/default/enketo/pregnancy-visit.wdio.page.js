const fs = require('fs');
const utils = require('@utils');
const genericForm = require('./generic-form.wdio.page');
const xmlForm = fs.readFileSync(`${__dirname}/../../../../config/standard/forms/app/pregnancy_visit.xml`, 'utf8');
const formDocument = {
  _id: 'form:pregnancy-visit',
  internalId: 'Pregnancy visit',
  title: 'Pregnancy Visit',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xmlForm).toString('base64')
    }
  }
};
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

module.exports = {
  selectPatient,
  selectDangerSign,
  selectAllDangerSigns,
  addNotes,
  dangerSignLabel,
  dangerSignSummary,
  followUpMessage,
  uploadPregnancyVisitForm
};
