const db = require('../db');
const logger = require('@medic/logger');

const BATCH_SIZE = 100;

/**
 * Queries contacts_by_depth to fetch the contact and all its descendants.
 * The view emits [ancestor_id] and [ancestor_id, depth] for every ancestor in each
 * contact's lineage, so querying [uuid .. uuid, {}] returns all contacts that have
 * uuid anywhere in their ancestor chain — i.e. the full subtree.
 */
const getContactSubtree = async (uuid) => {
  const result = await db.medic.query('medic/contacts_by_depth', {
    startkey: [uuid],
    endkey: [uuid, {}],
    include_docs: true,
  });

  // each descendant emits two rows ([uuid] and [uuid, depth]), deduplicate by doc id
  const seen = new Set();
  const docs = [];
  for (const row of result.rows) {
    if (row.doc && !seen.has(row.doc._id)) {
      seen.add(row.doc._id);
      docs.push(row.doc);
    }
  }
  return docs;
};

/**
 * Fetches all reports linked to the given contacts via reports_by_subject.
 * That view indexes reports by patient_id, place_id, and uuid fields so querying
 * with contact UUIDs + shortcodes covers the main linkage patterns.
 */
const getLinkedReports = async (contactIds, shortcodes) => {
  const keys = [...contactIds, ...shortcodes];
  if (!keys.length) {
    return [];
  }

  const result = await db.medic.query('medic-client/reports_by_subject', {
    keys,
    include_docs: true,
  });

  const seen = new Set();
  const docs = [];
  for (const row of result.rows) {
    if (row.doc && !seen.has(row.doc._id)) {
      seen.add(row.doc._id);
      docs.push(row.doc);
    }
  }
  return docs;
};

const bulkDelete = async (docs) => {
  const marked = docs.map(doc => ({ ...doc, _deleted: true }));
  for (let i = 0; i < marked.length; i += BATCH_SIZE) {
    const batch = marked.slice(i, i + BATCH_SIZE);
    const results = await db.medic.bulkDocs(batch);
    const errors = results.filter(r => r.error);
    if (errors.length) {
      logger.error('Errors during contact recursive delete: %o', errors);
      throw new Error(`Failed to delete ${errors.length} document(s). Partial deletion may have occurred.`);
    }
  }
};

/**
 * Recursively deletes a contact and its entire descendant hierarchy,
 * along with all reports linked to any contact in the subtree.
 *
 * @param {string} uuid - the root contact to delete
 * @returns {{ deleted: { contacts: number, reports: number } } | null}
 *   null if the contact does not exist
 */
const deleteContact = async (uuid) => {
  const contacts = await getContactSubtree(uuid);

  if (!contacts.length) {
    return null;
  }

  const contactIds = contacts.map(c => c._id);
  const shortcodes = contacts.map(c => c.patient_id || c.place_id).filter(Boolean);

  const reports = await getLinkedReports(contactIds, shortcodes);

  await bulkDelete([...contacts, ...reports]);

  logger.info(`Deleted contact ${uuid}: ${contacts.length} contact(s), ${reports.length} report(s)`);

  return {
    deleted: {
      contacts: contacts.length,
      reports: reports.length,
    },
  };
};

module.exports = { deleteContact };
