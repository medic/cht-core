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

const getId = (item) => item && (typeof item === 'string' ? item : item._id);

const getContactById = (contacts, id) => id && contacts.find(contact => contact && contact._id === id);

const getContactIds = (contacts) => {
  const ids = [];
  contacts.forEach(doc => {
    if (!doc) {
      return;
    }

    const id = getId(doc.contact);
    id && ids.push(id);

    if (!validLinkedDocs(doc)) {
      return;
    }
    Object.keys(doc.linked_docs).forEach(key => {
      const id = getId(doc.linked_docs[key]);
      id && ids.push(id);
    });
  });

  return _.uniq(ids);
};

// don't process linked docs for reports
// linked_docs property should be a key-value object
const validLinkedDocs = doc => {
  if (!doc || doc.type === 'data_record' || !doc.linked_docs) {
    return;
  }

  return _.isObject(doc.linked_docs) && !_.isArray(doc.linked_docs);
};

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
      if (!doc) {
        return;
      }
      const id = getId(doc.contact);
      const contactDoc = getContactById(contacts, id);
      if (contactDoc) {
        doc.contact = deepCopy(contactDoc);
      }

      if (!validLinkedDocs(doc)) {
        return;
      }

      Object.keys(doc.linked_docs).forEach(key => {
        const id = getId(doc.linked_docs[key]);
        const contactDoc = getContactById(contacts, id);
        if (contactDoc) {
          doc.linked_docs[key] = deepCopy(contactDoc);
        }
      });
    });
  };

  const fetchContacts = function(lineage) {
    const contactIds = getContactIds(lineage);

    // Only fetch docs that are new to us
    const lineageContacts = [];
    const contactsToFetch = [];
    contactIds.forEach(function(id) {
      const contact = getContactById(lineage, id);
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
            fillContactsInDocs(patientLineage, contacts);
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
        const contactId = getId(doc.contact);
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
      ids.push(...getContactIds(selfAndParents(startLineageFrom)));
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
              return getContactById(parents, id);
            });
          };

          const isReport = doc.type === 'data_record';
          const findParentsFor = isReport ? doc.contact : doc;
          const lineage = reconstructLineage(findParentsFor, knownDocs);

          if (isReport) {
            lineage.unshift(doc);
          }

          const patientDoc = getContactById(patientDocs, patientUuids[i]);
          const patientLineage = reconstructLineage(patientDoc, knownDocs);

          mergeLineagesIntoDoc(lineage, knownDocs, patientLineage);
        });

        return hydratedDocs;
      });
  };

  const fetchHydratedDocs = docIds => {
    if (!Array.isArray(docIds)) {
      return Promise.reject(new Error('Invalid parameter: "docIds" must be an array'));
    }

    if (!docIds.length) {
      return Promise.resolve([]);
    }

    if (docIds.length === 1) {
      return fetchHydratedDoc(docIds[0])
        .then(doc => [doc])
        .catch(err => {
          if (err.status === 404) {
            return [];
          }

          throw err;
        });
    }

    return DB
      .allDocs({ keys: docIds, include_docs: true })
      .then(result => {
        const docs = result.rows.map(row => row.doc).filter(doc => doc);
        return hydrateDocs(docs);
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
     * Given an array of ids, returns hydrated versions of every requested doc (using hydrateDocs or fetchHydratedDoc)
     * If a doc is not found, it's simply excluded from the results list
     * @param {Object[]} docs The array of docs to hydrate
     * @returns {Promise} A promise to return the hydrated docs
     */
    fetchHydratedDocs: docIds => fetchHydratedDocs(docIds),

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
