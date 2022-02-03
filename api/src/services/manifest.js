const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const _ = require('lodash');

const db = require('../db');
const logger = require('../logger');

const FILEPATH = path.join(__dirname, '..', 'templates', 'manifest.json');
let templateCache;

// TODO this is copied and pasted from controllers/login.js - make a branding service?
const getInlineImage = (data, contentType) => `data:${contentType};base64,${data}`;

const getDefaultBranding = async () => {
  const logoPath = path.join(__dirname, '..', 'resources', 'logo', 'medic-logo-light-full.svg');
  const logo = await promisify(fs.readFile)(logoPath, {});
  const data = Buffer.from(logo).toString('base64');
  return {
    name: 'Medic',
    logo: getInlineImage(data, 'image/svg+xml')
  };
};

const getBranding = async () => {
  try {
    const doc = await db.medic.get('branding', { attachments: true });
    const image = doc._attachments[doc.resources.logo];
    return {
      name: doc.title,
      logo: getInlineImage(image.data, image.content_type)
    };
  } catch(e) {
    logger.warn('Could not find branding doc on CouchDB: %o', e);
    return await getDefaultBranding();
  }
};

const getTemplate = () => {
  if (templateCache) {
    return templateCache;
  }
  templateCache = promisify(fs.readFile)(FILEPATH, { encoding: 'utf-8' })
    .then(file => _.template(file));
  return templateCache;
};

const render = async (branding) => {
  const template = await getTemplate();
  return template({ branding });
};

module.exports.render = async () => {
  const branding = await getBranding();
  return await render(branding);
};
