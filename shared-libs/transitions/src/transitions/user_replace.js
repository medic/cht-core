const config = require('../config');
const db = require('../db');
const environment = require('../environment');
const contactTypeUtils = require('@medic/contact-types-utils');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);

const NAME = 'user_replace';

const getNewContact = (contactId) => {
  if(!contactId) {
    throw new Error('No id was provided for the new replacement contact.');
  }
  return people.getOrCreatePerson(contactId);
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

const replaceUser = (originalContact) => {
  return Promise.resolve()
    .then(() => {
      const { _id, replaced: { by } } = originalContact;
      return  Promise
        .all([
          getNewContact(by),
          users.getUserSettings({ contact_id: _id }),
        ])
        .then(([newContact, originalUserSettings]) => {
          return createNewUser(originalUserSettings, newContact)
            .then(() => users.deleteUser(originalUserSettings.name))
            .then(() => originalContact.replaced.status = 'COMPLETE');
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
  filter: (doc) => {
    const contactType = contactTypeUtils.getContactType(config.getAll(), doc);
    if (!contactType || !contactTypeUtils.isPersonType(contactType)) {
      return false;
    }

    return doc.replaced && doc.replaced.status === 'READY';
  },
  onMatch: change => {
    return replaceUser(change.doc)
      .then(() => {
        return true;
      })
      .catch(err => {
        change.doc.replaced.status = 'ERROR';
        err.changed = true;
        throw err;
      });
  }
};
