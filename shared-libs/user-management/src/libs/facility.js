const db = require('./db');

const list = (users, settings) => {
  const ids = new Set();
  for (const user of users) {
    ids.add(user?.doc?.facility_id);
  }
  for (const setting of settings) {
    ids.add(setting?.contact_id);
  }
  ids.delete(undefined);
  if (!ids.size) {
    return [];
  }
  return db.medic.allDocs({ keys: Array.from(ids), include_docs: true })
    .then(response => response.rows.map(row => row?.doc).filter(doc => !!doc));
};

module.exports = {
  list,
};

