/**
 * @module lineage
 */
const _ = require('underscore');
const RECURSION_LIMIT = 50;

module.exports = function(Promise, DB) {
  const fetchContacts = function(lineage) {
    const contactIds = _.uniq(
      lineage
        .map(function(doc) {
          return doc && doc.contact && doc.contact._id;
        })
        .filter(id => !!id)
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
    const patientId = record.type === 'data_record' &&
      (
        (record.fields && (record.fields.patient_id || record.fields.patient_uuid)) ||
        record.patient_id
      );

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

  const fetchLineageById = function (id) {
    const options = {
      startkey: [id],
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


  const fetchLineageByIds = function(ids) {
    return fetchDocs(ids).then(fetchLineageByDocs);
  };

  const fetchLineageByDocs = function(docs) {
    /*
    Since PouchDB doesn't support the "queries" interface in CouchDB 2.x, fetchLineageById doesn't perform well for multiple IDs
    This function is therefore an implementation of the logic in docs_by_id_lineage which parallelizes via two allDocs requests regardless of the number of docs
    */
    const getLineageIdsFromDocs = function(docs) {
      const result = [];
      for (let doc of docs) {
        let lineageIds = [];
        const isContact = [ 'contact', 'district_hospital', 'health_center', 'clinic', 'person' ].includes(doc.type);
        const isForm = doc.type === 'data_record' && doc.form;
        if (isContact) {
          lineageIds = extractParentIds(doc);
        } else if (isForm) {
          lineageIds = [doc._id, ...extractParentIds(doc.contact)];
        }

        result.push(lineageIds);
      }

      return result;
    };

    const convertArrayToMapKeyedById = array => array.reduce((agg, element) => {
      const id = element._id || element.id;
      agg[id] = element;
      return agg;
    }, {});
    
    const lineageIds = getLineageIdsFromDocs(docs);
    return fetchDocs(_.flatten(lineageIds))
      .then(convertArrayToMapKeyedById)
      .then(lineageDocs => lineageIds.map(lineage => lineage.map(lineageId => lineageDocs[lineageId])));
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

  const fetchDoc = function(id) {
    return DB.get(id)
      .catch(function(err) {
        if (err.status === 404) {
          err.statusCode = 404;
        }
        throw err;
      });
  };

  const fetchDocs = function(ids) {
    if (!ids || !ids.length) {
      return Promise.resolve([]);
    }
    return DB.allDocs({ keys: _.uniq(ids), include_docs: true })
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
    
      return fetchLineageByDocs(docs)
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
    minifyLineage,

    /**
     * Fetches the lineage given a document id
     * @param {String} id The id of a document
     * @returns {Object[]} An array of documents.
     */
    fetchLineageById,
    fetchLineageByIds,
    fillContactsInDocs,
    fillParentsInDocs,
    fetchContacts,
  };
};

const extractParentIds = function(objWithParent) {
  const ids = [];
  while (objWithParent && objWithParent._id) {
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

