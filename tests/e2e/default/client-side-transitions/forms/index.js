const fs = require('fs');
const path = require('path');
const utils = require('../../../../utils');

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


module.exports.uploadForms = async () => {
  // uploading one by one to not have to handle bulk docs errors and have it fail directly if one upload fails
  await utils.saveDoc(getMuteClinicForm());
  await utils.saveDoc(getMutePersonForm());
  await utils.saveDoc(getUnmuteClinicForm());
  await utils.saveDoc(getUnmutePersonForm());
  await utils.saveDoc(getMuteNewClinicForm());
};

module.exports.openForm = async (formId) => {
  const addButton = await $('.detail-actions .actions .dropdown-toggle .fa-plus');
  await addButton.waitForClickable({ timeout: 10000 });
  await addButton.click();
  const form = await $(`#relevant-contacts-form li[id="form:${formId}"] a`);
  await form.click();
};

module.exports.submit = async () => {
  const submitButton = await $('.btn.submit.btn-primary');
  await submitButton.waitForClickable();
  await submitButton.click();
};

module.exports.selectHealthCenter = async name => {
  const select = await $('.selection');
  await select.click();
  const search = await $('.select2-search__field');
  await search.click();
  await search.setValue(name);
  await (await $('.name')).click();
};

module.exports.fillPatientName = async name => {
  const patientName = await $('[name="/mute_new_clinic/new_person/name"]');
  await patientName.setValue(name);
};
