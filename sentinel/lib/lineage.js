const _ = require('underscore'),
    db = require('../db'),
    utils = require('./utils');

const findPatientId = doc =>
  doc.type === 'data_record' &&
  ((doc.fields && doc.fields.patient_id) || doc.patient_id);

const fillContactsInDocs = (docs, contacts) => {
  if (!contacts || !contacts.length) {
    return docs;
  }
  contacts.forEach(contactDoc => {
    docs.forEach(doc => {
      const id = doc &&
                 doc.contact &&
                 doc.contact._id;
      if (id === contactDoc._id) {
        doc.contact = contactDoc;
      }
    });
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

const patientLineageByShortcode = shortcode =>
  new Promise((resolve, reject) => utils.getPatientContactUuid(db, shortcode, (err, uuid) => {
    if (err) {
      reject(err);
    } else {
      lineageById(uuid).then(resolve);
    }
  }));

const lineageById = id =>
  new Promise((resolve, reject) =>
    db.medic.view('medic-client', 'docs_by_id_lineage', {
      startkey: [ id ],
      endkey: [ id, {} ],
      include_docs: true
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.rows.map(row => row.doc));
      }
    }));

const fetchHydratedDoc = id =>
  lineageById(id).then(lineage => {
    if (lineage.length === 0) {
      // Not a doc that has lineage, just do a normal fetch.
      return db.medic.get(id, (err, doc) => {
        if (err) {
          return Promise.reject(err);
        }
        return doc;
      });
    }

    const patientId = findPatientId(lineage[0]);
    const patientLineagePromise =
      patientId ? patientLineageByShortcode(patientId) : Promise.resolve([]);

    return patientLineagePromise.then(patientLineage => {
      const lineages = lineage.concat(patientLineage);

      const contactIds = _.uniq(
        lineages
          .map(doc => doc && doc.contact && doc.contact._id)
          .filter(id => !!id)
      );

      // Only fetch docs that are new to us
      const lineageContacts = [],
            contactsToFetch = [];
      contactIds.forEach(id => {
        const contact = lineage.find(d => d && d._id === id);
        if (contact) {
          lineageContacts.push(contact);
        } else {
          contactsToFetch.push(id);
        }
      });

      return fetchDocs(contactsToFetch)
        .then(fetchedContacts => {
          const allContacts = lineageContacts.concat(fetchedContacts);
          fillContactsInDocs(lineages, allContacts);

          const doc = lineage.shift();
          buildHydratedDoc(doc, lineage);

          if (patientLineage.length) {
            const patientDoc = patientLineage.shift();
            buildHydratedDoc(patientDoc, patientLineage);
            doc.patient = patientDoc;
          }

          return doc;
        });
    });
  });

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
   * Given a doc id get a doc and all parents, contact (and parents) and
   * patient (and parents)
   * @param id The id of the doc
   * @returns Promise
   */
  fetchHydratedDoc: fetchHydratedDoc,

  /**
   * Given an array of minified docs bind the parents and contacts
   * @param docs The array of docs to hydrate
   * @returns Promise
   */
   // TODO: add patient hydration support for consistency
   //       https://github.com/medic/medic-webapp/issues/4003
  hydrateDocs: hydrateDocs,

  /**
   * Remove all hyrdrated items and leave just the ids
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
    if (doc.type === 'data_record') {
      delete doc.patient;
    }
  }
};
