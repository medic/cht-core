const db = require('../db-pouch'),
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

const attachDocument = (src, resource) => {
  return new Promise((resolve, reject) => {
    fs.readFile(src, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve({
        content_type: resource.type,
        data: Buffer.from(data, 'base64')
      });
    });
  });
};

const createDoc = () => {

  const attachment = [];
  const srcLogo = path.join(__dirname, '..', `resources/${logo.dir}`, logo.file);
  const srcFav = path.join(__dirname, '..', `resources/${favicon.dir}`, favicon.file);

  return attachDocument(srcLogo, logo).then(resp => {
    attachment.push(resp);
    attachDocument(srcFav, favicon).then(resp => {
      attachment.push(resp);
      const doc = {
        _id: BRANDING_ID,
        title: appTitle,
        resources: {
          [logo.name]: logo.file,
          [favicon.name]: favicon.file
        },
        _attachments: {
          [logo.file]: {
            content_type: attachment[0].content_type,
            data: attachment[0].data
          },
          [favicon.file]: {
            content_type: attachment[1].content_type,
            data: attachment[1].data
          }
        }
      };
      db.medic.put(doc);
    });
  });
};

module.exports = {
  name: 'add-branding-doc',
  created: new Date(2018, 11, 22, 10, 0, 0, 0),
  run: () => {
    return createDoc();
  }
};
