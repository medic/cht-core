/**
 * @module lineage
 */
const _ = require('underscore');
const RECURSION_LIMIT = 50;

const extractParentIds = function(objWithParent) {
  const ids = [];
  while (objWithParent) {
    ids.push(objWithParent._id);
    objWithParent = objWithParent.parent;
  }

  return ids;
};

const fillParentsInDocs = function(doc, lineage) {
  if (!doc || !lineage.length) {
    return doc;
  }

  // Parent hierarchy starts at the contact for data_records
  let currentParent;
  if (doc.type === 'data_record') {
    currentParent = doc.contact = lineage.shift() || doc.contact;
  } else {
    // It's a contact
    currentParent = doc;
  }

  const parentIds = extractParentIds(currentParent.parent);
  lineage.forEach(function(l, i) {
    currentParent.parent = l || { _id: parentIds[i] };
    currentParent = currentParent.parent;
  });

  return doc;
};

const fillContactsInDocs = function(docs, contacts) {
  if (!contacts || !contacts.length) {
    return;
  }
  contacts.forEach(function(contactDoc) {
    docs.forEach(function(doc) {
      const id = doc && doc.contact && doc.contact._id;
      if (id === contactDoc._id) {
        doc.contact = contactDoc;
      }
    });
  });
};

const mergeLineagesIntoDoc = function(lineage, contacts, patientLineage) {
  patientLineage = patientLineage || [];
  const lineages = lineage.concat(patientLineage);
  fillContactsInDocs(lineages, contacts);

  const doc = lineage.shift();
  fillParentsInDocs(doc, lineage);

  if (patientLineage.length) {
    const patientDoc = patientLineage.shift();
    fillParentsInDocs(patientDoc, patientLineage);
    doc.patient = patientDoc;
  }

  return doc;
};

const findPatientId = function(doc) {
  return (
    doc.type === 'data_record' &&
    (
      (doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid)) ||
      doc.patient_id
    )
  );
};

