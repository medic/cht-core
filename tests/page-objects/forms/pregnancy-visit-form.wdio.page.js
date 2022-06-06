const genericForm = require('./generic-form.wdio.page');

const selectPatient = (patientName) => {
  return genericForm.selectContact('/pregnancy_visit/inputs/contact', patientName);
};
const selectDangerSign = async (value) => {
  const danger = await $(`input[value="${value}"]`);
  await danger.click();
};
const addNotes = async (notes = 'Some notes') => {
  const notesArea = await $('textarea[name="/pregnancy_visit/group_note/g_chw_sms"]');
  await notesArea.setValue(notes);
};

module.exports = {
  selectPatient,
  selectDangerSign,
  addNotes
};
