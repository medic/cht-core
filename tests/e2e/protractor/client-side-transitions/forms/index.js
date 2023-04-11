const fs = require('fs');
const path = require('path');
const utils = require('../@utils');
const helper = require('../../../../helper');

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
  const addButton = element(by.css('.detail-actions .actions .dropdown-toggle .fa-plus'));
  await helper.clickElementNative(addButton);
  const form = element(by.css(`#relevant-contacts-form li[id="form:${formId}"] a`));
  await helper.clickElementNative(form);
  return helper.waitUntilReadyNative(element(by.id('form-title')));
};

module.exports.submit = async () => {
  const submitButton = element(by.css('.btn.submit.btn-primary'));
  await helper.clickElementNative(submitButton);
  await helper.waitElementToBeVisibleNative(element(by.css('div.row.flex.grid'))); // contact summary loaded
};

module.exports.selectHealthCenter = async name => {
  const select = element(by.css('.selection'));
  await helper.waitUntilReadyNative(select);
  await select.click();
  const search = await element(by.css('.select2-search__field'));
  await search.click();
  await search.sendKeys(name);
  await helper.waitElementToBeVisibleNative(element(by.css('.name')));
  await element(by.css('.name')).click();
};

module.exports.fillPatientName = async name => {
  const patientName = element(by.css('[name="/mute_new_clinic/new_person/name"]'));
  await helper.waitUntilReadyNative(patientName);
  await patientName.clear().sendKeys(name);
};
