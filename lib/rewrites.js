var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = _.union(rewrites, [
    {from: '/static/*', to: 'static/*'},
    {from: '/docs', to: '_show/docs', method: 'GET'},
    {from: '/docs/img/*', to: 'docs/img/*', method: 'GET'},
    {from: '/docs/:page', to: '_show/docs', method: 'GET'},
    require('nodeunit-testrunner/rewrites'),
    {from: '*', to: '_show/not_found'}
]);