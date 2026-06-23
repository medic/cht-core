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
// Given a set of changes, find all the infoDocs or create them as necessary.
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
        acc.missing.push({ _id: row.key });
      } else if (!row.doc.transitions && !row.doc.transitions_started) {
        acc.missingTransitions.push(row.doc);
      } else {
        acc.valid.push(row.doc);
      }

      return acc;

    }, { valid: [], missing: [], missingTransitions: [] });
  };

  const changeForInfoDoc = infoDocId => changes.find(change => getInfoDocId(change.id) === infoDocId);

  const infoDocIds = changes.map(change => getInfoDocId(change.id));

  return findInfoDocs(db.sentinel, infoDocIds)
    .then(results => {
      const { valid, missing, missingTransitions } = splitInfoDocRows(results);

      const infoDocs = valid.concat(missingTransitions);
      const dirtyInfoDocs = [];

      missingTransitions.forEach(infoDoc => {
        const change = changeForInfoDoc(infoDoc._id);
        infoDoc.transitions = infoDoc.transitions || (change.doc && change.doc.transitions);
        dirtyInfoDocs.push(infoDoc);
      });

      missing.forEach(missingDoc => {
        const change = changeForInfoDoc(missingDoc._id);
        const infoDoc = blankInfoDoc(change.id, !change.doc._rev && Date.now());
        infoDoc.transitions = change.doc && change.doc.transitions;
        infoDocs.push(infoDoc);
        dirtyInfoDocs.push(infoDoc);
      });

      if (writeDirtyInfoDocs && dirtyInfoDocs.length) {
        return bulkUpdate(dirtyInfoDocs).then(() => infoDocs);
      }
      return infoDocs;
    });
};

const updateTransition = (change, transition, ok) => {
  const info = change.info;
  info.transitions = info.transitions || {};
  info.transitions[transition] = {
    last_rev: change.doc._rev,
    seq: change.seq,
    ok: ok,
    run_date: (new Date()).toISOString(),
  };
};

const saveTransitions = (change, clearStarted = false) => {
  const modify = infoDoc => {
    infoDoc.transitions = change.info?.transitions || {};
    // Clear the in-progress marker in the same write that commits the transitions (API branch only)
    if (clearStarted) {
      delete infoDoc.transitions_started;
    }
  };
  return modifyInfoDoc(change.id, modify, change.info);
};

const saveCompletedTasks = (id, infodoc, completedTasks = []) => {
  return modifyInfoDoc(id, infoDoc => {
    infoDoc.completed_tasks = infodoc?.completed_tasks || completedTasks;
  }, infodoc);
};

const markTransitionsStarted = (id) => {
  const modify = infoDoc => {
    infoDoc.transitions_started = new Date().toISOString();
  };
  return modifyInfoDoc(id, modify, blankInfoDoc(id));
};

const clearTransitionsStarted = (id) => {
  const modify = infoDoc => {
    delete infoDoc.transitions_started;
  };
  return modifyInfoDoc(id, modify, blankInfoDoc(id));
};

// Fetch the infodoc. If it is missing, return `fallback` (to be created) when provided;
const fetchInfoDoc = async (id, fallback) => {
  try {
    return await db.sentinel.get(getInfoDocId(id));
  } catch (err) {
    if (err.status === 404 && fallback) {
      return fallback;
    }
    throw err;
  }
};

// Fetch the infodoc, apply `modify`, and save, retrying on conflict
const modifyInfoDoc = async (id, modify, fallback) => {
  const infoDoc = await fetchInfoDoc(id, fallback);

  modify(infoDoc);

  try {
    return await db.sentinel.put(infoDoc);
  } catch (err) {
    if (err.status !== 409) {
      throw err;
    }
    return modifyInfoDoc(id, modify, fallback);
  }
};

const bulkUpdate = infoDocs => {
  if (!infoDocs || !infoDocs.length) {
    return Promise.resolve();
  }

  return db.sentinel.bulkDocs(infoDocs).then(results => {
    const conflictingInfoDocs = [];
    results.forEach((result, idx) => {
      if (result.error === 'conflict') {
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
          freshInfoDocs.forEach(({ doc: freshInfoDoc }, idx) => {
            conflictingInfoDocs[idx]._rev = freshInfoDoc._rev;
            conflictingInfoDocs[idx].initial_replication_date = freshInfoDoc.initial_replication_date;
            conflictingInfoDocs[idx].latest_replication_date = freshInfoDoc.latest_replication_date;

            conflictingInfoDocs[idx].completed_tasks = freshInfoDoc.completed_tasks;
          });

          return bulkUpdate(conflictingInfoDocs);
        });
    }
    return infoDocs;
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
  updateTransition: (change, transition, ok) => updateTransition(change, transition, ok),
  //
  // NB: resolveInfoDocs does not guarantee that its returned values are in the same order as
  // changes
  //
  bulkGet: changes => resolveInfoDocs(changes, false),
  bulkUpdate: bulkUpdate,
  saveTransitions: saveTransitions,
  saveCompletedTasks: saveCompletedTasks,
  markTransitionsStarted: markTransitionsStarted,
  clearTransitionsStarted: clearTransitionsStarted,

  // Used to update infodoc metadata that occurs at write time. A delete does not count as a write
  // in this instance, as deletes resolve as infodoc cleanups once sentinel's background-cleanup
  // scheduler gets to processing the delete
  recordDocumentWrite: id => recordDocumentWrite(id, new Date()),
  recordDocumentWrites: ids => recordDocumentWrites(ids, new Date())
};
