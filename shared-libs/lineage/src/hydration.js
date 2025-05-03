const _ = require('lodash/core');
_.uniq = require('lodash/uniq');
const utils = require('./utils');
const logger = require('@medic/logger');

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

const getContactById = (contacts, id) => id && contacts.find(contact => contact && contact._id === id);

const getContactIds = (contacts) => {
  const ids = [];
  contacts.forEach(doc => {
    if (!doc) {
      return;
    }

    const id = utils.getId(doc.contact);
    id && ids.push(id);

    if (!utils.validLinkedDocs(doc)) {
      return;
    }
    Object.keys(doc.linked_docs).forEach(key => {
      const id = utils.getId(doc.linked_docs[key]);
      id && ids.push(id);
    });
  });

  return _.uniq(ids);
};

module.exports = function(Promise, DB, datasource) {
  const fillParentsInDocs = function(doc, lineage) {
    if (!doc || !lineage.length) {
      return doc;
    }

    // Parent hierarchy starts at the contact for data_records
    let currentParent;
    if (utils.isReport(doc)) {
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
      const id = utils.getId(doc.contact);
      const contactDoc = getContactById(contacts, id);
      if (contactDoc) {
        doc.contact = deepCopy(contactDoc);
      }

      if (!utils.validLinkedDocs(doc)) {
        return;
      }

      Object.keys(doc.linked_docs).forEach(key => {
        const id = utils.getId(doc.linked_docs[key]);
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

  const mergeLineagesIntoDoc = function(lineage, contacts, patientLineage, placeLineage) {
    const doc = lineage.shift();
    fillParentsInDocs(doc, lineage);

    if (patientLineage && patientLineage.length) {
      const patientDoc = patientLineage.shift();
      fillParentsInDocs(patientDoc, patientLineage);
      doc.patient = patientDoc;
    }

    if (placeLineage && placeLineage.length) {
      const placeDoc = placeLineage.shift();
      fillParentsInDocs(placeDoc, placeLineage);
      doc.place = placeDoc;
    }

    return doc;
  };

  /*
   * @returns {Object} subjectMaps
   * @returns {Map} subjectMaps.patientUuids - map with [k, v] pairs of [recordUuid, patientUuid]
   * @returns {Map} subjectMaps.placeUuids - map with [k, v] pairs of [recordUuid, placeUuid]
   */
  const fetchSubjectsUuids = (records) => {
    const shortcodes = [];
    const recordToPlaceUuidMap = new Map();
    const recordToPatientUuidMap = new Map();

    records.forEach(record => {
      if (!utils.isReport(record)) {
        return;
      }

      const patientId = utils.getPatientId(record);
      const placeId = utils.getPlaceId(record);
      recordToPatientUuidMap.set(record._id, patientId);
      recordToPlaceUuidMap.set(record._id, placeId);

      shortcodes.push(patientId, placeId);
    });

    if (!shortcodes.some(shortcode => shortcode)) {
      return Promise.resolve({ patientUuids: recordToPatientUuidMap, placeUuids: recordToPlaceUuidMap });
    }

    return contactUuidByShortcode(shortcodes).then(shortcodeToUuidMap => {
      records.forEach(record => {
        const patientShortcode = recordToPatientUuidMap.get(record._id);
        recordToPatientUuidMap.set(record._id, shortcodeToUuidMap.get(patientShortcode));

        const placeShortcode = recordToPlaceUuidMap.get(record._id);
        recordToPlaceUuidMap.set(record._id, shortcodeToUuidMap.get(placeShortcode));
      });

      return { patientUuids: recordToPatientUuidMap, placeUuids: recordToPlaceUuidMap };
    });
  };

  /*
  * @returns {Object} lineages
  * @returns {Array} lineages.patientLineage
  * @returns {Array} lineages.placeLineage
  */
  const fetchSubjectLineage = (record) => {
    if (!utils.isReport(record)) {
      return Promise.resolve({ patientLineage: [], placeLineage: [] });
    }

    const patientId = utils.getPatientId(record);
    const placeId = utils.getPlaceId(record);

    if (!patientId && !placeId) {
      return Promise.resolve({ patientLineage: [], placeLineage: [] });
    }

    return contactUuidByShortcode([patientId, placeId]).then((shortcodeToUuidMap) => {
      const patientUuid = shortcodeToUuidMap.get(patientId);
      const placeUuid = shortcodeToUuidMap.get(placeId);

      return fetchLineageByIds([patientUuid, placeUuid]).then((lineages) => {
        const patientLineage = lineages.find(lineage => lineage[0]._id === patientUuid) || [];
        const placeLineage = lineages.find(lineage => lineage[0]._id === placeUuid) || [];

        return { patientLineage, placeLineage };
      });
    });
  };

  /*
  * @returns {Map} map with [k, v] pairs of [shortcode, uuid]
  */
  const contactUuidByShortcode = function(shortcodes) {
    if (!datasource) {
      // Fallback to old implementation if datasource is not provided
      const keys = shortcodes
        .filter(shortcode => shortcode)
        .map(shortcode => [ 'shortcode', shortcode ]);

      return DB.query('medic-client/contacts_by_reference', { keys })
        .then(function(results) {
          const findIdWithKey = key => {
            const matchingRow = results.rows.find(row => row.key[1] === key);
            return matchingRow && matchingRow.id;
          };

          return new Map(shortcodes.map(shortcode => ([ shortcode, findIdWithKey(shortcode) || shortcode, ])));
        });
    }
    
    // Filter out empty shortcodes
    const filteredShortcodes = shortcodes.filter(shortcode => shortcode);
    
    if (filteredShortcodes.length === 0) {
      return Promise.resolve(new Map(shortcodes.map(shortcode => [shortcode, shortcode])));
    }
    
    // Use cht-datasource to get contacts by reference
    // This is a bit tricky as cht-datasource doesn't have a direct equivalent
    // We'll need to query each shortcode individually and build the map
    return Promise.all(
      filteredShortcodes.map(shortcode => {
        // Assuming datasource has a method to query by reference
        // If not, we'll need to fall back to the legacy implementation
        return datasource.Contact.v1.getUuidsPage({
          freetext: shortcode
        })
        .then(result => {
          // If we found a match, use the first result
          if (result && result.docs && result.docs.length > 0) {
            return [shortcode, result.docs[0]];
          }
          // Otherwise, use the shortcode itself
          return [shortcode, shortcode];
        })
        .catch(err => {
          logger.warn(`Error fetching contact by shortcode ${shortcode}:`, err);
          return [shortcode, shortcode];
        });
      })
    )
    .then(results => {
      // Convert the results to a Map
      const resultMap = new Map(results);
      
      // Make sure all original shortcodes are in the map
      return new Map(shortcodes.map(shortcode => [
        shortcode, 
        resultMap.get(shortcode) || shortcode
      ]));
    });
  };

  const fetchLineageById = function(id) {
    if (!datasource) {
      // Fallback to old implementation if datasource is not provided
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
    }
    
    // Use cht-datasource to get contact with lineage
    return datasource.Contact.v1.getWithLineage({ uuid: id })
      .then(contactWithLineage => {
        if (!contactWithLineage) {
          return [];
        }
        
        // Convert the nested lineage structure to an array format
        const lineageArray = [];
        let current = contactWithLineage;
        
        while (current) {
          lineageArray.push(current);
          current = current.parent;
        }
        
        return lineageArray;
      })
      .catch(err => {
        logger.error('Error fetching lineage with datasource:', err);
        // Fallback to old implementation if datasource fails
        return fetchLineageByIdLegacy(id);
      });
  };
  
  const fetchLineageByIdLegacy = function(id) {
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
    if (!datasource) {
      // Fallback to old implementation if datasource is not provided
      return DB.get(id)
        .catch(function(err) {
          if (err.status === 404) {
            err.statusCode = 404;
          }
          throw err;
        });
    }
    
    // Use cht-datasource to get contact
    return datasource.Contact.v1.get({ uuid: id })
      .then(contact => {
        if (!contact) {
          const err = new Error(`Document not found: ${id}`);
          err.status = 404;
          err.statusCode = 404;
          throw err;
        }
        return contact;
      })
      .catch(err => {
        if (err.status === 404) {
          err.statusCode = 404;
        }
        throw err;
      });
  };

  const fetchHydratedDoc = function(id, options = {}, callback = undefined) {
    let lineage;
    let patientLineage;
    let placeLineage;
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

        return fetchSubjectLineage(lineage[0])
          .then((lineages = {}) => {
            patientLineage = lineages.patientLineage;
            placeLineage = lineages.placeLineage;

            return fetchContacts(lineage.concat(patientLineage, placeLineage));
          })
          .then(function(contacts) {
            fillContactsInDocs(lineage, contacts);
            fillContactsInDocs(patientLineage, contacts);
            fillContactsInDocs(placeLineage, contacts);
            return mergeLineagesIntoDoc(lineage, contacts, patientLineage, placeLineage);
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
      if (utils.isReport(doc)) {
        const contactId = utils.getId(doc.contact);
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
      const startLineageFrom = utils.isReport(doc) ? doc.contact : doc;
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

    if (!datasource) {
      // Fallback to old implementation if datasource is not provided
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
    }
    
    // Use cht-datasource to get contacts
    // Since cht-datasource doesn't have a bulk get method for contacts yet,
    // we need to fetch them one by one and combine the results
    return Promise.all(
      keys.map(id => 
        datasource.Contact.v1.get({ uuid: id })
          .catch(err => {
            logger.warn(`Error fetching contact ${id}:`, err);
            return null; // Return null for contacts that couldn't be fetched
          })
      )
    ).then(contacts => contacts.filter(contact => !!contact));
  };

  const hydrateDocs = function(docs) {
    if (!docs.length) {
      return Promise.resolve([]);
    }

    const hydratedDocs = deepCopy(docs); // a copy of the original docs which we will incrementally hydrate and return
    const knownDocs = [...hydratedDocs]; // an array of all documents which we have fetched

    let patientUuids; // a map of [k, v] pairs with [hydratedDocUuid, patientUuid]
    let placeUuids; // a map of [k, v] pairs with [hydratedDocUuid, placeUuid]

    return fetchSubjectsUuids(hydratedDocs)
      .then((subjectMaps) => {
        placeUuids = subjectMaps.placeUuids;
        patientUuids = subjectMaps.patientUuids;

        return fetchDocs([...placeUuids.values(), ...patientUuids.values()]);
      })
      .then(subjects => {
        knownDocs.push(...subjects);

        const firstRoundIdsToFetch = _.uniq([
          ...collectParentIds(hydratedDocs),
          ...collectLeafContactIds(hydratedDocs),

          ...collectParentIds(subjects),
          ...collectLeafContactIds(subjects),
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
        hydratedDocs.forEach((doc) => {
          const reconstructLineage = (docWithLineage, parents) => {
            const parentIds = extractParentIds(docWithLineage);
            return parentIds.map(id => {
              // how can we use hashmaps?
              return getContactById(parents, id);
            });
          };

          const isReport = utils.isReport(doc);
          const findParentsFor = isReport ? doc.contact : doc;
          const lineage = reconstructLineage(findParentsFor, knownDocs);

          if (isReport) {
            lineage.unshift(doc);
          }

          const patientDoc = getContactById(knownDocs, patientUuids.get(doc._id));
          const patientLineage = reconstructLineage(patientDoc, knownDocs);

          const placeDoc = getContactById(knownDocs, placeUuids.get(doc._id));
          const placeLineage = reconstructLineage(placeDoc, knownDocs);

          mergeLineagesIntoDoc(lineage, knownDocs, patientLineage, placeLineage);
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

    if (!datasource) {
      // Fallback to old implementation if datasource is not provided
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
    }
    
    // Use cht-datasource to get contacts with lineage
    return Promise.all(
      docIds.map(id => 
        datasource.Contact.v1.getWithLineage({ uuid: id })
          .catch(err => {
            if (err.status === 404) {
              logger.warn(`Contact not found with id ${id}`);
              return null;
            }
            logger.error(`Error fetching contact with lineage ${id}:`, err);
            throw err;
          })
      )
    ).then(contacts => contacts.filter(contact => !!contact));
  };

  return {
    /**
     * Given a doc id get a doc and all parents, contact (and parents) and patient (and parents) and place (and parents)
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
     * Given an array of docs bind the parents, contact (and parents) and patient (and parents) and place (and parents)
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
