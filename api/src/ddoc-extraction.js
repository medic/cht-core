const _ = require('lodash');
const db = require('./db');
const logger = require('./logger');
const DDOC_ATTACHMENT_ID = 'ddocs/compiled.json';
const SERVICEWORKER_ATTACHMENT_NAME = 'js/service-worker.js';
const SWMETA_DOC_ID = 'service-worker-meta';
const SERVER_DDOC_ID = '_design/medic';
const CLIENT_DDOC_ID = '_design/medic-client';
const environment = require('./environment');

const getCompiledDdocs = () => db.medic
  .getAttachment(SERVER_DDOC_ID, DDOC_ATTACHMENT_ID)
  .then(result => JSON.parse(result.toString()).docs)
  .catch(err => {
    if (err.status === 404) {
      return [];
    }
    throw err;
  });

const areAttachmentsEqual = (oldDdoc, newDdoc) => {
  if (!oldDdoc._attachments && !newDdoc._attachments) {
    // no attachments found
    return true;
  }
  if (!oldDdoc._attachments || !newDdoc._attachments) {
    // one ddoc has attachments and the other doesn't
    return false;
  }
  if (
    Object.keys(oldDdoc._attachments).length !==
    Object.keys(newDdoc._attachments).length
  ) {
    // one ddoc has more attachments than the other
    return false;
  }
  // check all attachment data
  return Object.keys(oldDdoc._attachments).every(name => {
    return (
      newDdoc._attachments[name] &&
      newDdoc._attachments[name].data === oldDdoc._attachments[name].data
    );
  });
};

const extractCompiledDdoc = (newDdoc, deploy_info) => {
  // update the deploy info in the medic-client ddoc
  if (newDdoc._id === CLIENT_DDOC_ID && (deploy_info || newDdoc.deploy_info)) {
    newDdoc.deploy_info = deploy_info;
  }

  return db.medic
    .get(newDdoc._id, { attachments: true })
    .then(oldDdoc => {
      // set the rev so we can update if necessary
      newDdoc._rev = oldDdoc && oldDdoc._rev;

      if (!oldDdoc) {
        // this is a new ddoc - definitely install it
        return newDdoc;
      }
      if (!areAttachmentsEqual(oldDdoc, newDdoc)) {
        // attachments have been updated - install it
        return newDdoc;
      }

      if (newDdoc._attachments) {
        // we've checked attachment data so we know they're identical where it counts
        oldDdoc._attachments = newDdoc._attachments;
      }

      if (_.isEqual(oldDdoc, newDdoc)) {
        return;
      }
      return newDdoc;
    })
    .catch(err => {
      if (err.status === 404) {
        return newDdoc;
      }
      throw err;
    });
};

const extractFromCompiledDocs = deploy_info => {
  return getCompiledDdocs()
    .then(ddocs => {
      if (!ddocs.length) {
        return [];
      }
      return Promise.all(ddocs.map(ddoc => extractCompiledDdoc(ddoc, deploy_info)));
    })
    .then(updated => _.compact(updated));
};

// We need client-side logic to trigger a service worker update when a cached resource changes.
// Since service-worker.js contains a hash of every cached resource, watching it for changes is sufficient to detect a
// required update.
// To this end, copy the hash of service-worker.js and store it in a new doc (SWMETA_DOC_ID) which replicates to
// clients.
// The intention is that when this doc changes, clients will refresh their cache.
const extractServiceWorkerMetaDoc = ddoc => {
  const attachment = ddoc._attachments && ddoc._attachments[SERVICEWORKER_ATTACHMENT_NAME];
  const attachmentDigest = attachment && attachment.digest;
  if (!attachmentDigest) {
    return;
  }

  return db.medic
    .get(SWMETA_DOC_ID)
    .then(doc => {
      if (doc.digest !== attachmentDigest) {
        doc.digest = attachmentDigest;
        return doc;
      }
    })
    .catch(err => {
      if (err.status === 404) {
        return { _id: SWMETA_DOC_ID, digest: attachmentDigest };
      }
      throw err;
    });
};

const extractFromDdoc = ddoc => {
  environment.setDeployInfo(ddoc.deploy_info);
  return Promise.all([
    extractFromCompiledDocs(ddoc.deploy_info),
    extractServiceWorkerMetaDoc(ddoc),
  ]).then(results => _.compact(_.flatten(results)));
};

module.exports = {
  run: () => db.medic
    .get(SERVER_DDOC_ID)
    .then(extractFromDdoc)
    .then(docs => {
      if (docs.length) {
        logger.info(`Updating docs: ${_.map(docs, '_id').join(', ')}`);
        return db.medic.bulkDocs({ docs: docs });
      }
    }),
};
