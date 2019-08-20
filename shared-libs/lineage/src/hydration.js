const _ = require('underscore');
const { fetchDocs, reduceArrayToMapKeyedById: keyById } = require('./shared');

let promise = Promise;

const fetchHydratedDoc = (DB, id, options) => {
  return fetchDocs(promise, DB, [id])
    .then(docs => {
      if (Object.keys(docs).length === 0) {
        throw {
          msg: `Unable to fetch and hydrate doc with id: ${id}.`,
          status: 404,
          statusCode: 404,
        };
      }

      return hydrateDocs(DB, Object.values(docs), options);
    })
    .then(results => results[0]);
};

const hydrateDocs = (DB, docs, options) => {
  return hydrateRemainingComponents(DB, docs, options)
    .then(partiallyHydrated => hydrateRemainingComponents(DB, partiallyHydrated, options));
};

/*
Hydrates all the parts of the document that are present.
To fully hydrate a document, this needs to be called twice
*/
const hydrateRemainingComponents = (DB, docs, options) => {
  return fetchHydratableComponents(DB, docs, options)
    .then(components => {
      const isAlreadyHydrated = doc => {
        const attributesInUnhydratedDocs = ['_id', '_rev', 'parent', 'contact'];
        return Object.keys(doc).some(key => !attributesInUnhydratedDocs.includes(key));
      };
      const docMap = keyById(docs);
      const existingHydratedComponents = keyById(components.map(component => component.ref).filter(component => isAlreadyHydrated(component)));
      const unknownIds = _.uniq(components.map(component => component.id).filter(id => !docMap[id] && !existingHydratedComponents[id]));

      return fetchDocs(promise, DB, unknownIds).then(fetchedDocs => {
        const allKnownDocs = Object.assign(docMap, existingHydratedComponents, fetchedDocs);
        mergeDataIntoHydratableComponents(docs, components, allKnownDocs);
        return docs;
      });
    });
};

// get all the pieces within the docs that need hydrating
const fetchHydratableComponents = (DB, docs, options = { patients: true }) => {
  const patientResult = options.patients ? fetchPatients(DB, docs) : promise.resolve([]);
  
  return patientResult.then(patientComponents => {
    const remainingComponents = docs.map((doc, index) => extractHydratableParentComponents(doc, [index]));
    return _.flatten([...remainingComponents, ...patientComponents]);
  });
};

const fetchPatients = function(DB, reports) {
  const reportPatientData = reports.map(report => {
    if (!report.type === 'data_record' && !report.patient) {
      return {};
    }

    const patientId = (report.fields && report.fields.patient_id) || report.patient_id;
    const patientUuid = report.fields && report.fields.patient_uuid;
    return { patientId, patientUuid, report };
  });


  const patientUuids = reportPatientData.filter(data => data.patientUuid).map(data => data.patientUuid);
  const patientIds = reportPatientData.filter(data => !data.patientUuid && data.patientId).map(data => data.patientId);

  let promiseToFetch;
  
  if (patientIds.length === 0 && patientUuids.length === 0) {
    return promise.resolve([]);
  }

  // if there are only patientIds, query with include_docs
  else if (patientIds.length > 0 && patientUuids.length === 0) {
    promiseToFetch = fetchContactsByPatientIds(DB, patientIds, true);
  } 
  
  // if there are only patientUuids, skip the query and do allDocs
  else if (patientIds.length === 0 && patientUuids.length > 0) {
    promiseToFetch = fetchContactsByPatientUuids(DB, patientUuids);
  }

  // if there are patientUuids and patientIds, query without include_docs and then merge ids into allDocs call
  else {
    promiseToFetch = fetchContactsByPatientIds(DB, patientIds, false)
      .then(mapOfPatientIdToContactId => {
        const uuidsFromFetch = Object.values(mapOfPatientIdToContactId).map(fetched => fetched.id);
        const uuidsToFetch = _.uniq([...uuidsFromFetch, patientUuids]);
        return fetchDocs(promise, DB, uuidsToFetch)
          // the result contains a mapping of both { id -> uuid } and { uuid -> contact doc }
          .then(result => Object.assign(result, mapOfPatientIdToContactId)); 
      });
  }

  return promiseToFetch.then(result => {
    const resolveContactDocFromPatientData = patientData => {
      const { patientId, patientUuid } = patientData;
      if (patientUuid) {
        return result[patientUuid];
      }

      const ambiguousDoc = result[patientId];
      if (ambiguousDoc) {
        if (ambiguousDoc.doc) {
          // the document is present for include_docs: true (only patientIds)
          return ambiguousDoc.doc;
        } else {
          // second lookup when include_docs: false
          return result[ambiguousDoc.id];
        }
      }
    };

    reports.forEach((report, index) => {
      const patientContact = resolveContactDocFromPatientData(reportPatientData[index]);
      if (patientContact) {
        report.patient = patientContact;
      }
    });

    return reports.map((report, index) => extractHydratableParentComponents(report.patient, [index, 'patient']));
  });
};

// { contact._id -> result }
const fetchContactsByPatientUuids = (DB, patientUuids) => fetchDocs(promise, DB, patientUuids);

// { patient_id -> result }
const fetchContactsByPatientIds = (DB, patientIds, includeDocs) => {
  const keys = _.uniq(patientIds.filter(r => r)).map(patientId => [ 'shortcode', patientId ]);

  if (keys.length === 0) {
    return promise.resolve({});
  }

  const options = { keys };
  options.include_docs = !!includeDocs;

  const reduceArrayToMapByKey = arrayOfDocs => arrayOfDocs.reduce((agg, element) => {
    const patientid = element.key[1];
    if (patientid) {
      agg[patientid] = agg[patientid] || element;
    }
  
    return agg;
  }, {});

  return DB.query('medic-client/contacts_by_reference', options)
    .then(result => reduceArrayToMapByKey(result.rows));
};

const extractHydratableParentComponents = function(objWithParent, basePath, hydratable = []) {
  if (!objWithParent) {
    return hydratable;
  }

  // avoid circular hierarchies
  if (hydratable.some(component => component.ref === objWithParent)) {
    return hydratable;
  }

  const addComponent = (component, path = basePath) => hydratable.push({
    path,
    id: component._id || component.id,
    ref: component,
  });

  if (basePath.length > 1) {
    addComponent(objWithParent);
  }

  const scanAttribute = attribute => {
    const objectToScan = objWithParent[attribute];

    // if one of the hydrated components is an empty object, it should be removed
    if (!objectToScan || Object.keys(objectToScan).length === 0) {
      delete objWithParent[attribute];
      return;
    }

    extractHydratableParentComponents(objWithParent[attribute], [...basePath, attribute], hydratable);
  };
  scanAttribute('contact');
  scanAttribute('parent');
  scanAttribute('patient');

  return hydratable;
};

const mergeDataIntoHydratableComponents = (docs, components, allKnownDocs) => {
  const resolvePath = (start, path) => {
    if (path.length === 0) {
      return start;
    }

    if (!start[path[0]]) {
      start[path[0]] = {};
    }
    
    return resolvePath(start[path[0]], path.slice(1));
  };

  for (let component of components) {
    const objectAtPath = resolvePath(docs, component.path);
    const data = allKnownDocs[component.id];
    if (data) {
      Object.assign(objectAtPath, data);
    }
  }
};

module.exports = {
  injectPromise: injectedPromise => promise = injectedPromise,
  fetchHydratedDoc,
  hydrateDocs,
};
