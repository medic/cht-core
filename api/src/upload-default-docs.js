const fs = require('fs');
const path = require('path');

const db = require('./db');
const { error } = require('./logger');
const environment = require('./environment');
const settingService = require('./services/settings');

const uploadDocumentsInFolder = async folderPath => {
  const parsedFiles = fs.readdirSync(folderPath)
    .map(filename => {
      const resolvedPath = path.resolve(folderPath, filename);
      const fileContent = fs.readFileSync(resolvedPath).toString();
      const parsed = JSON.parse(fileContent);

      return {
        name: filename,
        doc: parsed,
      };
    });

  // Settings doc requires special casing because it does not have an id
  const settingsDoc = parsedFiles.find(file => file.name === 'settings.doc.json');
  if (settingsDoc) {
    await settingService.update(settingsDoc.doc);
  }

  const notSettingsDocs = parsedFiles
    .filter(file => !settingsDoc || file !== settingsDoc)
    .map(file => file.doc);

  return db.medic.bulkDocs(notSettingsDocs);
};

const uploadDefaultDocuments = async function () {
  const hasConfiguration = await settingService.get()
    .then(settings => !!Object.keys(settings).length)
    .catch(() => false);

  if (hasConfiguration) {
    return;
  }

  const pathToConfig = environment.defaultDocsPath;
  if (fs.existsSync(pathToConfig)) {
    const uploadResult = await uploadDocumentsInFolder(pathToConfig);
    const unsuccessfulUploads = uploadResult.filter(result => !result.ok);
    for (const unsuccessful of unsuccessfulUploads) {
      error(`Failured to upload initial config document ${unsuccessful.id}: ${unsuccessful.message}`);
    }

    if (unsuccessfulUploads.length) {
      throw Error(`Failed to upload initial configuration`);
    }
  }
};

module.exports = {
  run: uploadDefaultDocuments,
};
