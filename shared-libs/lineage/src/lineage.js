const RECURSION_LIMIT = 50;

const _ = require('underscore');

module.exports = function(Promise, DB) {
  const extractParentIds = function(currentParent) {
    const ids = [];
    while (currentParent) {
      ids.push(currentParent._id);
      currentParent = currentParent.parent;
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

  const fetchLineageById = function(id) {
    const options = {
      startkey: [id],
      endkey: [id, {}],
      include_docs: true
    };
    return DB.query('medic-client/docs_by_id_lineage', options)
      .then(function(result) {
        return result.rows.map(function(row) {
          return row.doc;
        });
      });
  };

  const fetchLineageByIds = function(ids) {
    return fetchDocs(ids).then(function(docs) {
      return hydrateDocs(docs).then(function(hydratedDocs) {
        // Returning a list of docs just like fetchLineageById
        const docsList = [];
        hydratedDocs.forEach(function(hdoc) {
          const docLineage = [];
          let parent = hdoc;
          while(parent) {
            docLineage.push(parent);
            parent = parent.parent;
          }
          docsList.push(docLineage);
        });
        return docsList;
      });
    });
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

  const fetchHydratedDoc = function(id, callback) {
    let lineage;
    let patientLineage;
    return fetchLineageById(id)
      .then(function(result) {
        lineage = result;

        if (lineage.length === 0) {
          // Not a doc that has lineage, just do a normal fetch.
          return fetchDoc(id);
        }

        return fetchPatientLineage(lineage[0])
          .then(function(result) {
            patientLineage = result;
            return fetchContacts(lineage.concat(patientLineage));
          })
          .then(function(contacts) {
            return mergeLineagesIntoDoc(lineage, contacts, patientLineage);
          });
      })
      .then(function(result) {
        if (callback) {
          callback(null, result);
        }
        return result;
      })
      .catch(function(err) {
        if (callback) {
          callback(err);
        } else {
          throw err;
        }
      });
  };

  // for data_records, include the first-level contact.
  const collectParentIds = function(docs) {
    const ids = [];
    docs.forEach(function(doc) {
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
  const collectLeafContactIds = function(partiallyHydratedDocs) {
    const ids = [];
    partiallyHydratedDocs.forEach(function(doc) {
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

  const hydrateParents = function(docs, parents) {
    if (!parents || !parents.length) {
      return docs;
    }

    const findById = function(id, docs) {
      if (id) {
        return docs.find(function(doc) {
          return doc._id === id;
        });
      }
    };

    docs.forEach(function(doc) {
      let current = doc;
      if (doc.type === 'data_record') {
        const contactDoc = findById(current.contact && current.contact._id, parents);
        if (contactDoc) {
          doc.contact = contactDoc;
        }
        current = doc.contact;
      }

      let guard = RECURSION_LIMIT;
      while (current) {
        if (--guard === 0) {
          throw Error(`Could not hydrate/minify ${doc._id}, possible parent recursion.`);
        }

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

  const hydrateLeafContacts = function(docs, contacts) {
    const subDocsToHydrate = [];
    docs.forEach(function(doc) {
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

  const hydratePatient = function(doc) {
    return fetchPatientLineage(doc).then(function(patientLineage) {
      if (patientLineage.length) {
        var patientDoc = patientLineage.shift();
        fillParentsInDocs(patientDoc, patientLineage);
        doc.patient = patientDoc;
      }
      return doc;
    });
  };

  const hydratePatients = function(docs) {
    return Promise.all(docs.map(hydratePatient)).then(function() {
      return docs;
    });
  };

  const hydrateDocs = function(docs) {
    if (!docs.length) {
      return Promise.resolve([]);
    }

    const parentIds = collectParentIds(docs);
    const hydratedDocs = JSON.parse(JSON.stringify(docs));
    return fetchDocs(parentIds)
      .then(function(parents) {
        hydrateParents(hydratedDocs, parents);
        return fetchDocs(collectLeafContactIds(hydratedDocs));
      })
      .then(function(contacts) {
        hydrateLeafContacts(hydratedDocs, contacts);
        return hydratePatients(hydratedDocs);
      });
  };

  return {
    /**
     * Given a doc id get a doc and all parents, contact (and parents) and
     * patient (and parents)
     * @param {String} id The id of the doc
     * @returns {Promise} A promise to return the hydrated doc.
     */
    fetchHydratedDoc: (id, callback) => fetchHydratedDoc(id, callback),

    /**
     * Given an array of minified docs bind the parents and contacts
     * @param {Object[]} docs The array of docs to hydrate
     * @returns {Promise}
     */
    hydrateDocs: docs => hydrateDocs(docs),

    fetchLineageById,
    fetchLineageByIds,
    fillContactsInDocs,
    fillParentsInDocs,
    fetchContacts,
  };
};
