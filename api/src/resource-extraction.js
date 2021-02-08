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

const extractableFolders = ['audio', 'fonts', 'default-docs','img'];
// todo the build process can be improved (maybe?) to have "build" files nicely packed into one folder so
// we won't need to match extensions
const extractableExtensions = ['.js', '.css', '.eot', '.svg', '.woff', '.woff2', '.html', '.js.map'];
const isAttachmentExtractable = name => {
  return name === 'manifest.json' ||
         extractableFolders.some(prefix => name.startsWith(`${prefix}/`)) ||
         extractableExtensions.some(suffix => name.endsWith(suffix));
};

// Map of attachmentName -> attachmentDigest used to avoid extraction of unchanged documents
let extractedDigests = {};

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

const extractResources = () => {
  const extractToDirectory = environment.getExtractedResourcesPath();
  createFolderIfDne(extractToDirectory);
  return db.medic
    .get('_design/medic')
    .then(ddoc => Promise.resolve(Object.keys(ddoc._attachments))
      .then(attachmentNames => attachmentNames.filter(n => extractedDigests[n] !== ddoc._attachments[n].digest))
      .then(attachmentNames => attachmentNames.filter(isAttachmentExtractable))
      .then(requiredNames => Promise.all(requiredNames.map(req => extractAttachment(extractToDirectory, req))))
      .then(attachmentNames => attachmentNames.forEach(name => extractedDigests[name] = ddoc._attachments[name].digest))
    );
};

const extractAttachment = (extractToDirectory, attachmentName) => db.medic
  .getAttachment('_design/medic', attachmentName)
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

module.exports = {
  run: extractResources,
  removeDirectory: removeDirectory,
  clearCache: () => extractedDigests = {},
};
