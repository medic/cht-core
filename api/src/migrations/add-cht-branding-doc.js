const fs = require('fs');
const path = require('path');

const db = require('../db');
const logger = require('../logger');

const BRANDING_ID = 'branding';
const APP_TITLE_V1 = 'Medic';
const APP_TITLE_V2 = 'Community Health Toolkit';

const logo = {
  name: 'logo',
  file: 'cht-logo.png',
  type: 'image/png',
  dir: 'logo',
  digestV1: 'md5-zFTZVAnKNkB2pNgyklPhwQ==' // old Medic logo
};
const favicon = {
  name: 'favicon',
  file: 'favicon.ico',
  type: 'image/x-icon',
  dir: 'ico',
  digestV1: 'md5-jnuDFuuNF7kxj5PZQ/8MAA==' // old Medic logo
};

const getImage = (image) => {
  const src = path.join(__dirname, '..', 'resources', image.dir, image.file);
  return new Promise((resolve, reject) => {
    fs.readFile(src, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve({
        content_type: image.type,
        data: Buffer.from(data, 'base64')
      });
    });
  });
};

const saveDoc = async (doc) => {
  try {
    await db.medic.put(doc);
  } catch (err) {
    if (err.status === 409) {
      logger.warn(
        `add-branding-doc migration tried to create '${BRANDING_ID}' doc but it already exists, keeping original`
      );
    } else {
      throw err;
    }
  }
};

const getBrandingDoc = async () => {
  try {
    return await db.medic.get(BRANDING_ID);
  } catch (err) {
    return {
      _id: BRANDING_ID
    };
  }
};

const updateAttachment = async (doc, image) => {
  const attachmentName = doc.resources && doc.resources[image.name];
  const attachment = doc._attachments && doc._attachments[attachmentName];
  if (attachment && attachment.digest !== image.digestV1) {
    // image already configured - don't update
    return false;
  }
  if (!doc.resources) {
    doc.resources = {};
  }
  doc.resources[image.name] = image.file;
  if (!doc._attachments) {
    doc._attachments = {};
  }
  const newAttachment = await getImage(image);
  doc._attachments[image.file] = {
    content_type: newAttachment.content_type,
    data: newAttachment.data
  };
  return true;
};

const updateTitle = (doc) => {
  if (!doc.title || doc.title === APP_TITLE_V1) {
    doc.title = APP_TITLE_V2;
    return true;
  }
  return false;
};

const run = async () => {
  const doc = await getBrandingDoc();
  let updated = updateTitle(doc);
  updated = await updateAttachment(doc, logo) || updated;
  updated = await updateAttachment(doc, favicon) || updated;
  if (updated) {
    await saveDoc(doc);
  }
};

module.exports = {
  name: 'add-cht-branding-doc',
  created: new Date(2023, 11, 22, 10, 0, 0, 0),
  run: () => run()
};
