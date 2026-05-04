const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const resources = require('../resources');
const brandingService = require('./branding');

const webappPath = resources.webappPath;
const MANIFEST_OUTPUT_PATH = path.join(webappPath, 'manifest.json');

const writeJson = async (branding) => {
  const manifest = {
    start_url: './',
    name: branding.name,
    display: 'standalone',
    background_color: '#323232',
    theme_color: '#323232',
    icons: [
      {
        src: `/img/${branding.icon}`,
        sizes: 'any',
        purpose: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image',
      },
    ],
  };
  const json = JSON.stringify(manifest, null, 2);
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
