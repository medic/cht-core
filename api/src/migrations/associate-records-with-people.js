const _ = require('lodash');
const db = require('../db');
const batch = require('../db-batch');

const getClinic = id => {
  return db.medic.get(id)
    .then(clinic => {
      const contact = clinic.contact;
      if (!contact) {
        return;
      }
      if (!contact.parent) {
        clinic.contact = _.clone(clinic.contact);
        contact.parent = clinic;
      }
      return contact;
    })
    .catch(err => {
      if (err.status === 404) {
        return;
      }
      throw err;
    });
};

const getContact = (contactId, clinicId) => {
  if (!contactId) {
    return getClinic(clinicId);
  }
  return db.medic.get(contactId).catch(err => {
    if (err.status === 404) {
      return getClinic(clinicId);
    }
    throw err;
  });
};

const getContactForOutgoingMessages = message => {
  const facility = message.facility;
  if (facility.type === 'person') {
    return Promise.resolve(facility);
  }
  return getContact(facility.contact._id, facility._id);
};

const migrateOutgoingMessages = message => {
  return getContactForOutgoingMessages(message).then(contact => {
    message.contact = contact;
    delete message.facility;
  });
};

const migrateOutgoingTasks = task => {
  return Promise.all(task.messages.map(migrateOutgoingMessages));
};

const migrateOutgoing = doc => {
  const ignore = _.every(doc.tasks, task => {
    return _.every(task.messages, message => {
      return (message.contact && message.contact._id) || !message.facility;
    });
  });
  if (ignore) {
    return;
  }
  return Promise.all(doc.tasks.map(migrateOutgoingTasks))
    .then(() => doc);
};

const migrateIncoming = doc => {
  if (doc.contact) {
    // already migrated
    return;
  }
  const clinic = doc.related_entities && doc.related_entities.clinic;
  if (!clinic) {
    return;
  }
  const contactId = clinic.contact && clinic.contact._id;
  return getContact(contactId, clinic._id).then(contact => {
    doc.contact = contact;
    delete doc.related_entities;
    return doc;
  });
};

const migrate = doc => {
  if (doc.sms_message) {
    return migrateIncoming(doc);
  }
  return migrateOutgoing(doc);
};

const save = docs => {
  return db.medic.bulkDocs(docs).then(results => {
    if (results && results.length) {
      const errors = [];
      results.forEach(result => {
        if (!result.ok) {
          errors.push(new Error(result.error + ' - ' + result.reason));
        }
      });
      if (errors.length) {
        throw new Error('Bulk create errors: ' + JSON.stringify(errors, null, 2));
      }
    }
  });
};

const associate = docs => {
  return Promise.all(docs.map(migrate)).then(results => {
    const docs = _.compact(results);
    if (docs.length) {
      return save(docs);
    }
  });
};

module.exports = {
  name: 'associate-records-with-people',
  created: new Date(2015, 5, 13, 11, 41, 0, 0),
  run: () => {
    return batch.view('medic-client/doc_by_type', { key: [ 'data_record' ] }, associate);
  }
};
