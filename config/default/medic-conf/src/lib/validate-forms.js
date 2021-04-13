const api = require('./api')();
const argsFormFilter = require('./args-form-filter');
const fs = require('./sync-fs');
const log = require('./log');
const {
  getFormDir,
  getFormFilePaths,
  formHasInstanceId
} = require('./forms-utils');

module.exports = async (projectDir, subDirectory, options={}) => {

  const formsDir = getFormDir(projectDir, subDirectory);
  if(!formsDir) {
    log.info(`Forms dir not found: ${formsDir}`);
    return;
  }

  let idValidationsPassed = true;
  let validateFormsPassed = true;

  const fileNames = argsFormFilter(formsDir, '.xml', options);
  for (const fileName of fileNames) {
    log.info(`Validating form: ${fileName}…`);

    const { xformPath, filePath } = getFormFilePaths(formsDir, fileName);
    const xml = fs.read(xformPath);

    if(!formHasInstanceId(xml)) {
      log.error(`Form at ${xformPath} appears to be missing <meta><instanceID/></meta> node. This form will not work on medic-webapp.`);
      idValidationsPassed = false;
      continue;
    }
    try {
      await _formsValidate(xml);
    } catch (err) {
      log.error(`Error found while validating "${filePath}". Validation response: ${err.message}`);
      validateFormsPassed = false;
    }
  }
  // Once all the fails were checked raise an exception if there were errors
  let errors = [];
  if (!validateFormsPassed) {
    errors.push('One or more forms appears to have errors found by the API validation endpoint.');
  }
  if (!idValidationsPassed) {
    errors.push('One or more forms appears to be missing <meta><instanceID/></meta> node.');
  }
  if (errors.length) {
    // the blank spaces are a trick to align the errors in the log ;)
    throw new Error(errors.join('\n             '));
  }
};

let validateEndpointNotFoundLogged = false;
const _formsValidate = async (xml) => {
  const resp = await api.formsValidate(xml);
  if (resp.formsValidateEndpointFound === false && !validateEndpointNotFoundLogged) {
    log.warn('Form validation endpoint not found in your version of CHT Core, ' +
      'no form will be checked before push');
    validateEndpointNotFoundLogged = true; // Just log the message once
  }
  return resp;
};
