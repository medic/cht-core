/**
 * Values exported from this module will automatically be used to generate
 * the design doc pushed to CouchDB.
 */

module.exports = {
    shows: require('./shows'),
    fulltext: require('./fulltext'),
    filters: require('./filters'),
    rewrites: require('./rewrites'),
    lists: require('./lists'),
    views: require('./views'),
    updates: require('./updates'),
    validate_doc_update: require('./validate_doc_update')
};

// bind event handlers
require('./events');
