const db = require('../db');

const getUserCount = async () => {
  const info = await db.users.info();
  return info?.doc_count;
};

const getDocsByType = async (view) => {
  const results = await db.medic.query(view, { group: true });
  const rows = results?.rows || [];
  let total = 0;
  const types = [];
  for (const row of rows) {
    total += row.value;
    types.push({ type: row.key[0], count: row.value });
  }
  return { total, types };
};

const getReports = async () => getDocsByType('medic-client/reports_by_form');
const getContacts = async () => getDocsByType('medic-client/contacts_by_type');

// active users:
// - users-meta-db device_by_user map from https://github.com/medic/cht-core/pull/8797
// - or connected user log from monitoring api?

// TODO fuzz
// TODO -1 if undefined?
const get = async () => {
  const [
    users,
    reports,
    contacts,
  ] = await Promise.all([
    getUserCount(),
    getReports(),
    getContacts(),
  ]);
  return {
    users,
    reports,
    contacts,
  };
};

module.exports = {
  get,
};
