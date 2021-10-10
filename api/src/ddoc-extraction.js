const _ = require('lodash');
const db = require('./db');
const environment = require('./environment');
const logger = require('./logger');

const BUNDLED_DDOCS = [
  { attachmentId: 'ddocs/medic.json', targetDb: db.medic },
  { attachmentId: 'ddocs/sentinel.json', targetDb: db.sentinel },
  { attachmentId: 'ddocs/users-meta.json', targetDb: db.medicUsersMeta },
  { attachmentId: 'ddocs/logs.json', targetDb: db.medicLogs },
];
const SERVER_DDOC_ID = '_design/medic';
const CLIENT_DDOC_ID = '_design/medic-client';

const getCompiledDdocs = (attachmentId) => {
  return db.medic
    .getAttachment(SERVER_DDOC_ID, attachmentId)
    .then(result => JSON.parse(result.toString()).docs)
    .catch(err => {
      if (err.status === 404) {
        return [];
      }
      throw err;
    });
};

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

const extractCompiledDdoc = (bundle, newDdoc, deployInfo) => {
  // update the deploy info in the medic-client ddoc
  if (newDdoc._id === CLIENT_DDOC_ID && (deployInfo || newDdoc.deploy_info)) {
    newDdoc.deploy_info = deployInfo;
  }

  return bundle.targetDb
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

const extractFromCompiledDocs = (bundle, deployInfo) => {
  return getCompiledDdocs(bundle.attachmentId)
    .then(ddocs => {
      if (!ddocs.length) {
        return [];
      }
      return Promise.all(ddocs.map(ddoc => extractCompiledDdoc(bundle, ddoc, deployInfo)));
    })
    .then(updated => {
      updated = _.compact(updated);
      if (updated.length) {
        logger.info(`Updating docs: ${_.map(updated, '_id').join(', ')}`);
        return bundle.targetDb.bulkDocs({ docs: updated });
      }
    });

};

const extractDdocs = deployInfo => {
  return Promise.all(BUNDLED_DDOCS.map(bundle => extractFromCompiledDocs(bundle, deployInfo)));
};

module.exports = {
  run: () => {
    return db.medic.get(SERVER_DDOC_ID).then(ddoc => {
      environment.setDeployInfo(ddoc.deploy_info);
      return extractDdocs(ddoc.deploy_info);
    });
  }
};
