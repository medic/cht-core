const db = require('../db');

const bindContacts = (lineage, contacts) => {
  contacts.forEach(contactDoc => {
    const stub = lineage.find(lineageDoc => {
      const id = lineageDoc.contact &&
                 lineageDoc.contact._id;
      return id === contactDoc._id;
    });
    if (stub) {
      stub.contact = contactDoc;
    }
  });
};

const bindParents = (lineage, doc) => {
  let current = doc;
  if (doc.type === 'data_record') {
    doc.contact = lineage.shift();
    current = doc.contact;
  }
  while (current) {
    current.parent = lineage.shift();
    current = current.parent;
  }
};

const minifyContact = contact => {
  if (!contact) {
    return contact;
  }
  const result = { _id: contact._id };
  let minified = result;
  while(contact.parent) {
    minified.parent = { _id: contact.parent._id };
    minified = minified.parent;
    contact = contact.parent;
  }
  return result;
};

module.exports = {
  fetchHydratedDoc: (id, callback) => {
    db.medic.view('medic-client', 'docs_by_id_lineage', {
      startkey: [ id ],
      endkey: [ id, {} ],
      include_docs: true
    }, (err, result) => {
      if (err) {
        return callback(err);
      }
      const lineage = result.rows.map(row => row.doc);
      const contactIds = lineage
        .map(doc => doc.contact && doc.contact._id)
        .filter(id => !!id);
      db.medic.fetch({ keys: contactIds }, (err, contactResults) => {
        if (err) {
          return callback(err);
        }
        const contacts = contactResults.rows.map(row => row.doc);
        bindContacts(lineage, contacts);
        const doc = lineage.shift();
        bindParents(lineage, doc);
        callback(null, doc);
      });
    });
  },
  minify: doc => {
    if (!doc) {
      return;
    }
    if (doc.parent) {
      doc.parent = minifyContact(doc.parent);
    }
    if (doc.contact && doc.contact._id) {
      const miniContact = { _id: doc.contact._id };
      if (doc.contact.parent) {
        miniContact.parent = minifyContact(doc.contact.parent);
      }
      doc.contact = miniContact;
    }
  }
};
