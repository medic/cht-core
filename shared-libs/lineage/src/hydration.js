const _ = require('underscore');
const { fetchDocs, reduceArrayToMapKeyedById } = require('./shared');

const fetchHydratedDoc = (DB, id, options) => {
  return fetchDocs(DB, [id])
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

const hydrateRemainingComponents = (DB, docs, options) => {
  // get all the objects within the docs that need hydrating
  return fetchHydratableComponents(DB, docs, options)
    .then(components => {
      const isDocAlreadyHydrated = doc => {
        const attributesInUnhydratedDocs = ['_id', '_rev', 'parent'];
        return Object.keys(doc).some(key => !attributesInUnhydratedDocs.includes(key));
      };
      const previouslyHydratedComponents = Object.assign(
        reduceArrayToMapKeyedById(docs),
        reduceArrayToMapKeyedById(components.map(component => component.ref).filter(component => isDocAlreadyHydrated(component)))
      );
      const unknownIds = _.uniq(components.map(component => component.id).filter(id => !previouslyHydratedComponents[id]));

      return fetchDocs(DB, unknownIds).then(fetchedDocs => {
        const allKnownDocs = Object.assign(previouslyHydratedComponents, fetchedDocs);
        mergeDataIntoHydratableComponents(docs, components, allKnownDocs);
        return docs;
      });
    });
};

const fetchHydratableComponents = (DB, docs, options = { patients: true }) => {
  const patientResult = options.patients ? fetchPatients(DB, docs) : Promise.resolve([]);
  
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
    return Promise.resolve([]);
  }

  // if there are only patientIds, query with include_docs
  else if (patientIds.length > 0 && patientUuids.length === 0) {
    promiseToFetch = fetchContactsByPatientIds(DB, patientIds, true);
  } 
  
  // if there are only patientUuids, only do allDocs
  else if (patientIds.length === 0 && patientUuids.length > 0) {
    promiseToFetch = fetchContactsByPatientUuids(DB, patientUuids);
  }

  // if there are both, query without include_docs and then merge ids into allDocs call
  else {
    promiseToFetch = fetchContactsByPatientIds(DB, patientIds, false)
      .then(mapOfPatientIdToContactId => {
        const uuidsFromFetch = Object.values(mapOfPatientIdToContactId).map(fetched => fetched.id);
        const uuidsToFetch = _.uniq([...uuidsFromFetch, patientUuids]);
        return fetchDocs(DB, uuidsToFetch)
          // the result contains a mapping of both { id -> uuid } and { uuid -> contact doc }
          .then(result => Object.assign(result, mapOfPatientIdToContactId)); 
      });
  }

  return promiseToFetch.then(result => {
    const resolveContactFromPatientData = patientData => {
      const { patientId, patientUuid } = patientData;
      if (patientUuid) {
        return result[patientUuid];
      }

      const ambiguousDoc = result[patientId];
      if (ambiguousDoc) {
        if (ambiguousDoc.doc) {
          return ambiguousDoc.doc;
        } else {
          return result[ambiguousDoc.id];
        }
      }
    };

    reports.forEach((report, index) => {
      const patientContact = resolveContactFromPatientData(reportPatientData[index]);
      if (patientContact) {
        report.patient = patientContact;
      }
    });

    return reports.map((report, index) => extractHydratableParentComponents(report.patient, [index, 'patient']));
  });
};

// { contact._id -> result }
const fetchContactsByPatientUuids = (DB, patientUuids) => fetchDocs(DB, patientUuids);

// { patient_id -> result }
const fetchContactsByPatientIds = (DB, patientIds, includeDocs) => {
  const keys = _.uniq(patientIds.filter(r => r)).map(patientId => [ 'shortcode', patientId ]);

  if (keys.length === 0) {
    return Promise.resolve({});
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

const extractHydratableParentComponents = function(objWithParent, basePath) {
  const hydratable = [];

  if (!objWithParent) {
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

  const scanForHydratableComponents = attribute => {
    const objectToScan = objWithParent[attribute];

    // if one of the hydrated components is an empty object, it should be removed
    if (!objectToScan || Object.keys(objectToScan).length === 0) {
      delete objWithParent[attribute];
      return;
    }

    hydratable.push(...extractHydratableParentComponents(objWithParent[attribute], [...basePath, attribute]));
  };
  scanForHydratableComponents('contact');
  scanForHydratableComponents('parent');
  scanForHydratableComponents('patient');

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
    } else {
      console.warn(`No data found for id:${component.id}`);
    }
  }
};

module.exports = {
  fetchHydratedDoc,
  hydrateDocs,
};
