const db = require('./libs/db');
const dataContext = require('./libs/data-context');
const { ValidationError } = require('./errors');
const { BULK_OPERATIONS } = require('@medic/constants');
const { Contact, Qualifier } = require('@medic/cht-datasource');

const { ACTIONS } = BULK_OPERATIONS;

// contacts_by_depth returns one row per contact in the subtree, each carrying its uuid and shortcode.
const getSubtree = (id) => db.medic.query('medic/contacts_by_depth', { key: [id] });

const getSubjectKeys = (rows) => {
  const keys = [];
  rows.forEach(row => {
    keys.push(row.id);
    if (row.value?.shortcode) {
      keys.push(row.value.shortcode);
    }
  });
  return keys;
};

// Match reports by uuid and shortcode, so a report recording only the shortcode is not missed.
const getReportIds = async (subjectKeys) => {
  const result = await db.medic.query('medic-client/reports_by_subject', { keys: subjectKeys });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

// Surviving places whose primary contact is being deleted; the current id guards a since-changed ref.
const getPrimaryContactClears = async (contactIds) => {
  const result = await db.medic.query('medic/contacts_by_primary_contact', { keys: contactIds });
  // Seeded with the deleted ids so those rows are skipped; grows as surviving places are collected.
  const seen = new Set(contactIds);
  const operations = [];
  result.rows.forEach(row => {
    if (seen.has(row.id)) {
      return;
    }
    seen.add(row.id);
    operations.push({ id: row.id, current_contact_id: row.key });
  });
  return operations;
};

// A place is a user's `facility_id` and a person can be their `contact_id`; either breaks the user.
const getLinkedUserIds = async (contactIds) => {
  const result = await db.users.query('users/users_by_field', {
    keys: contactIds.flatMap(id => [ [ 'facility_id', id ], [ 'contact_id', id ] ]),
  });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

const assertContactExists = (contact, contactId) => {
  if (!contact) {
    throw new ValidationError(`contact '${contactId}' not found`);
  }
};

// Deleting a contact whose user account would be left behind needs saying so explicitly, because it
// leaves someone unable to log in.
const assertUsersMayGo = (userIds, deleteUsers) => {
  if (userIds.length && !deleteUsers) {
    throw new ValidationError(
      `${userIds.length} user(s) are linked to contacts in this hierarchy. ` +
        `Set delete_users=true (requires can_delete_users) to remove them.`
    );
  }
};

/**
 * Checks that the delete can legally run, against the documents as they are now. It is assumed that the identified
 * contact has already been confirmed to exist.
 * @param {Object} params
 * @param {string} params.contact_id - the target contact id
 * @param {boolean} [params.delete_users] - also remove users linked to the deleted contacts
 * @throws {ValidationError} when linked users would be left behind and `delete_users` was not set
 */
const validate = async ({ contact_id: contactId, delete_users: deleteUsers }) => {
  if (deleteUsers) {
    return;
  }

  const subtree = await getSubtree(contactId);
  assertUsersMayGo(await getLinkedUserIds(subtree.rows.map(row => row.id)), deleteUsers);
};

/**
 * Gathers everything a contact-hierarchy delete touches, validating as it goes: the queries it needs
 * are the queries the checks need, so it costs nothing to be sure the operation is still legal.
 * @param {Object} params
 * @param {string} params.contact_id - the target contact id
 * @param {boolean} [params.delete_users] - also remove users linked to the deleted contacts
 * @returns {Promise<Object>} the summary of changes and the actions to run, in execution order
 * @throws {ValidationError} when the delete is no longer legal
 */
const plan = async ({ contact_id: contactId, delete_users: deleteUsers }) => {
  const getContact = dataContext.bind(Contact.v1.get);
  assertContactExists(await getContact(Qualifier.byUuid(contactId)), contactId);

  const subtree = await getSubtree(contactId);
  const contactIds = subtree.rows.map(row => row.id);

  const [ reportIds, setContactOperations, userIds ] = await Promise.all([
    getReportIds(getSubjectKeys(subtree.rows)),
    getPrimaryContactClears(contactIds),
    getLinkedUserIds(contactIds),
  ]);
  assertUsersMayGo(userIds, deleteUsers);

  const userOperations = deleteUsers ? userIds.map(userId => ({ id: userId })) : [];
  const summary = {
    delete: { contacts: contactIds.length, reports: reportIds.length },
    'set-contact': { places: setContactOperations.length },
    'delete-user': userOperations.length,
  };

  // Delete last, so contacts are removed only after the references to them are cleared.
  const actions = [
    { action: ACTIONS.SET_CONTACT, operations: setContactOperations },
    { action: ACTIONS.DELETE_USER, operations: userOperations },
    { action: ACTIONS.DELETE, operations: [ ...reportIds, ...contactIds ].map(docId => ({ id: docId })) },
  ];

  return { summary, actions };
};

module.exports = {
  validate,
  plan,
};
