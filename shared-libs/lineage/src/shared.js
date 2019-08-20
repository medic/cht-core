
const reduceArrayToMapKeyedById = arrayOfDocs => arrayOfDocs.reduce((agg, element) => {
  const id = element && (element._id || element.id);
  if (id) {
    agg[id] = agg[id] || element;
  }

  return agg;
}, {});

const fetchDocs = (promise, DB, keys) => {
  if (!Array.isArray(keys)) {
    throw Error('invalid keys');
  }

  if (keys.length === 0) {
    return promise.resolve({});
  }

  return DB.allDocs({ keys, include_docs: true })
    .then(results => results.rows.map(row => row.doc))
    .then(reduceArrayToMapKeyedById);
};

module.exports = {
  fetchDocs,
  reduceArrayToMapKeyedById,
};
