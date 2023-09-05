const fs = require('fs');
const { promisify } = require('util');
const path = require('path');

const db = require('../db');
const logger = require('../logger');

const DEFAULT_LOGO_PATH = path.join(__dirname, '..', 'resources', 'logo', 'medic-logo-light-full.svg');
const DEFAULT_FAVICON_PATH = path.join(__dirname, '..', 'resources', 'ico', 'favicon.ico');

const getInlineImage = ({ data, contentType }) => `data:${contentType};base64,${data}`;

const getBrandingDoc = async () => {
  try {
    return await db.medic.get('branding', { attachments: true });
  } catch (e) {
    logger.warn('Could not find branding doc on CouchDB: %o', e);
    return;
  }
};

const getName = (doc) => (doc && doc.title) || 'CHT';

const readImageFile = async (path) => {
  const data = await promisify(fs.readFile)(path, {});
  return Buffer.from(data);
};

const loadImageAttachment = (doc, prop) => {
  const name = doc && doc.resources && doc.resources[prop];
  if (name) {
    const image = doc._attachments[name];
    if (image) {
      return {
        data: image.data,
        contentType: image.content_type
      };
    }
  }
};

const getLogo = async (doc) => {
  let image = loadImageAttachment(doc, 'logo');
  if (!image) {
    const data = await readImageFile(DEFAULT_LOGO_PATH);
    image = {
      data: data.toString('base64'),
      contentType: 'image/svg+xml'
    };
  }
  return getInlineImage(image);
};

const getIcon = (doc) => (doc && doc.resources && doc.resources.icon) || 'icon.png';

const getBranding = async () => {
  const doc = await getBrandingDoc();
  const logo = await getLogo(doc);
  return {
    name: getName(doc),
    logo: logo,
    icon: getIcon(doc),
    doc: doc
  };
};

const getFavicon = async () => {
  const doc = await getBrandingDoc();
  const image = loadImageAttachment(doc, 'favicon');
  if (image) {
    image.data = Buffer.from(image.data, 'base64');
    return image;
  }
  const data = await readImageFile(DEFAULT_FAVICON_PATH);
  return {
    data,
    contentType: 'image/x-icon'
  };
};

module.exports = {
  get: getBranding,
  getFavicon: getFavicon
};
