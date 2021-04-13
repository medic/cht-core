const attachmentsFromDir = require('../lib/attachments-from-dir');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const pouch = require('../lib/db');
const log = require('../lib/log');
const insertOrReplace = require('../lib/insert-or-replace');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');

module.exports = {
  requiresInstance: true,
  execute: async () => {
    const privacyPoliciesPath = fs.path.resolve(`${environment.pathToProject}/privacy-policies.json`);

    if(!fs.exists(privacyPoliciesPath)) {
      log.warn(`No policies language mapping file found at path: ${privacyPoliciesPath}`);
      return Promise.resolve();
    }

    const privacyPoliciesMapping = fs.readJson(privacyPoliciesPath);
    const allAttachments = attachmentsFromDir(`${environment.pathToProject}/privacy-policies`) || {};
    const validAttachments = {};

    Object.keys(privacyPoliciesMapping).forEach(languageCode => {
      const attachmentFileName = privacyPoliciesMapping[languageCode];
      const attachmentFile = allAttachments[attachmentFileName];
      if (!attachmentFileName || !attachmentFile) {
        delete privacyPoliciesMapping[languageCode];
        return;
      }
      if (attachmentFile && attachmentFile.content_type !== 'text/html') {
        log.warn(`Privacy policies attachment files must be of type text/html. Found ${attachmentFileName} of type ${attachmentFile.content_type}. Skipping.`);
        delete privacyPoliciesMapping[languageCode];
        return;
      }

      validAttachments[attachmentFileName] = allAttachments[attachmentFileName];
    });

    const doc = {
      _id: 'privacy-policies',
      privacy_policies: privacyPoliciesMapping,
      _attachments: validAttachments,
    };

    const db = pouch();

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);
    if (changes) {
      await insertOrReplace(db, doc);
      log.info('Privacy policies file uploaded');
    } else {
      log.info('Privacy policies file not uploaded as no changes found');
    }

    await warnUploadOverwrite.postUploadDoc(db, doc);

    return Promise.resolve();
  }
};
