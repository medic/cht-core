const db = require('../db');

const bindContacts = (lineage, contacts) => {
  contacts.forEach(contactDoc => {
    const stub = lineage.find(lineageDoc => {
      const id = lineageDoc &&
                 lineageDoc.contact &&
                 lineageDoc.contact._id;
      return id === contactDoc._id;
    });
    if (stub) {
      stub.contact = contactDoc;
    }
  });
};

const bindParents = (lineage, doc) => {
  if (!doc) {
    return doc;
  }
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

const fetchHydratedDoc = id => {
  return new Promise((resolve, reject) => {
    db.medic.view('medic-client', 'docs_by_id_lineage', {
      startkey: [ id ],
      endkey: [ id, {} ],
      include_docs: true
    }, (err, result) => {
      if (err) {
        return reject(err);
      }
      const lineage = result.rows.map(row => row.doc);

      if (lineage.length === 0) {
        // Not a doc that has lineage, just do a normal fetch.
        return db.medic.get(id, (err, doc) => {
          if (err) {
            return reject(err);
          }
          resolve(doc);
        });
      }

      const contactIds = lineage
        .map(doc => doc && doc.contact && doc.contact._id)
        .filter(id => !!id);
      db.medic.fetch({ keys: contactIds }, (err, contactResults) => {
        if (err) {
          return reject(err);
        }
        const contacts = contactResults.rows
          .map(row => row.doc)
          .filter(doc => !!doc);
        bindContacts(lineage, contacts);
        const doc = lineage.shift();
        bindParents(lineage, doc);
        resolve(doc);
      });
    });
  });
};

const findRow = (rows, id) => id && rows.find(row => row.id === id);

const collectContactIds = docs => {
  const ids = [];
  docs.forEach(doc => {
    const contactId = doc.contact && doc.contact._id;
    if (contactId && !ids.includes(contactId)) {
      ids.push(contactId);
    }
    let parent = doc.parent;
    while (parent) {
      if (parent._id && !ids.includes(parent._id)) {
        ids.push(parent._id);
      }
      parent = parent.parent;
    }
  });
  return ids;
};

const hydrateDocs = docs => {
  if (!docs.length) {
    return Promise.resolve([]);
  }
  const ids = collectContactIds(docs);
  if (!ids.length) {
    return Promise.resolve(docs);
  }
  return new Promise((resolve, reject) => {
    db.medic.fetch({ keys: ids }, (err, results) => {
      if (err) {
        return reject(err);
      }
      const rows = results.rows;

      const hydratedDocs = JSON.parse(JSON.stringify(docs));
      hydratedDocs.forEach(doc => {
        const row = findRow(rows, doc.contact && doc.contact._id);
        if (row && row.doc) {
          doc.contact = row.doc;
        }
        let parent = doc;
        while (parent) {
          const row = findRow(rows, parent.parent && parent.parent._id);
          if (row && row.doc) {
            parent.parent = row.doc;
          }
          parent = parent.parent;
        }
      });
      resolve(hydratedDocs);
    });
  });
};

module.exports = {
  /**
   * Given a doc id get a doc and all parents and contacts
   * @param id The id of the doc
   * @returns Promise
   */
  fetchHydratedDoc: fetchHydratedDoc,

  /**
   * Given an array of minified docs bind the parents and contacts
   * @param docs The array of docs to hydrate
   * @returns Promise
   */
  hydrateDocs: hydrateDocs,

  /**
   * Remove all fields except for parent and _id from parents and contacts.
   * @param doc The doc to minify
   */
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
