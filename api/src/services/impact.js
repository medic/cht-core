const db = require('../db');
const logger = require('@medic/logger');

const getReportsCountByForm = async () => {
  try {
    const result = await db.medic.query('medic-client/reports_by_form', {
      reduce: true,
      group: true,
    });
    const report = {};
    let total = 0;
    for (const row of result.rows) {
      const [form] = row.key;
      report[form] = row.value;
      total += row.value;
    }
    return { report, total };
  } catch (err) {
    logger.error('Error fetching reports count:', err);
    return { report: {}, total: 0 };
  }
};

const getContactsByType = async () => {
  try {
    const result = await db.medic.query('medic-client/contacts_by_type', {
      reduce: true,
      group: true,
    });
    const contactsByType = {};
    for (const row of result.rows) {
      const [type] = row.key;
      contactsByType[type] = row.value;
    }
    return contactsByType;
  } catch (err) {
    logger.error('Error fetching contacts by type:', err);
    return {};
  }
};

const getUserCount = async () => {
  const info = await db.users.info();
  const count = info?.doc_count || 0;
  return Math.max(count - 2, 0); // deduct count of _auth and _users
};

const jsonV1 = async () => {
  const [users, contacts, reports] = await Promise.all([
    getUserCount(),
    getContactsByType(),
    getReportsCountByForm()
  ]);
  return { users, contacts, reports };
};

module.exports = {
  jsonV1: jsonV1
};
