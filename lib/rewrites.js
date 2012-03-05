var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = _.union(rewrites, [
    {from: '/static/docs/*', to: 'docs/*'},
    {from: '/static/*', to: 'static/*'},
    {from: '/docs/install/img/*', to: 'docs/install/img/*'},
    {from: '/docs/install/gateway/*', to: 'docs/install/gateway/*'},
    {from: '/docs/:dir/:page', to: '_show/docs'},
    {from: '/docs/:dir/', to: '_show/docs'},
    {from: '/docs/:page', to: '_show/docs'},
    {from: '/docs/', to: '_show/docs'},
    {from: '/raw/sms_messages', to: '_view/sms_messages'},
    {from: '/sms_messages', to: '_list/sms_messages/sms_messages'},
    {from: '/delete/:id',  to: '_update/deleteDoc/:id'},
    require('nodeunit-testrunner/rewrites'),
    {from: '/', to: '_show/sms_forms'},
    {from: '*', to: '_show/not_found'}
]);
