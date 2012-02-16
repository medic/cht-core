/**
 * Values exported from this module will automatically be used to generate
 * the design doc pushed to CouchDB.
 */

module.exports = {
    types: require('./types'),
    shows: require('./shows'),
    views: require('./views'),
    filters: require('./filters'),
    rewrites: require('./rewrites'),
    validate_doc_update: require('./validate')
};

// bind event handlers
require('./events');
