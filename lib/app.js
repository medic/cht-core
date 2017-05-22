/**
 * Values exported from this module will automatically be used to generate
 * the design doc pushed to CouchDB.
 */

module.exports = {
    shows: require('./shows'),
    fulltext: require('./fulltext'),
    filters: require('./filters'),
    rewrites: require('./rewrites'),
    views: require('./views'),
    validate_doc_update: require('./validate_doc_update').validate_doc_update,
    'medic-api-utils': require('medic-api-utils')
};
