function(doc) {
  var READ_ONLY_TYPES = ['form', 'translations'];
  var READ_ONLY_IDS = ['resources', 'branding', 'service-worker-meta', 'zscore-charts', 'settings', 'partners'];
  var DDOC_PREFIX = ['_design/'];

  // Never replicate "purged" documents upwards
  var keys = Object.keys(doc);
  if (keys.length === 4 &&
      keys.includes('_id') &&
      keys.includes('_rev') &&
      keys.includes('_deleted') &&
      keys.includes('purged')) {
    return false;
  }

  // don't try to replicate read only docs back to the server
  return (
    READ_ONLY_TYPES.indexOf(doc.type) === -1 &&
    READ_ONLY_IDS.indexOf(doc._id) === -1 &&
    doc._id.indexOf(DDOC_PREFIX) !== 0
  );
}
