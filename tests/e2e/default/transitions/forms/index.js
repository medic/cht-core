const fs = require('fs');
const path = require('path');
const utils = require('@utils');

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

const selectHealthCenter = async name => {
  const select = await $('.selection');
  await select.click();
  const search = await $('.select2-search__field');
  await search.click();
  await search.setValue(name);
  await (await $('.name')).click();
};

const fillPatientName = async name => {
  const patientName = await $('[name="/mute_new_clinic/new_person/name"]');
  await patientName.setValue(name);
};

module.exports = {
  uploadForms,
  selectHealthCenter,  
  fillPatientName,
};

