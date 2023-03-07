const db = {}; // to be filled in by the initLib function exported below

const getInfoDocId = id => id + '-info';
const getDocId = infoDocId => infoDocId.slice(0, -5);
const blankInfoDoc = (docId, knownReplicationDate) => {
  return {
    _id: getInfoDocId(docId),
    type: 'info',
    doc_id: docId,
    initial_replication_date: knownReplicationDate || 'unknown',
    latest_replication_date: knownReplicationDate || 'unknown'
  };
};

const findInfoDocs = (database, ids) => {
  return database
    .allDocs({ keys: ids, include_docs: true })
    .then(results => results.rows);
};

//
// Given a set of changes, find all the infoDocs or create them as necessary. Also takes care of
// migrating legacy infodocs from the medic db, and legacy transition information from records.
//
// @param      {Array}  changes  an array of PouchDB changes objects, each containing at least {id, doc}
// @return     {Array}  array of infodocs. NB: will not necessarily be in the same order as the
//                      changes were passed in
//
const resolveInfoDocs = (changes, writeDirtyInfoDocs) => {
  if (!changes || !changes.length) {
    return Promise.resolve();
  }

  const splitInfoDocRows = results => {
    return results.reduce((acc, row) => {
      if (!row.doc) {
        acc.missing.push({_id: row.key});
      } else if (!row.doc.transitions) {
        // No transitions may mean that API created this infodoc on write but sentinel hasn't seen
        // it yet. It's possible that there is a legacy infodoc with transition information.
        acc.missingTransitions.push(row.doc);
      } else {
        acc.valid.push(row.doc);
      }

      return acc;

    }, {valid: [], missing: [], missingTransitions: []});
  };

  const infoDocIds = changes.map(change => getInfoDocId(change.id));

  // First attempt, directly from sentinel where they should live
  return findInfoDocs(db.sentinel, infoDocIds)
    .then(results => {
      const { valid, missing, missingTransitions: missingTransitionsSentinel } = splitInfoDocRows(results);

      const lookForInMedic = missing.concat(missingTransitionsSentinel).map(r => r._id);

      if (!lookForInMedic.length) {
        return valid;
      }

      // the infodocs missing transitions are still valid, we just need to look for their transitions!
      const infoDocs = valid.concat(missingTransitionsSentinel);

      // Missing infodocs or missing transitions may be either
      return findInfoDocs(db.medic, lookForInMedic)
        .then(results => {
          const migratedInfoDocs = [];
          const { valid, missing, missingTransitions: missingTransitionsMedic } = splitInfoDocRows(results);

          // Back when infodocs were in the medic db, transitions were still stored against the
          // actual document. We'll deal with this below
          valid.push(...missingTransitionsMedic);

          // Convert valid MedicDB infodocs into Sentinel ones
          valid.forEach(medicInfoDoc => {
            const sentinelInfoDoc = missingTransitionsSentinel.find(d => d._id === medicInfoDoc._id);

            const change = changes.find(change => change.id === medicInfoDoc.doc_id);

            if (sentinelInfoDoc) {
              // Merge information from the medic infodoc into sentinel's
              Object.keys(medicInfoDoc).forEach(k => {
                if (sentinelInfoDoc[k] === undefined) {
                  sentinelInfoDoc[k] = medicInfoDoc[k];
                }
              });

              // Explicitly take the older (and so more correct) initial_replication_date. These would
              // be different if a new write occurred on an old infodoc-unmigrated document, as api
              // creates a new sentinel infodoc with an initial and latest replication date
              sentinelInfoDoc.initial_replication_date = medicInfoDoc.initial_replication_date;

              // Source transitions from the document if they don't exist
              sentinelInfoDoc.transitions = sentinelInfoDoc.transitions || (change.doc && change.doc.transitions);

              migratedInfoDocs.push(sentinelInfoDoc);
            } else {
              const infoDoc = Object.assign({}, medicInfoDoc);
              delete infoDoc._rev;
              infoDoc.transitions = change.doc && change.doc.transitions;
              infoDocs.push(infoDoc);
              migratedInfoDocs.push(infoDoc);
            }

            medicInfoDoc._deleted = true;
          });

          // Intentionally not waiting on the promise for performance
          if (valid.length) {
            db.medic.bulkDocs(valid);
          }

          // Infodocs that aren't in the Medic DB. This could mean there isn't one at all, or it
          // could be that there was one without transition data back in sentinel
          missing.forEach(missingDoc => {
            const docId = getDocId(missingDoc._id);

            const collectedInfoDoc = infoDocs.find(i => i._id === missingDoc._id);
            const change = changes.find(change => change.id === docId);
            const infoDoc = collectedInfoDoc || blankInfoDoc(docId, !change.doc._rev && Date.now());

            infoDoc.transitions = change.doc && change.doc.transitions;

            if (!collectedInfoDoc) {
              infoDocs.push(infoDoc);
            }

            migratedInfoDocs.push(infoDoc);
          });

          // Store any infoDocs that have been migrated.
          if (writeDirtyInfoDocs && migratedInfoDocs.length) {
            return bulkUpdate(migratedInfoDocs);
          } else {
            return infoDocs;
          }
        });
    });
};

