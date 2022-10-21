const config = require('../config');
const db = require('../db');
const contactTypeUtils = require('@medic/contact-types-utils');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);

const NAME = 'create_user_for_contacts';

const USER_CREATION_STATUS = {
  // PENDING - Set by webapp while waiting for sync to complete
  READY: 'READY', // Ready to be replaced
  COMPLETE: 'COMPLETE', // The new user has been created
  ERROR: 'ERROR', // The new user could not be created
};

const USERNAME_COLLISION_LIMIT = 10;
const USERNAME_COLLISION_MAX = 100;
const USERNAME_SUFFIX_BASE_LENGTH = 4;

const getNewContact = (contactId) => {
  if (!contactId) {
    return Promise.reject(new Error('No id was provided for the new replacement contact.'));
  }
  return people.getOrCreatePerson(contactId);
};

/**
 * Returns the length of the numerical suffix that will be appended to the end of the username. If there are collisions
 * with existing usernames, the suffix length will increase by 1 digit for every USERNAME_COLLISION_LIMIT collisions.
 * @param {number} collisionCount the number of collisions that have occurred trying to generate this username
 * @returns {number} the number of digits to use in the suffix
 */
const getSuffixLength = (collisionCount) =>
  Math.floor(collisionCount / USERNAME_COLLISION_LIMIT) + USERNAME_SUFFIX_BASE_LENGTH;

const getRandomSuffix = (collisionCount) => {
  const suffixLength = getSuffixLength(collisionCount);
  return Math
    .random()
    .toString()
    .substring(2, suffixLength + 2)
    .padStart(suffixLength, '0');
};

/**
 * Generates a random valid username based on the given contact name. The username will begin with the normalized
 * version of the contact name (lowercase, no spaces, only alphanumeric characters) and end with a random 4-digit
 * number.
 * @param {string} contactName the name of the contact
 * @param {number} collisionCount the number of collisions that have occurred trying to generate this username
 * @returns {string} the generated username
 */
const generateUsername = (contactName, collisionCount) => {
  const username = contactName
    .normalize('NFD') // split an accented letter in the base letter and the accent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, '-'); // separator

  return `${username}-${getRandomSuffix(collisionCount)}`;
};

const generateUniqueUsername = (contactName, collisionCount = 0) => {
  if(collisionCount > USERNAME_COLLISION_MAX) {
    throw new Error(`Could not generate a unique username for contact [${contactName}].`);
  }
  const username = generateUsername(contactName, collisionCount);
  return db.users
    .get(`org.couchdb.user:${username}`)
    .then(() => generateUniqueUsername(contactName, collisionCount + 1))
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
      return users.createUser(user, config.get('app_url'))
        .catch(err => {
          if (!err.message || typeof err.message === 'string') {
            throw err;
          }
          const message = err.message.message ? err.message.message : err.message;
          throw new Error(`Error creating new user: ${JSON.stringify(message)}`);
        });
    });
};

const replaceUser = async (originalContact, { username, replacementContactId }) => {
  try{
    const [newContact, originalUserSettings] = await Promise
      .all([
        getNewContact(replacementContactId),
        users.getUserSettings({ name: username }),
      ]);

    await createNewUser(originalUserSettings, newContact);
    await users.deleteUser(originalUserSettings.name);
    originalContact.user_for_contact.replace[username].status = USER_CREATION_STATUS.COMPLETE;
  } catch (e) {
    originalContact.user_for_contact.replace[username].status = USER_CREATION_STATUS.ERROR;
    return e;
  }
};

const getUsersToReplace = (originalContact) => {
  return Object
    .entries(originalContact.user_for_contact.replace)
    .filter(([, { status }]) => status === USER_CREATION_STATUS.READY)
    .map(([username, { replacement_contact_id }]) => ({ username, replacementContactId: replacement_contact_id }));
};

/**
 * Replace a user whose contact has been marked as ready to be replaced with a new user.
 */
module.exports = {
  name: NAME,
  asynchronousOnly: true,
  init: () => {
    const tokenLogin = config.get('token_login');
    if (!tokenLogin || !tokenLogin.enabled) {
      throw new Error(
        `Configuration error. Token login must be enabled to use the create_user_for_contacts transition.`
      );
    }

    const appUrl = config.get('app_url');
    if (!appUrl) {
      throw new Error(
        'Configuration error. The app_url must be defined to use the create_user_for_contacts transition.'
      );
    }
  },
  filter: (doc) => {
    const contactType = contactTypeUtils.getContactType(config.getAll(), doc);
    if (
      !contactType
      || !contactTypeUtils.isPersonType(contactType)
      || !doc.user_for_contact
      || !doc.user_for_contact.replace
    ) {
      return false;
    }

    return !!Object
      .values(doc.user_for_contact.replace)
      .find(({ status }) => status === USER_CREATION_STATUS.READY);
  },
  onMatch: change => {
    const usersToReplace = getUsersToReplace(change.doc);
    return Promise.all(usersToReplace.map(user => replaceUser(change.doc, user)))
      .then(errors => {
        errors = errors.filter(error => error);
        if (errors.length) {
          throw {
            changed: true,
            message: errors.map(error => error.message || JSON.stringify(error)).join(', '),
          };
        }
        return true;
      });
  }
};
