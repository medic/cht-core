/**
 * Filter functions to be exported from the design doc.
 */
exports.data_records = function(doc) {
  return doc.type === 'data_record';
};

// TODO is this used?
exports.design_doc = function(doc) {
  return doc._id === '_design/medic';
};
