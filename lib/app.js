/**
 * Values exported from this module will automatically be used to generate
 * the design doc pushed to CouchDB.
 */

module.exports = {
    shows: require('./shows'),
    filters: require('./filters'),
    rewrites: require('./rewrites'),
    views: require('./views')
};

// bind event handlers
require('./events');
