/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/test/static/*', to: 'static/nodeunit-testrunner/*'},
    {from: '/test', to: 'static/nodeunit-testrunner/index.html'},
    {from: '/static/nodeunit-testrunner/*', to: 'static/nodeunit-testrunner/*'},
    {from: '/modules.js', to: 'modules.js'}
];

