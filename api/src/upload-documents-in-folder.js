const fs = require('fs');
const path = require('path');

const db = require('./db');
const settingService = require('./services/settings');

const uploadDocumentsInFolder = async folderPath => {
  const parsedFiles = fs.readdirSync(folderPath).map(filename => {
    const filePath = path.resolve(folderPath, filename);
    const fileContent = fs.readFileSync(filePath).toString();
    const parsed = JSON.parse(fileContent);
    
    return {
      name: filename,
      doc: parsed,
    };
  });
  
  // Settings doc requires special casing because it does not have an id
  const settingsDoc = parsedFiles.find(file => file.name === 'settings');
  if (settingsDoc) {
    await settingService.update(settingsDoc.doc);
  }

  const notSettingsDocs = parsedFiles.filter(file => !settingsDoc || file !== settingsDoc).map(file => file.doc);
  await db.medic.bulkDocs(notSettingsDocs);
};

module.exports = uploadDocumentsInFolder;
