const db = require('../db');
const logger = require('@medic/logger');

const getReportsCountByForm = async () => {
  try {
    const result = await db.medic.query('shared-reports/reports_by_form', {
      reduce: true,
      group: true,
    });
    const reports = {
      count: 0,
      by_form: [],
    };
    for (const row of result.rows) {
      const [form] = row.key;
      const count = row.value || 0;
      reports.by_form.push({
        form,
        count,
      });
      reports.count += count;
    }
    return reports;
  } catch (err) {
    logger.error('Error fetching reports count:', err);
    return { count: 0, by_form: [] };
  }
};

const getContactsByType = async () => {
  try {
    const result = await db.medic.query('shared-contacts/contacts_by_type', {
      reduce: true,
      group: true,
    });

    const contacts = {
      count: 0,
      by_type: [],
    };

    for (const row of result.rows) {
      const [type] = row.key;
      const count = row.value || 0;

      contacts.by_type.push({
        type,
        count,
      });

      contacts.count += count;
    }

    return contacts;
  } catch (err) {
    logger.error('Error fetching contacts by type:', err);
    return { count: 0, by_type: [] };
  }
};

const getUserCount = async () => {
  const info = await db.users.info();
  const count = info?.doc_count || 0;
  return {count: Math.max(count - 2, 0)}; // deduct count of _auth and _users
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
