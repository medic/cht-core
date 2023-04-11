const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const _ = require('lodash');

const environment = require('../environment');
const brandingService = require('./branding');

const webappPath = environment.webappPath;
const MANIFEST_OUTPUT_PATH = path.join(webappPath, 'manifest.json');
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'manifest.json');

const writeJson = async (branding) => {
  const file = await promisify(fs.readFile)(TEMPLATE_PATH, { encoding: 'utf-8' });
  const template = _.template(file);
  const json = template({ branding });
  return await promisify(fs.writeFile)(MANIFEST_OUTPUT_PATH, json);
};

const writeIcon = async (doc) => {
  const name = doc && doc.resources && doc.resources.icon;
  const attachment = name && doc._attachments[name];
  if (attachment) {
    const contents = Buffer.from(attachment.data, 'base64');
    const outputPath = path.join(webappPath, 'img', name);
    await promisify(fs.writeFile)(outputPath, contents);
  }
};

module.exports.generate = async () => {
  const branding = await brandingService.get();
  await writeJson(branding);
  await writeIcon(branding.doc);
};
