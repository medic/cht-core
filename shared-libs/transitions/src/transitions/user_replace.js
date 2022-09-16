const environment = require('../environment');
const transitionUtils = require('./utils');
const config = require('../config');
const db = require('../db');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);
const search = require('@medic/search')(Promise, db.medic);

const NAME = 'user_replace';

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

const getUserSettings = (contact_id) => {
  return users.getUserSettings({ contact_id })
    .then(userSettings => {
      if (!userSettings.roles || !userSettings.roles.length) {
        throw new Error(`User [${userSettings._id}] does not have any roles.`);
      }
      return userSettings;
    });
};

const validateContactParents = (originalContact, newContact) => {
  if (originalContact.parent._id !== newContact.parent._id) {
    throw new Error(`The replacement contact must have the same parent as the original contact.`);
  }
};

const validateNewContact = ({ _id, phone, name }) => {
  if (!phone) { // TODO - validate phone number
    throw new Error(`Replacement contact [${_id}] must have a phone number.`);
  }
  if (!name) {
    throw new Error(`Replacement contact [${_id}] must have a name.`);
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
        .catch(err => { // TODO - may not need this if we have the phone validation...
          throw new Error(`Error creating new user: ${JSON.stringify(err.message)}`);
        });
    });
};

// const updateOriginalUser = originalUserSettings => {
//   throw new Error(`Jkuester [${JSON.stringify(originalUserSettings)}].`);
//   const updatedUser = {
//
//   }
//
//
//   const updatedUser = Object.assign({}, originalUser, { shouldLogoutNextSync: true, replaced: true });
//   return users().updateUser(originalUser.username, updatedUser, true, environment.apiUrl);
// };
// db.medic.put(Object.assign({}, originalUser, { shouldLogoutNextSync: true, replaced: true }));

const getReportsToReparent = (contactId, timestamp) => {
  const filters = {
    date: { from: timestamp + 1, },
    contact: contactId,
  };
  // TODO Need to execute in batches....
  const options = {
    limit: 50,
    skip: 0,
  };
  return search('reports', filters, options)
    .then(({ docIds }) => db.medic.allDocs({
      keys: docIds,
      include_docs: true
    }))
    .then(({ rows }) => rows.map(({ doc }) => doc));
};

const reparentReports = ({ reported_date, fields: { original_contact_uuid, new_contact_uuid } }) => {
  return getReportsToReparent(original_contact_uuid, reported_date)
    .then(reports => {
      if (reports.length === 0) {
        return;
      }

      const reparentedReports = reports.map(report => {
        const reparentedReport = Object.assign({}, report);
        reparentedReport.contact._id = new_contact_uuid;
        return reparentedReport;
      });
      return db.medic.bulkDocs(reparentedReports);
    });
};

const replaceUser = (replaceUserDoc) => {
  validateReplaceUserDoc(replaceUserDoc);
  const { original_contact_uuid, new_contact_uuid } = replaceUserDoc.fields;
  return Promise.all([
    getContact(original_contact_uuid),
    getContact(new_contact_uuid),
    getUserSettings(original_contact_uuid),
  ]).then(([originalContact, newContact, originalUserSettings]) => {
    validateContactParents(originalContact, newContact);
    validateNewContact(newContact);
    return Promise.all([
      createNewUser(originalUserSettings, newContact),
      // TODO Handle the original user
      // updateOriginalUser(originalUserSettings)
    ]);
  }).then(() => reparentReports(replaceUserDoc));
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
