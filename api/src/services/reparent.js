const db = require('../db');
const usersService = require('./users');
const people = require('../controllers/people');

async function replaceUser(replaceUserReportId, appUrl) {
  const replaceUserReport = await db.medic.get(replaceUserReportId);
  const oldContact = await people.getOrCreatePerson(replaceUserReport.contact._id);
  const newContact = await people.getOrCreatePerson({
    name: replaceUserReport.fields.name,
    sex: replaceUserReport.fields.sex,
    phone: replaceUserReport.fields.phone ? replaceUserReport.fields.phone : oldContact.phone,
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
    fullname: replaceUserReport.fields.name,
  };
  await usersService.createUser(user, appUrl);
}

async function reparentReports(replaceUserReportId, newContact) {
  const replaceUserReport = await db.medic.get(replaceUserReportId);
  const reportsSubmittedAfterReplace = await getReportsToReparent(
    replaceUserReport.contact._id,
    replaceUserReport.reported_date,
  );
  const reparentedReports = reportsSubmittedAfterReplace.map(report => {
    const reparentedReport = Object.assign({}, report);
    reparentedReport.contact._id = newContact._id;
    reparentedReport.contact.parent = newContact.parent;
    return reparentedReport;
  });
  await db.medic.bulkDocs(reparentedReports);
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
