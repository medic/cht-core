const express = require('express');
const path = require('path');
const fs = require('fs/promises');
// This is essentially the same code used by the test-harness to generate the form html and model.
// If this code changes, the test-harness will need to be updated as well.
const generateXformService = require('../../../api/src/services/generate-xform');

let server;
const mockApp = express();
mockApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
mockApp.use(express.static(path.join(__dirname, '../../../build/cht-form')));

const getFormPath = (config, formType, formName) => {
  if (formType === 'test') {
    return path.join(__dirname, config, 'forms', `${formName}.xml`);
  }
  return path.join(__dirname, '../../../config', config, 'forms', formType, `${formName}.xml`);
};

const generateFormData = async (formPath) => {
  const formXml = await fs.readFile(formPath, 'utf-8');
  const { form: formHtml, model: formModel } = await generateXformService.generate(formXml);
  return { formHtml, formModel, formXml };
};

const startMockApp = async (config, formType, formName) => {
  const formPath = getFormPath(config, formType, formName);
  const formData = await generateFormData(formPath);
  return new Promise(resolve => {
    server = mockApp.listen(resolve);
  }).then(async () => {
    await browser.url(`http://localhost:${server.address().port}`);
    await browser.execute((formData) => {
      const myForm = document.getElementById('myform');
      myForm.formHtml = formData.formHtml;
      myForm.formModel = formData.formModel;
      myForm.formXml = formData.formXml;
    }, formData);
  });
};

const stopMockApp = () => {
  server && server.close();
};

module.exports = {
  startMockApp,
  stopMockApp,
};
