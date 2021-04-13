const argsFormFilter = require('./args-form-filter');
const attachmentsFromDir = require('./attachments-from-dir');
const attachmentFromFile = require('./attachment-from-file');
const fs = require('./sync-fs');
const log = require('./log');
const insertOrReplace = require('./insert-or-replace');
const pouch = require('./db');
const warnUploadOverwrite = require('./warn-upload-overwrite');
const {
  getFormDir,
  getFormFilePaths,
  readTitleFrom,
  readIdFrom
} = require('./forms-utils');
const validateForms = require('./validate-forms');

const SUPPORTED_PROPERTIES = ['context', 'icon', 'title', 'xml2sms', 'subject_key', 'hidden_fields'];

module.exports = async (projectDir, subDirectory, options) => {
  await validateForms(projectDir, subDirectory, options);
  const db = pouch();
  if (!options) options = {};
  const formsDir = getFormDir(projectDir, subDirectory);
  if(!fs.exists(formsDir)) {
    log.info(`Forms dir not found: ${formsDir}`);
    return;
  }

  const fileNames = argsFormFilter(formsDir, '.xml', options);
  for (const fileName of fileNames) {
    log.info(`Preparing form for upload: ${fileName}…`);

    const { baseFileName, mediaDir, xformPath, filePath } = getFormFilePaths(formsDir, fileName);
    const baseDocId = (options.id_prefix || '') + baseFileName.replace(/-/g, ':');

    const mediaDirExists = fs.exists(mediaDir);
    if(!mediaDirExists) {
      log.info(`No media directory found at ${mediaDir} for form ${xformPath}`);
    }

    const xml = fs.read(xformPath);

    const internalId = readIdFrom(xml);
    if(internalId !== baseDocId) log.warn('DEPRECATED', 'Form:', fileName, 'Bad ID set in XML.  Expected:', baseDocId, 'but saw:', internalId, ' Support for setting these values differently will be dropped.  Please see https://github.com/medic/medic-webapp/issues/3342.');

    const docId = `form:${baseDocId}`;
    const doc = {
      _id: docId,
      type: 'form',
      internalId: internalId,
      title: readTitleFrom(xml),
      context: options.default_context,
    };

    const propertiesPath = `${formsDir}/${baseFileName}.properties.json`;
    updateFromPropertiesFile(doc, propertiesPath);

    doc._attachments = mediaDirExists ? attachmentsFromDir(mediaDir) : {};
    doc._attachments.xml = attachmentFromFile(xformPath);

    const properties = SUPPORTED_PROPERTIES.concat('internalId');

    const changes = await warnUploadOverwrite.preUploadForm(db, doc, xml, properties);
    if (changes) {
      await insertOrReplace(db, doc);
      log.info(`Form ${filePath} uploaded`);
    } else {
      log.info(`Form ${filePath} not uploaded, no changes`);
    }
    // update hash regardless
    await warnUploadOverwrite.postUploadForm(doc, xml, properties);
  }
};

const updateFromPropertiesFile = (doc, path) => {
  if (fs.exists(path)) {

    let ignoredKeys = [];
    const properties = fs.readJson(path);

    Object.keys(properties).forEach(key => {
      if (typeof properties[key] !== 'undefined') {
        if (SUPPORTED_PROPERTIES.includes(key)) {
          doc[key] = properties[key];
        } else if (key === 'internalId') {
          log.warn(`DEPRECATED: ${path}. Please do not manually set internalId in .properties.json for new projects. Support for configuring this value will be dropped. Please see https://github.com/medic/medic-webapp/issues/3342.`);
          doc.internalId = properties.internalId;
        } else {
          ignoredKeys.push(key);
        }
      }
    });

    if (ignoredKeys.length) {
      log.warn(`Ignoring unknown properties in ${path}: ${ignoredKeys.join(', ')}`);
    }
  }
};
