const db = require('./db');

const list = async (users) => {
  const ids = new Set();
  for (const user of users) {
    ids.add(user?.facility_id);
    ids.add(user?.contact_id);
  }
  ids.delete(undefined);
  if (!ids.size) {
    return [];
  }
  const response = await db.medic.allDocs({ keys: Array.from(ids), include_docs: true });
  return response.rows.map(row => row?.doc).filter(doc => !!doc);
};

module.exports = {
  list,
};

