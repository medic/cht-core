var _ = require('underscore'),
  db = require('../db'),
  utils = require('./utils');

module.exports = function(dependencies) {
  dependencies = dependencies || {};
  var Promise = dependencies.Promise;

  var fetchPatientLineage = function fetchPatientLineage(record) {
    var patientId = findPatientId(record);
    if (!patientId) {
      return Promise.resolve([]);
    }
    return patientLineageByShortcode(patientId);
  };

  var mergeLineages = function mergeLineages(lineage, patientLineage) {
    var lineages = lineage.concat(patientLineage);
    var contactIds = _.uniq(
      lineages
        .map(function(doc) {
          return doc && doc.contact && doc.contact._id;
        })
        .filter(function(id) {
          return !!id;
        })
    );

    // Only fetch docs that are new to us
    var lineageContacts = [],
      contactsToFetch = [];
    contactIds.forEach(function(id) {
      var contact = lineage.find(function(d) {
        return d && d._id === id;
      });
      if (contact) {
        lineageContacts.push(contact);
      } else {
        contactsToFetch.push(id);
      }
    });

    return fetchDocs(contactsToFetch).then(function(fetchedContacts) {
      var allContacts = lineageContacts.concat(fetchedContacts);
      fillContactsInDocs(lineages, allContacts);

      var doc = lineage.shift();
      buildHydratedDoc(doc, lineage);

      if (patientLineage.length) {
        var patientDoc = patientLineage.shift();
        buildHydratedDoc(patientDoc, patientLineage);
        doc.patient = patientDoc;
      }

      return doc;
    });
  };

  var findPatientId = function findPatientId(doc) {
    return (
      doc.type === 'data_record' &&
      ((doc.fields && doc.fields.patient_id) || doc.patient_id)
    );
  };

  var fillContactsInDocs = function fillContactsInDocs(docs, contacts) {
    if (!contacts || !contacts.length) {
      return docs;
    }
    contacts.forEach(function(contactDoc) {
      docs.forEach(function(doc) {
        var id = doc && doc.contact && doc.contact._id;
        if (id === contactDoc._id) {
          doc.contact = contactDoc;
        }
      });
    });
    return docs;
  };

  var buildHydratedDoc = function buildHydratedDoc(doc, lineage) {
    if (!doc) {
      return doc;
    }
    var current = doc;
    if (doc.type === 'data_record') {
      doc.contact = lineage.shift();
      current = doc.contact;
    }
    while (current) {
      current.parent = lineage.shift();
      current = current.parent;
    }
  };

  var minifyContact = function minifyContact(contact) {
    if (!contact) {
      return contact;
    }
    var result = { _id: contact._id };
    var minified = result;
    while (contact.parent) {
      minified.parent = { _id: contact.parent._id };
      minified = minified.parent;
      contact = contact.parent;
    }
    return result;
  };

  var patientLineageByShortcode = function patientLineageByShortcode(shortcode) {
    return new Promise(function(resolve, reject) {
      return utils.getPatientContactUuid(db, shortcode, function(err, uuid) {
        if (err) {
          reject(err);
        } else {
          lineageById(uuid)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  };

  var lineageById = function lineageById(id) {
    return new Promise(function(resolve, reject) {
      return db.medic.view(
        'medic-client',
        'docs_by_id_lineage',
        {
          startkey: [id],
          endkey: [id, {}],
          include_docs: true
        },
        function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(
              result.rows.map(function(row) {
                return row.doc;
              })
            );
          }
        }
      );
    });
  };

  var fetchHydratedDoc = function fetchHydratedDoc(id) {
    return lineageById(id).then(function(lineage) {
      if (lineage.length === 0) {
        // Not a doc that has lineage, just do a normal fetch.
        return new Promise(function(resolve, reject) {
          return db.medic.get(id, function(err, doc) {
            if (err) {
              reject(err);
            } else {
              resolve(doc);
            }
          });
        });
      }

      return fetchPatientLineage(lineage[0]).then(function(patientLineage) {
        return mergeLineages(lineage, patientLineage);
      });
    });
  };

  // for data_records, include the first-level contact.
  var collectParentIds = function collectParentIds(docs) {
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
  var collectLeafContactIds = function collectLeafContactIds(
    partiallyHydratedDocs
  ) {
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

  var fetchDocs = function fetchDocs(ids) {
    return new Promise(function(resolve, reject) {
      if (!ids || !ids.length) {
        return resolve([]);
      }
      db.medic.fetch({ keys: ids }, function(err, results) {
        if (err) {
          return reject(err);
        }
        return resolve(
          results.rows
            .map(function(row) {
              return row.doc;
            })
            .filter(function(doc) {
              return !!doc;
            })
        );
      });
    });
  };

  var hydrateParents = function hydrateParents(docs, parents) {
    if (!parents || !parents.length) {
      return docs;
    }

    var findById = function findById(id, docs) {
      return docs.find(function(doc) {
        return doc._id === id;
      });
    };

    docs.forEach(function(doc) {
      var current = doc;
      if (doc.type === 'data_record') {
        var contactDoc = findById(current.contact._id, parents);
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

  var hydrateLeafContacts = function hydrateLeafContacts(docs, contacts) {
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

  var hydratePatient = function hydratePatient(doc) {
    return fetchPatientLineage(doc).then(function(patientLineage) {
      if (patientLineage.length) {
        var patientDoc = patientLineage.shift();
        buildHydratedDoc(patientDoc, patientLineage);
        doc.patient = patientDoc;
      }
      return doc;
    });
  };

  var hydratePatients = function hydratePatients(docs) {
    return Promise.all(docs.map(hydratePatient)).then(function() {
      return docs;
    });
  };

  var hydrateDocs = function hydrateDocs(docs) {
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
    minify: function minify(doc) {
      if (!doc) {
        return;
      }
      if (doc.parent) {
        doc.parent = minifyContact(doc.parent);
      }
      if (doc.contact && doc.contact._id) {
        var miniContact = { _id: doc.contact._id };
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
};
