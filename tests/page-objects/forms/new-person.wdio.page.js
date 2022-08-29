const FORM = 'form[data-form-id="contact:person:create"]';

const setName = async (value = 'Woman1') => {
  const name = await $(`${FORM} input[name="/data/person/name"]`);
  await name.setValue(value);
};

const setDOB = async (value = '1995-05-05') => {
  const dob = await $(`${FORM} div.widget.date input`);
  await dob.setValue(value);
};

const setPhone = async (value = '+64274444444') => {
  const phone = await $(`${FORM} input[type="tel"]`);
  await phone.setValue(value);
};

const setSex = async (value = 'female') => {
  const sex = await $(`${FORM} input[name="/data/person/sex"][value="${value}"]`);
  await sex.click();
};

const setRole = async (value = 'patient' ) => {
  const role = await $(`${FORM} input[name="/data/person/role"][value="${value}"]`);
  await role.click();
};

const setExternalID = async (value = '12345') => {
  const externalID = await $(`${FORM} input[name="/data/person/external_id"]`);
  await externalID.setValue(value);
};

const setNotes = async (value = 'Test notes') => {
  const notes = await $(`${FORM} textarea[name="/data/person/notes"]`);
  await notes.setValue(value);
};

const fillDefaultContactForm = async () => {
  await setName();
  await setDOB();
  await setPhone();
  await setSex();
  await setRole();
  await setExternalID();
  await setNotes();
};

module.exports = {
  setName,
  setDOB,
  setPhone,
  setSex,
  setRole,
  setExternalID,
  setNotes,
  fillDefaultContactForm,
};
