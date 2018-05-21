var _ = require('underscore');

module.exports = function(Promise, DB) {
  var extractParentIds = function(currentParent) {
    var ids = [];
    while (currentParent) {
      ids.push(currentParent._id);
      currentParent = currentParent.parent;
    }
    return ids;
  };

  var fillParentsInDocs = function(doc, lineage) {
    if (!doc || !lineage.length) {
      return doc;
    }

    // Parent hierarchy starts at the contact for data_records
    var currentParent;
    if (doc.type === 'data_record') {
      currentParent = doc.contact = lineage.shift() || doc.contact;
    } else {
      // It's a contact
      currentParent = doc;
    }

    var parentIds = extractParentIds(currentParent.parent);
    lineage.forEach(function(l, i) {
      currentParent.parent = l || { _id: parentIds[i] };
      currentParent = currentParent.parent;
    });

    return doc;
  };

  var fillContactsInDocs = function(docs, contacts) {
    if (!contacts || !contacts.length) {
      return;
    }
    contacts.forEach(function(contactDoc) {
      docs.forEach(function(doc) {
        var id = doc && doc.contact && doc.contact._id;
        if (id === contactDoc._id) {
          doc.contact = contactDoc;
        }
      });
    });
  };

  var fetchContacts = function(lineage) {
    var contactIds = _.uniq(
      lineage
        .map(function(doc) {
          return doc && doc.contact && doc.contact._id;
        })
        .filter(function(id) {
          return !!id;
        })
    );

    // Only fetch docs that are new to us
    var lineageContacts = [];
    var contactsToFetch = [];
    contactIds.forEach(function(id) {
      var contact = lineage.find(function(doc) {
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

  var mergeLineagesIntoDoc = function(lineage, contacts, patientLineage) {
    patientLineage = patientLineage || [];
    var lineages = lineage.concat(patientLineage);
    fillContactsInDocs(lineages, contacts);

    var doc = lineage.shift();
    fillParentsInDocs(doc, lineage);

    if (patientLineage.length) {
      var patientDoc = patientLineage.shift();
      fillParentsInDocs(patientDoc, patientLineage);
      doc.patient = patientDoc;
    }

    return doc;
  };

  var findPatientId = function(doc) {
    return (
      doc.type === 'data_record' &&
      ((doc.fields && doc.fields.patient_id) || doc.patient_id)
    );
  };

  var fetchPatientLineage = function(record) {
    var patientId = findPatientId(record);

    if (!patientId) {
      return Promise.resolve([]);
    }

    return contactUuidByPatientId(patientId)
      .then(function(uuid) {
        return fetchLineageById(uuid);
      });
  };

  var contactUuidByPatientId = function(patientId) {
    return DB.query('medic-client/contacts_by_reference', {
      key: [ 'shortcode', patientId ]
    }).then(function(results) {
      if (results.rows.length > 1) {
        console.warn('More than one patient person document for shortcode ' + patientId);
      }

      return results.rows[0] && results.rows[0].id;
    });
  };

  var fetchLineageById = function(id) {
    var options = {
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

  var fetchDoc = function(id) {
    return DB.get(id)
      .catch(function(err) {
        if (err.status === 404) {
          err.statusCode = 404;
        }
        throw err;
      });
  };

  var fetchHydratedDoc = function(id, callback) {
    var lineage;
    var patientLineage;
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
  var collectParentIds = function(docs) {
    var ids = [];
    docs.forEach(function(doc) {
      var parent = doc.parent;
      if (doc.type === 'data_record') {
        var contactId = doc.contact && doc.contact._id;
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
  var collectLeafContactIds = function(partiallyHydratedDocs) {
    var ids = [];
    partiallyHydratedDocs.forEach(function(doc) {
      var current = doc;
      if (current.type === 'data_record') {
        current = current.contact;
      }
      while (current) {
        var contactId = current.contact && current.contact._id;
        if (contactId) {
          ids.push(contactId);
        }
        current = current.parent;
      }
    });
    return _.uniq(ids);
  };

  var fetchDocs = function(ids) {
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

  var hydrateParents = function(docs, parents) {
    if (!parents || !parents.length) {
      return docs;
    }

    var findById = function(id, docs) {
      if (id) {
        return docs.find(function(doc) {
          return doc._id === id;
        });
      }
    };

    docs.forEach(function(doc) {
      var current = doc;
      if (doc.type === 'data_record') {
        var contactDoc = findById(current.contact && current.contact._id, parents);
        if (contactDoc) {
          doc.contact = contactDoc;
        }
        current = doc.contact;
      }

      while (current) {
        if (current.parent && current.parent._id) {
          var parentDoc = findById(current.parent._id, parents);
          if (parentDoc) {
            current.parent = parentDoc;
          }
        }
        current = current.parent;
      }
    });
    return docs;
  };

  var hydrateLeafContacts = function(docs, contacts) {
    var subDocsToHydrate = [];
    docs.forEach(function(doc) {
      var current = doc;
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

  var hydratePatient = function(doc) {
    return fetchPatientLineage(doc).then(function(patientLineage) {
      if (patientLineage.length) {
        var patientDoc = patientLineage.shift();
        fillParentsInDocs(patientDoc, patientLineage);
        doc.patient = patientDoc;
      }
      return doc;
    });
  };

  var hydratePatients = function(docs) {
    return Promise.all(docs.map(hydratePatient)).then(function() {
      return docs;
    });
  };

  var hydrateDocs = function(docs) {
    if (!docs.length) {
      return Promise.resolve([]);
    }
    var parentIds = collectParentIds(docs);
    var hydratedDocs = JSON.parse(JSON.stringify(docs));
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

  // Minifies things you would attach to another doc:
  //   doc.parent = minify(doc.parent)
  // Not:
  //   minify(doc)
  var minifyLineage = function(parent) {
    if (!parent || !parent._id) {
      return parent;
    }

    var result = { _id: parent._id };
    var minified = result;
    while (parent.parent && parent.parent._id) {
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
     * Remove all hyrdrated items and leave just the ids
     * @param doc The doc to minify
     */
    minify: function(doc) {
      if (!doc) {
        return;
      }
      if (doc.parent) {
        doc.parent = minifyLineage(doc.parent);
      }
      if (doc.contact && doc.contact._id) {
        var miniContact = { _id: doc.contact._id };
        if (doc.contact.parent) {
          miniContact.parent = minifyLineage(doc.contact.parent);
        }
        doc.contact = miniContact;
      }
      if (doc.type === 'data_record') {
        delete doc.patient;
      }
    },

    fetchLineageById: fetchLineageById,
    minifyLineage: minifyLineage,
    fillContactsInDocs: fillContactsInDocs,
    fillParentsInDocs: fillParentsInDocs,
    fetchContacts: fetchContacts
  };
};
