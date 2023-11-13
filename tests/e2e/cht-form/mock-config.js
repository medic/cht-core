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
  await browser.url(getBaseURL());
  await browser.execute((formData) => {
    const myForm = document.getElementById('myform');
    myForm.formHtml = formData.formHtml;
    myForm.formModel = formData.formModel;
    myForm.formXml = formData.formXml;
  }, formData);
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
  return await browser.executeAsync((resolve) => {
    const myForm = document.getElementById('myform');
    myForm.addEventListener('onSubmit', (e) => resolve(e.detail));
    $('.enketo .submit')
      .click();
  });
};

module.exports = {
  loadForm,
  startMockApp,
  stopMockApp,
  submitForm
};
