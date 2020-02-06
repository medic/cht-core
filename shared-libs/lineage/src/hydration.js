const _ = require('lodash/core');
_.uniq = require('lodash/uniq');

const deepCopy = obj => JSON.parse(JSON.stringify(obj));

const selfAndParents = function(self) {
  const parents = [];
  let current = self;
  while (current) {
    if (parents.includes(current)) {
      return parents;
    }

    parents.push(current);
    current = current.parent;
  }
  return parents;
};

const extractParentIds = current => selfAndParents(current)
  .map(parent => parent._id)
  .filter(id => id);

module.exports = function(Promise, DB) {
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
      currentParent.parent = l ? deepCopy(l) : { _id: parentIds[i] };
      currentParent = currentParent.parent;
    });

    return doc;
  };

  const fillContactsInDocs = function(docs, contacts) {
    if (!contacts || !contacts.length) {
      return;
    }

    docs.forEach(function(doc) {
      const id = doc && doc.contact && doc.contact._id;
      const contactDoc = id && contacts.find(contactDoc => contactDoc._id === id);
      if (contactDoc) {
        doc.contact = deepCopy(contactDoc);
      }
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
        lineageContacts.push(deepCopy(contact));
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
    const doc = lineage.shift();
    fillParentsInDocs(doc, lineage);

    if (patientLineage && patientLineage.length) {
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

  const fetchPatientUuids = function(records) {
    const patientIds = records.map(record => findPatientId(record));
    if (!patientIds.some(patientId => patientId)) {
      return Promise.resolve([]);
    }
    return contactUuidByPatientIds(patientIds);
  };

  const fetchPatientLineage = function(record) {
    return fetchPatientUuids([record])
      .then(function([uuid]) {
        if (!uuid) {
          return [];
        }

        return fetchLineageById(uuid);
      });
  };

  const contactUuidByPatientIds = function(patientIds) {
    const keys = patientIds
      .filter(patientId => patientId)
      .map(patientId => [ 'shortcode', patientId ]);
    return DB.query('medic-client/contacts_by_reference', { keys })
      .then(function(results) {
        const findIdWithKey = key => {
          const matchingRow = results.rows.find(row => row.key[1] === key);
          return matchingRow && matchingRow.id;
        };
        return patientIds.map(patientId => findIdWithKey(patientId) || patientId);
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
          const docLineage = selfAndParents(hdoc);
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

  const fetchHydratedDoc = function(id, options = {}, callback) {
    let lineage;
    let patientLineage;
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    _.defaults(options, {
      throwWhenMissingLineage: false,
    });

    return fetchLineageById(id)
      .then(function(result) {
        lineage = result;

        if (lineage.length === 0) {
          if (options.throwWhenMissingLineage) {
            const err = new Error(`Document not found: ${id}`);
            err.code = 404;
            throw err;
          } else {
            // Not a doc that has lineage, just do a normal fetch.
            return fetchDoc(id);
          }
        }

        return fetchPatientLineage(lineage[0])
          .then(function(result) {
            patientLineage = result;
            return fetchContacts(lineage.concat(patientLineage));
          })
          .then(function(contacts) {
            fillContactsInDocs(lineage, contacts);
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

      ids.push(...extractParentIds(parent));
    });
    return _.uniq(ids);
  };

  // for data_records, doesn't include the first-level contact (it counts as a parent).
  const collectLeafContactIds = function(partiallyHydratedDocs) {
    const ids = [];
    partiallyHydratedDocs.forEach(function(doc) {
      const startLineageFrom = doc.type === 'data_record' ? doc.contact : doc;
      const contactIds = selfAndParents(startLineageFrom)
        .map(parent => parent.contact && parent.contact._id)
        .filter(id => id);

      ids.push(...contactIds);
    });

    return _.uniq(ids);
  };

  const fetchDocs = function(ids) {
    if (!ids || !ids.length) {
      return Promise.resolve([]);
    }
    const keys = _.uniq(ids.filter(id => id));
    if (keys.length === 0) {
      return Promise.resolve([]);
    }

    return DB.allDocs({ keys, include_docs: true })
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

  const hydrateDocs = function(docs) {
    if (!docs.length) {
      return Promise.resolve([]);
    }

    const hydratedDocs = deepCopy(docs); // a copy of the original docs which we will incrementally hydrate and return
    const knownDocs = [...hydratedDocs]; // an array of all documents which we have fetched

    let patientUuids;
    let patientDocs;

    return fetchPatientUuids(hydratedDocs)
      .then(function(uuids) {
        patientUuids = uuids;
        return fetchDocs(patientUuids);
      })
      .then(function(patients) {
        patientDocs = patients;
        knownDocs.push(...patients);

        const firstRoundIdsToFetch = _.uniq([
          ...collectParentIds(hydratedDocs),
          ...collectLeafContactIds(hydratedDocs),

          ...collectParentIds(patientDocs),
          ...collectLeafContactIds(patientDocs),
        ]);

        return fetchDocs(firstRoundIdsToFetch);
      })
      .then(function(firstRoundFetched) {
        knownDocs.push(...firstRoundFetched);
        const secondRoundIdsToFetch = collectLeafContactIds(firstRoundFetched)
          .filter(id => !knownDocs.some(doc => doc._id === id));
        return fetchDocs(secondRoundIdsToFetch);
      })
      .then(function(secondRoundFetched) {
        knownDocs.push(...secondRoundFetched);

        fillContactsInDocs(knownDocs, knownDocs);
        hydratedDocs.forEach((doc, i) => {
          const reconstructLineage = (docWithLineage, parents) => {
            const parentIds = extractParentIds(docWithLineage);
            return parentIds.map(id => {
              // how can we use hashmaps?
              return parents.find(doc => doc._id === id);
            });
          };

          const isReport = doc.type === 'data_record';
          const findParentsFor = isReport ? doc.contact : doc;
          const lineage = reconstructLineage(findParentsFor, knownDocs);

          if (isReport) {
            lineage.unshift(doc);
          }

          const patientDoc = patientUuids[i] && patientDocs.find(known => known._id === patientUuids[i]);
          const patientLineage = reconstructLineage(patientDoc, knownDocs);

          mergeLineagesIntoDoc(lineage, knownDocs, patientLineage);
        });

        return hydratedDocs;
      });
  };

  return {
    /**
     * Given a doc id get a doc and all parents, contact (and parents) and patient (and parents)
     * @param {String} id The id of the doc to fetch and hydrate
     * @param {Object} [options] Options for the behavior of the hydration
     * @param {Boolean} [options.throwWhenMissingLineage=false] When true, throw if the doc has nothing to hydrate.
     *   When false, does a best effort to return the document regardless of content.
     * @returns {Promise} A promise to return the hydrated doc.
     */
    fetchHydratedDoc: (id, options, callback) => fetchHydratedDoc(id, options, callback),

    /**
     * Given an array of docs bind the parents, contact (and parents) and patient (and parents)
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
