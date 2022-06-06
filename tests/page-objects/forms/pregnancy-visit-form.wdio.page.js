const genericForm = require('./generic-form.wdio.page');
const dangerSignLabel  =  () =>
  $('label.question.note.or-branch.non-select.or-appearance-h1.or-appearance-red > span.question-label');
const dangerSignSummary  =  () =>
  $$('label.question.note.or-branch.non-select.or-appearance-li');
const followUpMessage =   () =>  $('[data-value=" /pregnancy_visit/chw_sms "]');


const selectPatient = (patientName) => {
  return genericForm.selectContact('/pregnancy_visit/inputs/contact', patientName);
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
  return await checkboxes.length;
};
const addNotes = async (notes = 'Some notes') => {
  const notesArea = await $('textarea[name="/pregnancy_visit/group_note/g_chw_sms"]');
  await notesArea.setValue(notes);
};

module.exports = {
  selectPatient,
  selectDangerSign,
  selectAllDangerSigns,
  addNotes,
  dangerSignLabel,
  dangerSignSummary,
  followUpMessage
};
