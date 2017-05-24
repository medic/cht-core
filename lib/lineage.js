const db = require('../db');

const bindContacts = (lineage, contacts) => {
  contacts.rows.forEach(contactRow => {
    const stub = lineage.rows.find(lineageRow => {
      const id = lineageRow.doc &&
                 lineageRow.doc.contact &&
                 lineageRow.doc.contact._id;
      return id === (contactRow.doc && contactRow.doc._id);
    });
    if (stub && stub.doc) {
      stub.doc.contact = contactRow.doc;
    }
  });
};

const bindParents = (lineage, result) => {
  let current = result;
  while (current) {
    const row = lineage.rows.shift();
    current.parent = row && row.doc;
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
    }, (err, lineage) => {
      if (err) {
        return callback(err);
      }
      const contactIds = lineage.rows
        .map(row => row.doc && row.doc.contact && row.doc.contact._id)
        .filter(id => !!id);
      db.medic.fetch({ keys: contactIds }, (err, contacts) => {
        if (err) {
          return callback(err);
        }
        bindContacts(lineage, contacts);
        const resultRow = lineage.rows.shift();
        const result = resultRow && resultRow.doc;
        bindParents(lineage, result);
        callback(null, result);
      });
    });
  },
  minify: doc => {
    if (!doc) {
      return;
    }
    doc.parent = minifyContact(doc.parent);
    if (doc.contact && doc.contact._id) {
      doc.contact = {
        _id: doc.contact._id,
        parent: minifyContact(doc.contact.parent)
      };
    }
  }
};
