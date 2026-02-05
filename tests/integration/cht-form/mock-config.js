const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const generateXformService = require('../../../api/src/services/generate-xform');

let server;
const mockApp = express();
mockApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
mockApp.use(express.static(path.join(__dirname, '../../../build/cht-form')));

const getBaseURL = () => `http://localhost:${server.address().port}`;

const getFormPath = (config, formType, formName) => {
  if (formType === 'test') {
    return path.join(__dirname, config, 'forms', `${formName}.xml`);
  }
  return path.join(__dirname, '../../../config', config, 'forms', formType, `${formName}.xml`);
};

const generateFormData = async (formPath) => {
  const formXml = await fs.readFile(formPath, 'utf-8');
  // This is essentially the same code used by the test-harness to generate the form html and model.
  // If this code changes, the test-harness will need to be updated as well.
  const { form: formHtml, model: formModel } = await generateXformService.generate(formXml);
  return { formHtml, formModel, formXml };
};

const loadForm = async (config, formType, formName) => {
  const formPath = getFormPath(config, formType, formName);
  const formData = await generateFormData(formPath);
  await browser.execute((formData, formType, formName) => {
    const myForm = document.getElementById('myform');
    myForm.formHtml = formData.formHtml;
    myForm.formModel = formData.formModel;
    myForm.formXml = formData.formXml;
    if (formType === 'contact') {
      myForm.contactType = formName.split('-')[0];
    }
  }, formData, formType, formName);
};

const startMockApp = () => {
  server = mockApp.listen();
  return getBaseURL();
};

const stopMockApp = () => {
  server && server.close();
};

const submitForm = async () => {
  await $('.form-footer').click();
  return await browser.execute(() => {
    return new Promise((resolve) => {
      const myForm = document.getElementById('myform');
      myForm.addEventListener('onSubmit', async (e) => {
        const doc = e.detail[0];
        // data that gets sent through the BiDi protocol gets serialized,
        // and serializing blobs results in empty objects
        // https://github.com/webdriverio/webdriverio/issues/15082
        if (doc._attachments) {
          for (const [ , attachment ] of Object.entries(doc._attachments)) {
            if (attachment.data instanceof Blob) {
              const arrayBuffer = await attachment.data.arrayBuffer();
              attachment.data = Array.from(new Uint8Array(arrayBuffer));
            }
          }
        }
        resolve(e.detail);
      });
      $('.enketo .submit').click();
    });
  });
};

const revertUintToBlob = (attachment) => {
  return new Blob([new Uint8Array(attachment.data)], { type: attachment.content_type });
};

const cancelForm = async () => {
  await browser.execute(() => {
    $('.enketo .cancel').click();
  });
};

module.exports = {
  getBaseURL,
  loadForm,
  startMockApp,
  stopMockApp,
  submitForm,
  cancelForm,
  revertUintToBlob,
};
