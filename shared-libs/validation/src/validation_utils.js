const _ = require('lodash/core');

let db;

const lowerCaseString = obj => typeof obj === 'string' ? obj.toLowerCase() : obj;

const executeExistsRequest = async (options) => {
  return await db.medic.query('medic-client/reports_by_freetext', options);
};

const getIntersection = responses => {
  let ids = responses.pop().rows.map(row => row.id);
  responses.forEach(response => {
    ids = ids.filter(id => _.find(response.rows, { id }));
  });
  return ids;
};

const exists = async (doc, fields, options = {}) => {
  if (!fields.length) {
    return Promise.reject('No arguments provided to "exists" validation function');
  }
  const requestOptions = fields.map(field => {
    return { key: [`${field}:${lowerCaseString(doc[field])}`] };
  });
  if (options.additionalFilter) {
    requestOptions.push({ key: [lowerCaseString(options.additionalFilter)] });
  }
  const responses = [];
  for (const options of requestOptions) {
    const response = await executeExistsRequest(options);
    responses.push(response);
  }

  const ids = getIntersection(responses).filter(id => id !== doc._id);
  if (!ids.length) {
    return false;
  }

  const result = await db.medic.allDocs({ keys: ids, include_docs: true });
  // filter out docs with errors
  const found = result.rows.some(row => {
    const doc = row.doc;
    return (
      (!doc.errors || doc.errors.length === 0) &&
      (!options.startDate || doc.reported_date >= options.startDate)
    );
  });
  return found;
};

module.exports = {
  init: (_db) => {
    db = _db;
  },
  exists,
};
