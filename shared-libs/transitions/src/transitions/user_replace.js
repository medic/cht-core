const config = require('../config');
const db = require('../db');
const environment = require('../environment');
const Search = require('../lib/search');
const transitionUtils = require('./utils');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);

const NAME = 'user_replace';
const REPARENT_BATCH_SIZE = 100;

const validateReplaceUserDoc = ({ reported_date, fields: { original_contact_uuid, new_contact_uuid } }) => {
  if (!reported_date) {
    throw new Error('The reported_date field must be populated on the replace_user report.');
  }
  if (!original_contact_uuid) {
    throw new Error('The original_contact_uuid field must be populated on the replace_user report.');
  }
  if (!new_contact_uuid) {
    throw new Error('The new_contact_uuid field must be populated on the replace_user report.');
  }
};

const validateContact = (contact) => {
  if (!contact.parent || !contact.parent._id) {
    throw new Error(`Contact [${contact._id}] does not have a parent.`);
  }
  return contact;
};

const getContact = (contactId) => people.getOrCreatePerson(contactId)
  .then(contact => validateContact(contact));

const validateContactParents = (originalContact, newContact) => {
  if (originalContact.parent._id !== newContact.parent._id) {
    throw new Error(`The replacement contact must have the same parent as the original contact.`);
  }
};

const generateUsername = (contactName) => {
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const username = contactName.normalize('NFD') // split an accented letter in the base letter and the accent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, '-'); // separator

  return `${username}-${randomNum}`;
};

const generateUniqueUsername = (contactName) => {
  const username = generateUsername(contactName);
  return db.users.get(`org.couchdb.user:${username}`)
    .then(() => generateUniqueUsername(contactName))
    .catch(error => {
      if (error.status === 404) {
        // this username is available
        return username;
      }
      throw error;
    });
};

const createNewUser = ({ roles }, { _id, name, phone, parent }) => {
  if (!name) {
    throw new Error(`Replacement contact [${_id}] must have a name.`);
  }
  return generateUniqueUsername(name)
    .then(username => {
      const user = {
        username,
        token_login: true,
        roles,
        phone,
        place: parent._id,
        contact: _id,
        fullname: name,
      };
      return users.createUser(user, environment.apiUrl)
        .catch(err => {
          if (!err.message || typeof err.message === 'string') {
            throw err;
          }
          const message = err.message.message ? err.message.message : err.message;
          throw new Error(`Error creating new user: ${JSON.stringify(message)}`);
        });
    });
};

const getReportIdsToReparent = (contactId, timestamp, docsReparented) => {
  const filters = {
    date: { from: timestamp + 1, },
    contact: contactId,
  };
  const options = {
    limit: REPARENT_BATCH_SIZE,
    skip: docsReparented,
  };
  return Search.execute('reports', filters, options).then(({ docIds }) => docIds);
};

const getReports = (keys) => db.medic.allDocs({ keys, include_docs: true })
  .then(({ rows }) => rows.map(({ doc }) => doc));

const reparentReports = (newContactId, reports) => {
  if(!reports.length) {
    return;
  }
  reports.forEach(report => report.contact._id = newContactId);
  return db.medic.bulkDocs(reports);
};

const reparentReportsFromReplacedUser = (replaceUserDoc, docsReparented = 0) => {
  const {
    reported_date,
    fields: { original_contact_uuid, new_contact_uuid }
  } = replaceUserDoc;
  return getReportIdsToReparent(original_contact_uuid, reported_date, docsReparented)
    .then(reportIds => {
      if(!reportIds.length) {
        return;
      }
      return getReports(reportIds)
        .then(reports => reparentReports(new_contact_uuid, reports))
        .then(() => {
          if (reportIds.length === REPARENT_BATCH_SIZE) {
            return reparentReportsFromReplacedUser(replaceUserDoc, docsReparented + REPARENT_BATCH_SIZE);
          }
        });
    });
};

const replaceUser = (replaceUserDoc) => {
  return Promise.resolve()
    .then(() => validateReplaceUserDoc(replaceUserDoc))
    .then(() => {
      const { original_contact_uuid, new_contact_uuid } = replaceUserDoc.fields;
      return  Promise
        .all([
          getContact(original_contact_uuid),
          getContact(new_contact_uuid),
          users.getUserSettings({ contact_id: original_contact_uuid }),
        ])
        .then(([originalContact, newContact, originalUserSettings]) => {
          validateContactParents(originalContact, newContact);
          return createNewUser(originalUserSettings, newContact)
            .then(() => reparentReportsFromReplacedUser(replaceUserDoc))
            .then(() => users.deleteUser(originalUserSettings.name));
        });
    });
};

/**
 * Replace a contact with a new contact.
 */
module.exports = {
  name: NAME,
  init: () => {
    const tokenLogin = config.get('token_login');
    if (!tokenLogin || !tokenLogin.enabled) {
      throw new Error(`Configuration error. Token login must be enabled to use the user_replace transition.`);
    }
  },
  filter: (doc, info = {}) => {
    return doc.form === 'replace_user'
      && !transitionUtils.hasRun(info, NAME);
  },
  onMatch: change => {
    return replaceUser(change.doc)
      .then(() => {
        return true;
      })
      .catch(err => {
        err.changed = true;
        throw err;
      });
  }
};
