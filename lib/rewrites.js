var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = _.union(rewrites, [
    {from: '/static/*', to: 'static/*'},
    {from: '/install', to: '_show/docs', method: 'GET'},
    {from: '/install/img/*', to: 'docs/install/img/*', method: 'GET'},
    {from: '/install/gateway/*', to: 'docs/install/gateway/*', method: 'GET'},
    require('nodeunit-testrunner/rewrites'),
    {from: '/', to: '_show/sms_forms'},
    {from: '*', to: '_show/not_found'}
]);
