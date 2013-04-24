/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/shows/test', to: '_show/test'},
    {from: '/', to: '_show/redirect_to_tests'},
    require('nodeunit-testrunner/rewrites'),
    {from: '*', to: '_show/not_found'}
];

