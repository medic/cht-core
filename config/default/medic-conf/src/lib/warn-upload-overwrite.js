const fs = require('./sync-fs');
const jsonDiff = require('json-diff');
const userPrompt = require('./user-prompt');
const crypto = require('crypto');
const url = require('url');
const path = require('path');
const log = require('./log');
const environment = require('./environment');
const { compare, GroupingReporter } = require('dom-compare');
const DOMParser = require('xmldom').DOMParser;
const request = require('request-promise-native');
const cache = new Map();

const question = 'You are trying to modify a configuration that has been modified since your last upload. Do you want to?';
const responseChoicesWithoutDiff = [
  'Overwrite the changes', 
  'Abort so that you can update the configuration'
];
const responseChoicesWithDiff = responseChoicesWithoutDiff.concat([ 'View diff' ]);

const getEnvironmentKey = () => {
  const parsed = new url.URL(environment.apiUrl);
  const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '/medic';
  return `${parsed.hostname}${path}`;
};

const getCompressibleTypes = async () => {
  const parsedUrl = new url.URL(environment.apiUrl);
  const configUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/api/couch-config-attachments`;
  try {
    if (cache.has('compressibleTypes')) {
      return cache.get('compressibleTypes');
    }
    const resp = await request.get({ url: configUrl, json: true });
    cache.set('compressibleTypes', resp.compressible_types);
    return resp.compressible_types;
  } catch(e) {
    if (e.statusCode === 404) {
      cache.set('compressibleTypes', null);
    } else {
      log.error(`Error trying to get couchdb config: ${e}`);
    }
    return null;
  }
};

const getHashFileName = () => {
  const parsed = new url.URL(environment.apiUrl);
  if (parsed.hostname === 'localhost') {
    return 'local.json';
  }
  return 'remote.json';
};

const getSnapshotsDir = () => path.join(environment.pathToProject, '.snapshots');

const getStoredHashes = () => {
  const snapshotsDir = getSnapshotsDir();
  if (!fs.exists(snapshotsDir)) {
    fs.mkdir(snapshotsDir);
  }

  const filePath = path.join(snapshotsDir, getHashFileName());
  if (fs.exists(filePath)) {
    try {
      return JSON.parse(fs.read(filePath).trim());
    } catch(e) {
      log.info('Error trying to read bookmark, continuing anyway', e);
    }
  }

  return {};
};

const getStoredHash = id => {
  const hashes = getStoredHashes();
  return hashes && hashes[id] && hashes[id][getEnvironmentKey()];
};

const updateStoredHash = (id, hash) => {
  const hashes = getStoredHashes();
  if (!hashes[id]) {
    hashes[id] = {};
  }
  hashes[id][getEnvironmentKey()] = hash;
  fs.write(path.join(getSnapshotsDir(), getHashFileName()), JSON.stringify(hashes, null, 2));
};

const couchDigest = content => 'md5-' + crypto.createHash('md5').update(content, 'binary').digest('base64');

const getXFormAttachment = doc => {
  const name = Object
    .keys(doc && doc._attachments || {})
    .find(name => name === 'xml' || (name.endsWith('.xml') && name !== 'model.xml'));
  return name;
};

const getFormHash = (doc, xml, properties) => {
  const xFormAttachmentName = getXFormAttachment(doc);
  const crypt = crypto.createHash('md5');
  crypt.update(xml, 'utf8');
  const customProperties = {};
  properties.forEach(key => {
    customProperties[key] = doc[key];
  });
  crypt.update(JSON.stringify(customProperties), 'utf8');
  if (doc._attachments) {
    Object.keys(doc._attachments).forEach(name => {
      if (name !== 'form.html' && name !== 'model.xml' && name !== xFormAttachmentName) {
        const attachment = doc._attachments[name];
        const digest = attachment.digest || couchDigest(attachment.data);
        crypt.update(digest, 'utf8');
      }
    });
  }
  return crypt.digest('base64');
};

const getDocHash = async (db, originalDoc) => {
  const doc = JSON.parse(JSON.stringify(originalDoc)); // clone doc
  delete doc._rev;
  delete doc._attachments;
  const crypt = crypto.createHash('md5');
  crypt.update(JSON.stringify(doc), 'utf8');
  const compressibleTypes = await getCompressibleTypes();
  const matchRegex = (pattern, type) => {
    const rx = new RegExp(pattern.trim());
    return rx.test(type);
  };
  if (originalDoc._attachments) {
    for (const attachmentName of Object.keys(originalDoc._attachments)) {
      const attachment = originalDoc._attachments[attachmentName];
      const attachmentCompressible = compressibleTypes ?
        compressibleTypes.split(',').some(c => matchRegex(c, attachment.content_type)) :
        true;
      if (attachmentCompressible) {
        const data = attachment.data ? attachment.data : await db.getAttachment(originalDoc._id, attachmentName);
        crypt.update(data);
      } else {
        crypt.update(attachment.digest || couchDigest(attachment.data), 'utf8');
      }
    }
  }
  return crypt.digest('base64');
};

const preUploadDoc = async (db, localDoc) => {
  let remoteDoc;

  try {
    remoteDoc = await db.get(localDoc._id);
  } catch (e) {
    if (e.status === 404) {
      // The form doesn't exist on the server so we know we're not overwriting anything
      return Promise.resolve(true);
    } else {
      // Unexpected error, we report it then quit
      log.trace('Trying to fetch remote doc', e);
      throw new Error(`Unable to fetch doc with id ${localDoc._id}, returned status code = ${e.status}`);
    }
  }

  const remoteHash = await getDocHash(db, remoteDoc);
  const localHash = await getDocHash(db, localDoc);
  if (localHash === remoteHash) {
    // no changes to this form - do not upload
    return Promise.resolve(false);
  }

  const storedHash = getStoredHash(localDoc._id);
  if (storedHash === remoteHash) {
    // changes made locally based on common starting point - upload
    return Promise.resolve(true);
  }

  const diff = jsonDiff.diffString(remoteDoc, localDoc);

  if (diff) {
    let index = userPrompt.keyInSelect(responseChoicesWithDiff, question, {cancel: false});
    if (index === 2) { // diff
      log.info(diff);
      index = userPrompt.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    }
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  } else {
    // attachments or properties updated - prompt for overwrite or abort
    const index = userPrompt.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  }

  // user chose to overwrite remote form - upload
  return Promise.resolve(true);
};

const postUploadDoc = async (db, doc) => updateStoredHash(doc._id, await getDocHash(db, doc));

const preUploadForm = async (db, localDoc, localXml, properties) => {
  let remoteXml;
  let remoteHash;
  try {
    const remoteDoc = await db.get(localDoc._id);
    const attachmentName = getXFormAttachment(remoteDoc);
    if (!attachmentName) {
      // does not exist so ok to overwrite
      return Promise.resolve(true);
    }
    const buffer = await db.getAttachment(localDoc._id, attachmentName);
    remoteXml = buffer.toString('utf8');
    remoteHash = getFormHash(remoteDoc, remoteXml, properties);
  } catch (e) {
    if (e.status === 404) {
      // The form doesn't exist on the server so we know we're not overwriting anything
      return Promise.resolve(true);
    } else {
      // Unexpected error, we report it then quit
      log.trace('Trying to fetch remote xml', e);
      throw new Error(`Unable to fetch xml attachment of doc with id ${localDoc._id}, returned status code = ${e.status}`);
    }
  }

  const localHash = getFormHash(localDoc, localXml, properties);
  if (localHash === remoteHash) {
    // no changes to this form - do not upload
    return Promise.resolve(false);
  }

  const storedHash = getStoredHash(localDoc._id);
  if (storedHash === remoteHash) {
    // changes made locally based on common starting point - upload
    return Promise.resolve(true);
  }

  const localDom = new DOMParser().parseFromString(localXml);
  const remoteDom = new DOMParser().parseFromString(remoteXml);

  const diff = compare(localDom, remoteDom);
  const hasNoDiff = diff.getResult();
  if (hasNoDiff) {
    // attachments or properties updated - prompt for overwrite or abort
    const index = userPrompt.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  } else {
    let index = userPrompt.keyInSelect(responseChoicesWithDiff, question, {cancel: false});
    if (index === 2) { // diff
      log.info(GroupingReporter.report(diff));

      index = userPrompt.keyInSelect(responseChoicesWithoutDiff, question, {cancel: false});
    }
    if (index === 1) { // abort
      throw new Error('configuration modified');
    }
  }

  // user chose to overwrite remote form - upload
  return Promise.resolve(true);
};

const postUploadForm = (doc, xml, properties) => updateStoredHash(doc._id, getFormHash(doc, xml, properties));

module.exports = {
  preUploadDoc,
  postUploadDoc,
  preUploadForm,
  postUploadForm
};