module.exports = function(Promise, DB) {
  const fetchContacts = function(lineage) {
    const contactIds = _.uniq(
      lineage
        .map(function(doc) {
          return doc && doc.contact && doc.contact._id;
        })
        .filter(function(id) {
          return !!id;
        })
    );
  
    // Only fetch docs that are new to us
    const lineageContacts = [];
    const contactsToFetch = [];
    contactIds.forEach(function(id) {
      const contact = lineage.find(function(doc) {
        return doc && doc._id === id;
      });
      if (contact) {
        lineageContacts.push(JSON.parse(JSON.stringify(contact)));
      } else {
        contactsToFetch.push(id);
      }
    });
  
    return fetchDocs(contactsToFetch)
      .then(function(fetchedContacts) {
        return lineageContacts.concat(fetchedContacts);
      });
  };

  const fetchPatientLineage = function(record) {
    const patientId = findPatientId(record);
    if (!patientId) {
      return Promise.resolve([]);
    }
    return contactUuidByPatientId(patientId)
      .then(function(uuid) {
        return fetchLineageById(uuid);
      });
  };

  const contactUuidByPatientId = function(patientId) {
    return DB.query('medic-client/contacts_by_reference', {
      key: [ 'shortcode', patientId ]
    }).then(function(results) {
      if (!results.rows.length) {
        return patientId;
      }
      if (results.rows.length > 1) {
        console.warn('More than one patient person document for shortcode ' + patientId);
      }

      return results.rows[0] && results.rows[0].id;
    });
  };

  const fetchLineageById = function (id, includeSelf = true) {
    const options = {
      startkey: includeSelf ? [id] : [id, 1],
      endkey: [id, {}],
      include_docs: true,
    };
    return DB.query('medic-client/docs_by_id_lineage', options)
      .then(function(result) {
        return result.rows.map(function(row) {
          return row.doc;
        });
      });
  };

  const fetchLineageByIds = function(ids, includeSelf = true) {
    /*
    TODO: Optimize this for online users when this is fixed - https://github.com/pouchdb/pouchdb/issues/6795
    */
    const fetchAll = ids.map(id => fetchLineageById(id, includeSelf));
    return Promise.all(fetchAll);
  };

  const fetchDoc = function(id) {
    return DB.get(id)
      .catch(function(err) {
        if (err.status === 404) {
          err.statusCode = 404;
        }
        throw err;
      });
  };

  const hydrateDocsFromLineages = function(lineages) {
    if (!Array.isArray(lineages)) {
      throw Error('invalid argument in hydrateDocsFromLineages: "lineages"');
    }

    if (!lineages.length) {
      return Promise.resolve([]);
    }

    const hydratedDocs = lineages.map(lineage => {
      if (lineage.length === 0) {
        return;
      }

      return fetchPatientLineage(lineage[0])
      .then(patientLineage => {
        return fetchContacts(lineage.concat(patientLineage))
          .then(contacts => mergeLineagesIntoDoc(lineage, contacts, patientLineage));
      });
    });

    return Promise.all(hydratedDocs);
  };

  const fetchDocs = function(ids) {
    if (!ids || !ids.length) {
      return Promise.resolve([]);
    }
    return DB.allDocs({ keys: ids, include_docs: true })
      .then(function(results) {
        return results.rows
          .map(function(row) {
            return row.doc;
          })
          .filter(function(doc) {
            return !!doc;
          });
      });
  };

  // Minifies things you would attach to another doc:
  //   doc.parent = minify(doc.parent)
  // Not:
  //   minify(doc)
  const minifyLineage = function(parent) {
    if (!parent || !parent._id) {
      return parent;
    }

    const docId = parent._id;
    const result = { _id: parent._id };
    let minified = result;
    let guard = RECURSION_LIMIT;
    while (parent.parent && parent.parent._id) {
      if (--guard === 0) {
        throw Error('Could not hydrate/minify ' + docId + ', possible parent recursion.');
      }
      minified.parent = { _id: parent.parent._id };
      minified = minified.parent;
      parent = parent.parent;
    }
    return result;
  };

  return {
    /**
     * Given a doc id get a doc and all parents, contact (and parents) and
     * patient (and parents)
     * @param {String} id The id of the doc
     * @returns {Promise} A promise to return the hydrated doc.
     */
    fetchHydratedDoc: id => fetchLineageByIds([id])
      .then(lineages => hydrateDocsFromLineages(lineages))
      .then(result => result[0] || fetchDoc(id)),

    /**
     * Given an array of minified docs bind the parents, contacts (and parents) and
     * patient (and parents)
     * @param {Object[]} docs The array of docs to hydrate
     * @returns {Promise} A promise to return the fetched hydrated docs.
     */
    hydrateDocs: docs => {
      if (!docs.length) {
        return Promise.resolve([]);
      }
    
      const ids = docs.map(doc => doc._id);
      return fetchLineageByIds(ids, false)
        .then(lineagesWithoutSelf => {
          lineagesWithoutSelf.forEach((lineage, index) => {
            const deepCopyOfDoc = JSON.parse(JSON.stringify(docs[index]));
            lineage.unshift(deepCopyOfDoc);
          });
          return lineagesWithoutSelf;
        })
        .then(lineages => hydrateDocsFromLineages(lineages));
    },

    /**
     * Remove all hydrated items and leave just the ids
     * @param {Object} doc The doc to minify
     */
    minify: function(doc) {
      if (!doc) {
        return;
      }
      if (doc.parent) {
        doc.parent = minifyLineage(doc.parent);
      }
      if (doc.contact && doc.contact._id) {
        const miniContact = { _id: doc.contact._id };
        if (doc.contact.parent) {
          miniContact.parent = minifyLineage(doc.contact.parent);
        }
        doc.contact = miniContact;
      }
      if (doc.type === 'data_record') {
        delete doc.patient;
      }
    },

    /**
     * Fetches the lineage given a document id
     * @param {String} id The id of a document
     * @returns {Object[]} An array of documents.
     */
    fetchLineageById: id => fetchLineageById(id),

    fetchLineageByIds: ids => fetchLineageByIds(ids),
    minifyLineage,
    fillContactsInDocs,
    fillParentsInDocs,
    fetchContacts,
  };
};
