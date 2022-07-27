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
  });
  await reparentReports(replaceUserReportId, newContact);

  const oldUser = await db.users.get(`org.couchdb.user:${oldContact.username}`);
  const user = {
    username: '', // TODO
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
  const reparentedForms = reportsSubmittedAfterReplace.map(form => {
    return Object.assign({}, form, {
      parent: {
        _id: newContact._id,
        parent: newContact.parent,
      },
    });
  });
  await db.medic.bulkDocs(reparentedForms);
}

function getReportsToReparent(userId, timestamp) {
  const query = {
    type: 'data_record',
    reported_date: { $gte: timestamp },
  };
  return db.medic.allDocs(); // TODO
}

module.exports = {
  replaceUser,
};
