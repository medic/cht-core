/**
 * Filter functions to be exported from the design doc.
 */
exports.data_records = function(doc) {
    return doc.type === 'data_record';
};

exports.tasks_by_id = function(doc, req) {
    return Array.isArray(doc.tasks) && doc._id === req.query.id;
};
