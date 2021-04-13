const environment = require('../lib/environment');
const uploadForms = require('../lib/upload-forms');

module.exports = {
  requiresInstance: true,
  execute: () => uploadForms(environment.pathToProject, 'contact', {
    id_prefix: 'contact:',
    forms: environment.extraArgs,
    default_context: { person:false, place:false },
  })
};
