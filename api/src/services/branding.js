const fs = require('fs');
const { promisify } = require('util');
const path = require('path');

const db = require('../db');
const logger = require('../logger');

const DEFAULT_LOGO_PATH = path.join(__dirname, '..', 'resources', 'logo', 'medic-logo-light-full.svg');

const getInlineImage = (data, contentType) => `data:${contentType};base64,${data}`;

const getBrandingDoc = async () => {
  try {
    return await db.medic.get('branding', { attachments: true });
  } catch(e) {
    logger.warn('Could not find branding doc on CouchDB: %o', e);
    return;
  }
};

const getName = (doc) => (doc && doc.title) || 'CHT';

const getLogo = async (doc) => {
  let data;
  let contentType;
  if (doc) {
    const image = doc._attachments[doc.resources.logo];
    data = image.data;
    contentType = image.content_type;
  } else {
    const logo = await promisify(fs.readFile)(DEFAULT_LOGO_PATH, {});
    data = Buffer.from(logo).toString('base64');
    contentType = 'image/svg+xml';
  }
  return getInlineImage(data, contentType);
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

module.exports.get = getBranding;
