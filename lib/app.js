/**
 * Values exported from this module will automatically be used to generate
 * the design doc pushed to CouchDB.
 */

module.exports = {
    shows: require('./shows'),
    fulltext: require('./fulltext'),
    filters: require('./filters'),
    rewrites: require('./rewrites'),
    views: require('./views')
};
