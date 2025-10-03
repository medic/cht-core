const db = require('../db');
const logger = require('@medic/logger');

const getReportsCount = async () => {
  try {
    const totalReports = await db.medic.query('medic-client/data_records_by_type', {
      reduce: true,
      group: true,
      key: 'report'
    });
    return totalReports.rows[0]?.value || 0;
  } catch (err) {
    logger.error('Error fetching reports count: %o', err);
    return '';
  }
};

const getReportsCountByForm = async () => {
  try {
    const reportsCount = await db.medic.query('medic-client/reports_by_form', {
      reduce: true,
      group: true,
    }).then(result => result.rows.reduce((acc, row) => {
      acc[row.key[0]] = row.value;
      return acc;
    }, {}));
    return reportsCount;
  } catch (err) {
    logger.error('Error fetching reports count: %o', err);
    return '';
  }
};

const getContactsByType = async () => {
  try {
    const contactsByType = await db.medic.query('medic-client/contacts_by_type', {
      reduce: true,
      group: true,
    }).then(result => result.rows.reduce((acc, row) => {
      acc[row.key[0]] = row.value;
      return acc;
    }, {}));
    return contactsByType;
  } catch (err) {
    logger.error('Error fetching cotnacts type: %o', err);
    return '';
  }
};

const getUserCount = async () => {
  const info = await db.users.info();
  const count = info?.doc_count || 0;
  return Math.max(count-2, 0); // deduct count of _auth and _users
};

const jsonV1 = () => {
  return Promise
    .all([
      getUserCount(),
      getContactsByType(),
      getReportsCount(),
      getReportsCountByForm()
    ])
    .then(([
      userCount,
      contactsByType,
      reportsCount,
      reportsByForm
    ]) => {
      return {
        totalUsers: userCount,
        totalReports: reportsCount,
        contactsByType: contactsByType,
        reportsByForm: reportsByForm
      };
    });
};

module.exports = {
  jsonV1: jsonV1
};