const updateTransition = (change, transition, ok) => {
  const info = change.info;
  info.transitions = info.transitions || {};
  info.transitions[transition] = {
    last_rev: change.doc._rev,
    seq: change.seq,
    ok: ok,
  };
};

const saveTransitions = change => {
  return db.sentinel.get(getInfoDocId(change.id))
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      return change.info;
    })
    .then(doc => {
      doc.transitions = change.info.transitions || {};
      return db.sentinel.put(doc);
    })
    .catch(err => {
      if (err.status !== 409) {
        throw err;
      }

      return saveTransitions(change);
    });
};

const bulkUpdate = infoDocs => {
  if (!infoDocs || !infoDocs.length) {
    return Promise.resolve();
  }

  return db.sentinel.bulkDocs(infoDocs).then(results => {
    const conflictingInfoDocs = [];
    results.forEach((result, idx) => {
      if(result.error === 'conflict') {
        conflictingInfoDocs.push(infoDocs[idx]);
      } else {
        infoDocs[idx]._rev = result.rev;
      }
    });

    if (conflictingInfoDocs.length > 0) {
      // Attempt an intelligent merge based on responsibilities: callers of this function own
      // everything *except* replication date metadata, which is managed by API on write (who calls
      // recordDocumentWrite[s]), and completed_tasks which is managed by outbound callers manually
      // for now (just via a db.sentinel.put)
      return findInfoDocs(db.sentinel, conflictingInfoDocs.map(d => d._id))
        .then(freshInfoDocs => {
          freshInfoDocs.forEach(({doc: freshInfoDoc}, idx) => {
            conflictingInfoDocs[idx]._rev = freshInfoDoc._rev;
            conflictingInfoDocs[idx].initial_replication_date = freshInfoDoc.initial_replication_date;
            conflictingInfoDocs[idx].latest_replication_date = freshInfoDoc.latest_replication_date;

            conflictingInfoDocs[idx].completed_tasks = freshInfoDoc.completed_tasks;
          });

          return bulkUpdate(conflictingInfoDocs);
        });
    } else {
      return infoDocs;
    }
  });
};

const recordDocumentWrite = (id, date) => {
  return db.sentinel.get(getInfoDocId(id))
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      return blankInfoDoc(id, date);
    })
    .then(infoDoc => {
      infoDoc.latest_replication_date = date;
      return db.sentinel.put(infoDoc)
        .catch(err => {
          if (err.status === 409) {
            return recordDocumentWrite(id, date);
          }

          throw err;
        });
    });
};

const recordDocumentWrites = (ids, date) => {
  const infoDocIds = ids.map(getInfoDocId);

  return db.sentinel.allDocs({
    keys: infoDocIds,
    include_docs: true
  }).then(results => {
    const updatedInfoDocs = results.rows.map(row => {
      const infoDoc = row.doc || blankInfoDoc(getDocId(row.key), date);

      infoDoc.latest_replication_date = date;

      return infoDoc;
    });

    return db.sentinel.bulkDocs(updatedInfoDocs)
      .then(bulkResults => {
        const conflictingIds = bulkResults
          .filter(r => r.error === 'conflict')
          .map(r => getDocId(r.id));

        if (conflictingIds.length > 0) {
          return recordDocumentWrites(conflictingIds, date);
        }
      });
  });
};

module.exports = {
  initLib: (medicDb, sentinelDb) => {
    db.medic = medicDb;
    db.sentinel = sentinelDb;
  },
  get: change => resolveInfoDocs([change], true).then(([firstResult]) => firstResult),
  updateTransition: (change, transition, ok) =>
    updateTransition(change, transition, ok),
  //
  // NB: resolveInfoDocs does not guarantee that its returned values are in the same order as
  // changes
  //
  bulkGet: changes => resolveInfoDocs(changes, false),
  bulkUpdate: bulkUpdate,
  saveTransitions: saveTransitions,

  // Used to update infodoc metadata that occurs at write time. A delete does not count as a write
  // in this instance, as deletes resolve as infodoc cleanups once sentinel's background-cleanup
  // scheduler gets to processing the delete
  recordDocumentWrite: id => recordDocumentWrite(id, new Date()),
  recordDocumentWrites: ids => recordDocumentWrites(ids, new Date())
};
