const { expect } = require('chai');
const { promisify } = require('util');
const { readFile } = require('fs');
const path = require('path');

const utils = require('@utils');

const DEFAULT_MANIFEST = {
  start_url: './',
  name: 'CHT',
  display: 'standalone',
  background_color: '#323232',
  theme_color: '#323232',
  icons: [
    { src: '/img/icon.png', sizes: 'any', purpose: 'any' },
    { src: '/favicon.ico', sizes: '32x32', type: 'image' }
  ]
};

const addAttachment = async (doc, label, path, name, type) => {
  doc.resources[label] = name;
  const content = await promisify(readFile)(path);
  doc._attachments[name] = {
    data: new Buffer.from(content).toString('base64'),
    content_type: type
  };
};

const updateBranding = async (doc) => {
  const waitForLogs = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
  if (!doc) {
    try {
      await utils.deleteDoc('branding');
    } catch(err) {
      if (err.statusCode === 404) {
        return; // already not there - success!
      }
      throw err;
    }
  } else {
    await utils.saveDoc(doc);
  }
  await waitForLogs.promise;
};

const assertIconsExist = async (manifest) => {
  for (const icon of manifest.icons) {
    console.log('Asserting that icon src exists: ' + icon.src);
    await utils.request(icon.src); // will throw if 404
  }
};

const getBrandingDoc = async () => {
  try {
    return await utils.getDoc('branding');
  } catch (e) {
    if (e.statusCode === 404) {
      return { _id: 'branding' };
    }
    throw e;
  }
};

describe('manifest.json', () => {

  it('works without branding doc', async () => {
    await updateBranding();
    const response = await utils.request('/manifest.json');
    expect(response).to.deep.equal(DEFAULT_MANIFEST);
    await assertIconsExist(response);
  });

  it('works with custom branding doc', async () => {
    const branding = await getBrandingDoc();
    branding.title = 'PWA4LIFE';
    branding.resources = {};
    branding._attachments = {};
    const logoName = 'icon-chw-selected.svg';
    const faviconName = 'favicon.ico';
    const logoPath = path.join(__dirname, '../../../../webapp/src/img', logoName);
    const faviconPath = path.join(__dirname, '../../../../api/src/resources/ico', faviconName);
    await addAttachment(branding, 'logo', logoPath, logoName, 'image/svg+xml');
    await addAttachment(branding, 'favicon', faviconPath, faviconName, 'image/x-icon');
    await updateBranding(branding);
    const response = await utils.request('/manifest.json');
    const expected = {
      start_url: './',
      name: 'PWA4LIFE',
      display: 'standalone',
      background_color: '#323232',
      theme_color: '#323232',
      icons: [
        {
          src: '/img/icon.png',
          sizes: 'any',
          purpose: 'any'
        },
        {
          src: '/favicon.ico',
          sizes: '32x32',
          type: 'image'
        }
      ]
    };
    expect(response).to.deep.equal(expected);
    await assertIconsExist(response);
  });

});
