const _ = require('underscore');
const {
  fetchDocs,
  reduceArrayToMapKeyedById,
} = require('./shared');

let promise = Promise;

/*
Given a set of document ids, fetch the corresponding docs and associated parents

Since PouchDB doesn't support the "queries" interface in CouchDB 2.x, fetchLineageById doesn't perform well for multiple IDs
This function is therefore an implementation of the logic in docs_by_id_lineage which parallelizes via two allDocs requests regardless of the number of docs
*/
const fetchLineageByIds = function(DB, ids) {
  return fetchDocs(promise, DB, ids).then(idToDocMap => fetchLineageForDocs(DB, Object.values(idToDocMap)));
};

const fetchLineageForDocs = function(DB, docs) {
  const lineageIds = getLineageIdsFromDocs(docs);
  const idsToFetch = _.uniq(_.flatten(lineageIds));
  const mergeFetchedDocsWithKnownDocs = fetchedDocs => Object.assign(reduceArrayToMapKeyedById(docs), fetchedDocs);
  const hydrateLineageIds = lineageDocs => lineageIds.map(lineage => lineage.map(lineageId => lineageDocs[lineageId]));
  
  return fetchDocs(promise, DB, idsToFetch)
    .then(mergeFetchedDocsWithKnownDocs)
    .then(hydrateLineageIds);
};

const getLineageIdsFromDocs = function(docs) {
  const result = [];
  for (let doc of docs) {
    let lineageIds = [];
    const isContact = [ 'contact', 'district_hospital', 'health_center', 'clinic', 'person' ].includes(doc.type);
    const isForm = doc.type === 'data_record' && doc.form;
    if (isContact) {
      lineageIds = extractParentIds(doc);
    } else if (isForm) {
      lineageIds = extractParentIds(doc.contact);
    }

    result.push(lineageIds);
  }

  return result;
};

const extractParentIds = function(objWithParent) {
  const ids = [];
  while (objWithParent && objWithParent._id) {
    ids.push(objWithParent._id);
    objWithParent = objWithParent.parent;
  }

  return ids;
};

module.exports = {
  injectPromise: injectedPromise => promise = injectedPromise,
  fetchLineageByIds
};
