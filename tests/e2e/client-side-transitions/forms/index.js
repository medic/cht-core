const fs = require('fs');
const path = require('path');
const utils = require('../../../utils');

const getFormDoc = (formId) => {
  const xmlPath = path.join(__dirname, `./${formId}.xml`);
  const xml = fs.readFileSync(xmlPath, 'utf8');
  return {
    _id: `form:${formId}`,
    internalId: formId,
    title: formId,
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  };
};

const getMutePersonForm = () => ({
  ...getFormDoc('mute_person'),
  context: {
    person: true,
    place: false,
  },
});

const getUnmutePersonForm = () => ({
  ...getFormDoc('unmute_person'),
  context: {
    person: true,
    place: false,
  },
});

const getMuteClinicForm = () => ({
  ...getFormDoc('mute_clinic'),
  context: {
    person: false,
    place: true,
  },
});

const getUnmuteClinicForm = () => ({
  ...getFormDoc('unmute_clinic'),
  context: {
    person: false,
    place: true,
  },
});

const getMuteNewClinicForm = () => ({
  ...getFormDoc('mute_new_clinic'),
  context: {
    person: false,
    place: true,
  },
});


const uploadForms = async () => {
  // uploading one by one to not have to handle bulk docs errors and have it fail directly if one upload fails
  await utils.saveDoc(getMuteClinicForm());
  await utils.saveDoc(getMutePersonForm());
  await utils.saveDoc(getUnmuteClinicForm());
  await utils.saveDoc(getUnmutePersonForm());
  await utils.saveDoc(getMuteNewClinicForm());
};

const openForm = async (formId) => {
  const addButton = await $('.detail-actions .actions .dropdown-toggle .fa-plus');
  await addButton.waitForClickable();
  await addButton.click();
  const form = await $(`#relevant-contacts-form li[id="form:${formId}"] a`);
  await form.click();
  const formTitle = await $('#form-title');
  return formTitle;
};

const submit = async () => {
  const submitButton = await $('.btn.submit.btn-primary');
  await submitButton.click();
  const summaryDiv = await $('div.row.flex.grid');
  await summaryDiv.waitForDisplayed(); // contact summary loaded
};

const selectHealthCenter = async name => {
  const select = await $('.selection');
  await select.waitForClickable();
  await select.click();
  const search = await $('.select2-search__field');
  await search.click();
  await search.setvalue(name);
  await (await $('.name')).waitForClickable();
  await (await $('.name')).click();
};

const fillPatientName = async name => {
  const patientName = await $('[name="/mute_new_clinic/new_person/name"]');
  await patientName.waitForDisplayed();
  await patientName.setValue(name);
};

module.exports = {
  uploadForms,
  openForm,
  submit,
  selectHealthCenter,
  fillPatientName
};

