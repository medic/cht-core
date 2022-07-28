const db = require('../db');
const usersService = require('./users');
const people = require('../controllers/people');

async function replaceUser(replaceUserReportId, appUrl) {
  const replaceUserReport = await db.medic.get(replaceUserReportId);
  const oldContact = await people.getOrCreatePerson(replaceUserReport.meta.created_by_person_uuid);
  const newContact = await people.getOrCreatePerson({
    name: replaceUserReport.name,
    sex: replaceUserReport.sex,
    phone: replaceUserReport.phone ? replaceUserReport.phone : oldContact.phone,
    role: oldContact.role,
    type: oldContact.type,
    contact_type: oldContact.contact_type,
    parent: oldContact.parent,
    // TODO: there might be other properties here depending on the deployment's configuration
  });
  await reparentReports(replaceUserReportId, newContact);

  const oldUser = await db.users.get(`org.couchdb.user:${oldContact.username}`);
  const user = {
    // TODO: either generate a username from the contact name or choose a username within the form
    username: `${oldContact.username}-replacement`,
    contact: newContact._id,
    phone: newContact.phone,
    token_login: true,
    type: oldUser.type,
    fullname: replaceUserReport.name,
  };
  return await usersService.createUser(user, appUrl);
}

async function reparentReports(replaceUserReportId, newContact) {
  const replaceUserReport = await db.medic.get(replaceUserReportId);
  const reportsSubmittedAfterReplace = await getReportsToReparent(
    replaceUserReport.meta.created_by_person_uuid,
    replaceUserReport.reported_date,
  );
  if (reportsSubmittedAfterReplace.length === 0) {
    return;
  }

  const reparentedReports = reportsSubmittedAfterReplace.map(report => {
    const reparentedReport = Object.assign({}, report);
    reparentedReport.contact._id = newContact._id;
    reparentedReport.contact.parent = newContact.parent;
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
}