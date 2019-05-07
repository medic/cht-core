/*
Before Chrome 66, web requests from the service worker don't include credentials (cookies, basic auth, etc).
This means service workers cannot cache any resource behind an authenticated endpoint.
Therefore, we extract all cacheable resources into a folder and serve them as public static content.
*/

const
  fs = require('fs'),
  path = require('path'),
  { env } = require('process'),
  db = require('./db'),
  logger = require('./logger'),
  isAttachmentCacheable = name => name === 'manifest.json' || !!name.match(/(?:audio|css|fonts|templates|img|js|xslt)\/.*/);

// Map of attachmentName -> attachmentDigest used to avoid extraction of unchanged documents
let extractedDigests = {};

const createFolderIfDne = x => !fs.existsSync(x) && fs.mkdirSync(x);

const getDestinationDirectory = () => {
  let destination = env['MEDIC_API_RESOURCE_PATH'];
  if (!destination) {
    const isProduction = env['NODE_ENV'] === 'production';
    const defaultLocation = path.join(__dirname, `extracted-resources`);
    destination = isProduction ? '/tmp/extracted-resources' : defaultLocation;
  }

  return path.resolve(destination);
};

const extractCacheableAttachments = () => {
  const extractToDirectory = getDestinationDirectory();
  createFolderIfDne(extractToDirectory);
  return db.medic
    .get('_design/medic')
    .then(ddoc => Promise.resolve(Object.keys(ddoc._attachments))
      .then(attachmentNames => attachmentNames.filter(name => extractedDigests[name] !== ddoc._attachments[name].digest))
      .then(attachmentNames => attachmentNames.filter(isAttachmentCacheable))
      .then(requiredNames => Promise.all(requiredNames.map(required => extractAttachment(extractToDirectory, required))))
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
  run: extractCacheableAttachments,
  getDestinationDirectory,
  clearCache: () => extractedDigests = {},
};
