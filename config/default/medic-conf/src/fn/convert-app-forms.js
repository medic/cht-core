const convertForms = require('../lib/convert-forms');
const environment = require('../lib/environment');

module.exports = {
  requiresInstance: false,
  execute: () => convertForms(environment.pathToProject, 'app', {
    enketo: true,
    forms: environment.extraArgs,
    transformer: xml => xml.replace('</instance>', '</instance>\n      <instance id="contact-summary"/>'),
  })
};
