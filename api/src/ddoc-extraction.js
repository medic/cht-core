const _ = require('underscore'),
      db = require('./db-pouch'),
      DDOC_ATTACHMENT_ID = 'ddocs/compiled.json',
      APPCACHE_ATTACHMENT_NAME = 'manifest.appcache',
      APPCACHE_DOC_ID = 'appcache',
      SERVER_DDOC_ID = '_design/medic',
      SETTINGS_DOC_ID = 'settings';

const getCompiledDdocs = () => {
  return db.medic.getAttachment(SERVER_DDOC_ID, DDOC_ATTACHMENT_ID)
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
  if (Object.keys(oldDdoc._attachments).length !== Object.keys(newDdoc._attachments).length) {
    // one ddoc has more attachments than the other
    return false;
  }
  // check all attachment data
  return Object.keys(oldDdoc._attachments).every(name => {
    return newDdoc._attachments[name] &&
           newDdoc._attachments[name].data === oldDdoc._attachments[name].data;
  });
};

const isUpdated = newDdoc => {
  return db.medic.get(newDdoc._id, { attachments: true })
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

      // delete the obsolete app_settings so the docs will be comparable
      delete oldDdoc.app_settings;

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

const findUpdatedDdocs = () => {
  return getCompiledDdocs()
    .then(ddocs => {
      if (!ddocs.length) {
        return [];
      }
      return Promise.all(ddocs.map(ddoc => isUpdated(ddoc)));
    })
    .then(updated => _.compact(updated));
};

const findUpdatedAppcache = ddoc => {
  const attachment = ddoc._attachments && ddoc._attachments[APPCACHE_ATTACHMENT_NAME];
  const digest = attachment && attachment.digest;
  if (!digest) {
    return;
  }
  return db.medic.get(APPCACHE_DOC_ID)
    .then(doc => {
      if (doc.digest !== digest) {
        doc.digest = digest;
        return doc;
      }
    })
    .catch(err => {
      if (err.status === 404) {
        // create new appcache doc
        return { _id: APPCACHE_DOC_ID, digest: digest };
      }
      throw err;
    });
};

// converts old style app_settings on ddoc to new separate doc
const extractAppSettings = ddoc => {
  if (!ddoc.app_settings) {
    // the app_settings have already been converted - ignore
    return [];
  }
  return db.medic.get(SETTINGS_DOC_ID)
    .catch(err => {
      if (err.status === 404) {
        return { _id: SETTINGS_DOC_ID };
      }
      throw err;
    })
    .then(doc => {
      doc.settings = ddoc.app_settings;
      delete ddoc.app_settings;
      return [ doc, ddoc ];
    });
};

const findUpdated = ddoc => {
  return Promise.all([
    extractAppSettings(ddoc),
    findUpdatedDdocs(),
    findUpdatedAppcache(ddoc)
  ]).then(results => _.compact(_.flatten(results)));
};

module.exports = {
  run: () => {
    return db.medic.get(SERVER_DDOC_ID)
      .then(findUpdated)
      .then(docs => {
        if (docs.length) {
          console.log('Updating docs: ' + _.pluck(docs, '_id').join(', '));
          return db.medic.bulkDocs({ docs: docs });
        }
      });
  }
};
