const db = require('../db');
const fs = require('fs');
const logger = require('../logger');
const path = require('path');
const BRANDING_ID = 'branding';
const appTitle = 'Medic';

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
  const srcLogo = path.join(__dirname, '..', `resources/${logo.dir}`, logo.file);
  const srcFav = path.join(__dirname, '..', `resources/${favicon.dir}`, favicon.file);

  return Promise.all([
    attachDocument(srcLogo, logo),
    attachDocument(srcFav, favicon)
  ]).then(([aLogo, aFavicon]) => {
    const doc = {
      _id: BRANDING_ID,
      title: appTitle,
      resources: {
        [logo.name]: logo.file,
        [favicon.name]: favicon.file
      },
      _attachments: {
        [logo.file]: {
          content_type: aLogo.content_type,
          data: aLogo.data
        },
        [favicon.file]: {
          content_type: aFavicon.content_type,
          data: aFavicon.data
        }
      }
    };

    return db.medic.put(doc)
      .catch(err => {
        if (err.status === 409) {
          logger.warn(
            `add-branding-doc migration tried to create '${BRANDING_ID}' doc but it already exists, keeping original`
          );
        } else {
          throw err;
        }
      });
  });
};

module.exports = {
  name: 'add-branding-doc',
  created: new Date(2018, 11, 22, 10, 0, 0, 0),
  run: () => createDoc()
};
