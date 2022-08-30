const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const usersService = require('./users');
const people = require('../controllers/people');

const generateUsername = contactName => {
  const randomNum = Math.floor(Math.random() * 9999) + 1000;
  return contactName.replace(/\s+/g, '-').toLowerCase() + randomNum;
};

const createNewUser = (appUrl, newContact, oldUser) => {
  const user = {
    username: generateUsername(newContact.name),
    token_login: true,
    roles: oldUser.roles,
    phone: oldUser.phone,
    place: newContact.parent._id,
    contact: newContact._id,
    fullname: newContact.name,
  };
  return usersService.createUser(user, appUrl);
};

async function replaceUser(replaceUserReportId, appUrl) {
  const replaceUserReport = await db.medic.get(replaceUserReportId);
  const oldContact = await people.getOrCreatePerson(replaceUserReport.fields.original_contact_uuid);
  const oldUserSettingsResponse = await db.medic.find({
    selector: {
      type: 'user-settings',
      contact_id: oldContact._id,
    },
  });
  if (oldUserSettingsResponse.docs.length === 0) {
    const error = new Error(`user with contact_id="${oldContact._id}" not found`);
    error.code = 400;
    return Promise.reject(error);
  }

  const oldUserSettings = oldUserSettingsResponse.docs[0];
  if (oldUserSettings.replaced) {
    return;
  }

  const newContact = await people.getOrCreatePerson(replaceUserReport.fields.new_contact_uuid);
  await reparentReports(replaceUserReportId, newContact);

  const oldUser = await db.medic.get(oldUserSettings._id);
  await db.medic.put(Object.assign({}, oldUserSettings, { shouldLogoutNextSync: true, replaced: true }));
  return createNewUser(appUrl, newContact, oldUser);
}

async function reparentReports(replaceUserReportId, newContact) {
  const replaceUserReport = await db.medic.get(replaceUserReportId);
  const reportsSubmittedAfterReplace = await getReportsToReparent(
    replaceUserReport.fields.original_contact_uuid,
    replaceUserReport.reported_date,
  );
  if (reportsSubmittedAfterReplace.length === 0) {
    return;
  }

  const reparentedReports = reportsSubmittedAfterReplace.map(report => {
    const reparentedReport = Object.assign({}, report);
    reparentedReport.contact._id = newContact._id;
    reparentedReport.contact.parent = newContact.parent;
    reparentedReport.contact = lineage.minifyLineage(reparentedReport.contact);
    return reparentedReport;
  });
  return db.medic.bulkDocs(reparentedReports);
}

async function getReportsToReparent(contactId, timestamp) {
  const result = await db.medic.query('medic-client/reports_by_freetext', {
    key: [`contact:${contactId}`],
    include_docs: true,
  });
  return result.rows
    .filter(row => row.doc.reported_date >= timestamp)
    .map(row => row.doc);
}

module.exports = {
  replaceUser,
};
