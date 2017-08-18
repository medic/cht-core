const _ = require('underscore'),
    db = require('../db');

const fillContactsInDocs = (docs, contacts) => {
  if (!contacts || !contacts.length) {
    return docs;
  }
  contacts.forEach(contactDoc => {
    const stub = docs.find(doc => {
      const id = doc &&
                 doc.contact &&
                 doc.contact._id;
      return id === contactDoc._id;
    });
    if (stub) {
      stub.contact = contactDoc;
    }
  });
  return docs;
};

const buildHydratedDoc = (doc, lineage) => {
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

      return resolve(fetchDocs(contactIds)
        .then(contacts => {
          fillContactsInDocs(lineage, contacts);
          const doc = lineage.shift();
          buildHydratedDoc(doc, lineage);
          return doc;
        }));
    });
  });
};

// for data_records, include the first-level contact.
const collectParentIds = docs => {
  const ids = [];
  docs.forEach(doc => {
    let parent = doc.parent;
    if (doc.type === 'data_record') {
      const contactId = doc.contact && doc.contact._id;
      if (!contactId) {
        return;
      }
      ids.push(contactId);
      parent = doc.contact;
    }
    while (parent) {
      if (parent._id) {
        ids.push(parent._id);
      }
      parent = parent.parent;
    }
  });
  return _.uniq(ids);
};

// for data_records, doesn't include the first-level contact (it counts as a parent).
const collectLeafContactIds = partiallyHydratedDocs => {
  const ids = [];
  partiallyHydratedDocs.forEach(doc => {
    let current = doc;
    if (current.type === 'data_record') {
      current = current.contact;
    }
    while (current) {
      const contactId = current.contact && current.contact._id;
      if (contactId) {
        ids.push(contactId);
      }
      current = current.parent;
    }
  });
  return _.uniq(ids);
};

const fetchDocs = ids => {
  return new Promise((resolve, reject) => {
    if (!ids || !ids.length) {
      return resolve([]);
    }
    db.medic.fetch({ keys: ids }, (err, results) => {
      if (err) {
        return reject(err);
      }
      return resolve(results.rows.map(row => row.doc).filter(doc => !!doc));
    });
  });
};

const hydrateParents = (docs, parents) => {
  if (!parents || !parents.length) {
    return docs;
  }

  const findById = (id, docs) => docs.find(doc => doc._id === id);

  docs.forEach(doc => {
    let current = doc;
    if (doc.type === 'data_record') {
      const contactDoc = findById(current.contact._id, parents);
      if (contactDoc) {
        doc.contact = contactDoc;
      }
      current = doc.contact;
    }

    while (current) {
      if (current.parent && current.parent._id) {
        const parentDoc = findById(current.parent._id, parents);
        if (parentDoc) {
          current.parent = parentDoc;
        }
      }
      current = current.parent;
    }
  });
  return docs;
};

const hydrateLeafContacts = (docs, contacts) => {
  const subDocsToHydrate = [];
  docs.forEach(doc => {
    let current = doc;
    if (doc.type === 'data_record') {
      current = doc.contact;
    }
    while (current) {
      subDocsToHydrate.push(current);
      current = current.parent;
    }
  });
  fillContactsInDocs(subDocsToHydrate, contacts);
  return docs;
};

const hydrateDocs = docs => {
  if (!docs.length) {
    return Promise.resolve([]);
  }
  const parentIds = collectParentIds(docs);
  const hydratedDocs = JSON.parse(JSON.stringify(docs));
  return fetchDocs(parentIds)
    .then(parents => {
      hydrateParents(hydratedDocs, parents);
      return fetchDocs(collectLeafContactIds(hydratedDocs));
    })
    .then(contacts => {
      hydrateLeafContacts(hydratedDocs, contacts);
      return hydratedDocs;
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
