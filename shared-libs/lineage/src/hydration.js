const _ = require('underscore');
const { fetchDocs, reduceArrayToMapKeyedById } = require('./shared');

const fetchHydratedDoc = (DB, id, options) => {
  return fetchDocs(DB, [id])
    .then(docs => hydrateDocs(DB, Object.values(docs), options))
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
      const attributesInUnhydratedDocs = ['_id', '_rev', 'parent'];
      const isDocHydrated = doc => Object.keys(doc).some(key => !attributesInUnhydratedDocs.includes(key));
      
      const previouslyHydratedComponents = reduceArrayToMapKeyedById(components.map(component => component.ref).filter(component => isDocHydrated(component)));
      const unknownIds = _.uniq(components.map(component => component.id).filter(id => !previouslyHydratedComponents[id]));
      return fetchDocs(DB, unknownIds).then(fetchedDocs => {
        const docsAsMap = reduceArrayToMapKeyedById(docs);
        const allKnownDocs = Object.assign(docsAsMap, previouslyHydratedComponents, fetchedDocs);
        mergeDataIntoHydratableComponents(docs, components, allKnownDocs);
        return docs;
      });
    });
};

const fetchHydratableComponents = (DB, docs, options = { patient: true }) => {
  const patientResult = options.patient ? fetchPatients(DB, docs) : Promise.resolve([]);
  
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
  const patientIds = reportPatientData.filter(data => !data.patientUuid && data.patientId).map(data => data.patientUuid);

  const isMultipleFetchesRequired = patientIds.length > 0;
  const promises = [];
  if (patientUuids.length > 0) {
    promises.push(fetchDocs(DB, patientUuids));
  }

  return fetchContactsByPatientId(DB, patientIds, isMultipleFetchesRequired)
    .then(mapOfPatientIdToUuid => {
      if (!isMultipleFetchesRequired) {
        return mapOfPatientIdToUuid;
      }

      const fetchedIds = Object.values(mapOfPatientIdToUuid).map(fetched => fetched.id);
      const keys = _.uniq([...patientUuids, ...fetchedIds]);
      return fetchDocs(DB, keys);
    })
    .then(result => {
      const patientIdMap = reduceArrayToMapByKey(results);
      
      reports.forEach((report, index) => {
        const patientId = reportPatientData[index];
        const patientContact = patientIdMap[patientId];
        if (patientContact) {
          report.patient = patientContact;
        }
      });

      return reports.map((report, index) => extractHydratableParentComponents(report.patient, [index, 'patient']));
    });
};

const fetchContactsByPatientId = (DB, patientIds, isMultipleFetchesRequired) => {
  const keys = _.uniq(patientIds.filter(r => r)).map(patientId => [ 'shortcode', patientId ]);

  if (keys.length === 0) {
    return Promise.resolve([]);
  }

  const options = { keys };
  if (!isMultipleFetchesRequired) {
    options.include_docs = true;
  }

  const reduceArrayToMapByKey = arrayOfDocs => arrayOfDocs.reduce((agg, element) => {
    const patientid = element.key[1];
    if (patientid) {
      agg[patientid] = agg[patientid] || element.doc;
    }
  
    return agg;
  }, {});

  return DB.query('medic-client/contacts_by_reference', { keys })
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

  hydratable.push(...extractHydratableParentComponents(objWithParent.contact, [...basePath, 'contact']));
  hydratable.push(...extractHydratableParentComponents(objWithParent.parent, [...basePath, 'parent']));
  hydratable.push(...extractHydratableParentComponents(objWithParent.patient, [...basePath, 'patient']));

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
  hydrateDocs: hydrateRemainingComponents,
};
