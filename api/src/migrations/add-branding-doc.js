const db = require('../db-pouch'),
  logger = require('../logger'),
  fs = require('fs'),
  path = require('path'),
  BRANDING_ID = 'branding',
  appTitle = 'Medic Mobile';

const logo = {
  name: 'logo',
  file: 'medic-logo-light-full.svg',
  type: 'image/svg+xml',
  dir: 'logo'
};
const favicon = {
  name: 'favicon',
  file: 'favicon.ico',
  type: 'image/x-icon',
  dir: 'ico'
};

const attachDocument = (src, doc, resource) => {
  return new Promise((resolve, reject) => {
    fs.readFile(src, (err, data) => {
      if (err) {
        return reject(err);
      }
      db.medic.putAttachment(doc.id, resource.file, doc.rev, new Buffer(data).toString('base64'), resource.type).then(doc => {
        resolve(doc);
      });
    });
  });
};

const createDoc = () => {
  return db.medic.put({
    _id: BRANDING_ID,
    title: appTitle,
    resources: {
      [logo.name]: logo.file,
      [favicon.name]: favicon.file
    }
  }).then(doc => {
    const srcLogo = path.join(__dirname, '..', `resources/${logo.dir}`, logo.file);
    const srcFav = path.join(__dirname, '..', `resources/${favicon.dir}`, favicon.file);
    attachDocument(srcLogo, doc, logo).then(doc => {
      attachDocument(srcFav, doc, favicon);
    });
  })
  .catch(err => {
    logger.error('%o',err);
  });
};

module.exports = {
  name: 'add-branding-doc',
  created: new Date(2018, 11, 22, 10, 0, 0, 0),
  run: () => {
    return createDoc();
  }
};
