/*
Before Chrome 66, web requests from the service worker don't include credentials (cookies, basic auth, etc).
This means service workers cannot cache any resource behind an authenticated endpoint.
Therefore, we extract all cacheable resources into a folder and serve them as public static content.
*/

const fs = require('fs');
const path = require('path');
const db = require('./db');
const environment = require('./environment');
const logger = require('./logger');

const MAIN_DDOC_ID = '_design/medic';
const ADMIN_DDOC_ID = '_design/medic-admin';
const ADMIN_FOLDER = 'admin';

const extractableFolders = ['audio', 'fonts', 'default-docs','img'];
// todo the build process can be improved (maybe?) to have "build" files nicely packed into one folder so
// we won't need to match extensions
const extractableExtensions = ['.js', '.css', '.eot', '.svg', '.woff', '.woff2', '.html', '.js.map', 'css.map'];
const isAttachmentExtractable = name => {
  return name === 'manifest.json' ||
         extractableFolders.some(prefix => name.startsWith(`${prefix}/`)) ||
         extractableExtensions.some(suffix => name.endsWith(suffix));
};

// Map of attachmentName -> attachmentDigest used to avoid extraction of unchanged documents
const extractedDigests = {};

const createFolderIfDne = folderPath => !fs.existsSync(folderPath) && fs.mkdirSync(folderPath);

const removeDirectoryRecursive = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const files = fs.readdirSync(dirPath) || [];

  files.forEach(fileName => {
    const filePath = path.join(dirPath, fileName);

    if (fs.statSync(filePath).isDirectory()) {
      removeDirectoryRecursive(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  });

  fs.rmdirSync(dirPath);
};

const removeDirectory = () => {
  const outputPath = environment.getExtractedResourcesPath();

  // ToDo: When no longer supporting Node.js -v.12, replace with: fs.rmdirSync(outputPath, { recursive: true });
  removeDirectoryRecursive(outputPath);
};

const extractResources = (ddocId, subdir = '') => {
  const extractToDirectory = path.join(environment.getExtractedResourcesPath(), subdir);
  createFolderIfDne(extractToDirectory);
  return db.medic
    .get(ddocId)
    .then(ddoc => Promise
      .resolve(Object.keys(ddoc._attachments))
      .then(attachmentNames => attachmentNames.filter(n => extractedDigests[n] !== ddoc._attachments[n].digest))
      .then(attachmentNames => attachmentNames.filter(isAttachmentExtractable))
      .then(requiredNames => Promise.all(requiredNames.map(req => extractAttachment(ddocId, extractToDirectory, req))))
      .then(attachmentNames => attachmentNames.forEach(name => extractedDigests[name] = ddoc._attachments[name].digest))
    );
};

const extractAttachment = (ddocId, extractToDirectory, attachmentName) => db.medic
  .getAttachment(ddocId, attachmentName)
  .then(raw => new Promise((resolve, reject) => {
    const outputPath = path.join(extractToDirectory, attachmentName);
    createFolderIfDne(path.dirname(outputPath));

    fs.writeFile(outputPath, raw, err => {
      logger.debug(`Extracted attachment ${outputPath}`);
      if (err) {
        return reject(err);
      }
      resolve(attachmentName);
    });
  }));

const extractMedic = () => extractResources(MAIN_DDOC_ID);
const extractAdmin = () => extractResources(ADMIN_DDOC_ID, ADMIN_FOLDER);

module.exports = {
  run: () => extractMedic().then(() => extractAdmin()),
  extractMedic,
  extractAdmin,
  removeDirectory,
};
