var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

try {
    rewrites.push(require('kujua-reporting/rewrites').rules);
} catch (e) {
}


/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = _.union(rewrites, [
    {from: '/static/docs/*', to: 'docs/*'},
    {from: '/static/*', to: 'static/*'},
    {from: '/bootstrap/*', to: 'bootstrap/*'},
    {from: '/docs/install/img/*', to: 'docs/install/img/*'},
    {from: '/docs/install/gateway/*', to: 'docs/install/gateway/*'},
    {from: '/docs/:dir/:page', to: '_show/docs'},
    {from: '/docs/:dir/', to: '_show/docs'},
    {from: '/docs/:page', to: '_show/docs'},
    {from: '/docs/', to: '_show/docs'},
    {from: '/facilities', to: '_show/clinics'},
    {from: '/facilities/clinics', to: '_show/clinics'},
    {from: '/facilities/health_centers', to: '_show/health_centers'},
    {from: '/facilities/districts', to: '_show/districts'},
    {from: '/data_records', to: '_show/data_records'},
    require('nodeunit-testrunner/rewrites'),
    {from: '/reminders', to: '_show/reminders'},
    {
        from: '/facilities.json/:district',
        to: '_view/facilities_by_district',
        query: {
            startkey: [':district'],
            endkey: [':district', {}],
            include_docs: 'true'
        }
    },
    {
        from: '/facilities.json',
        to: '_view/facilities',
        query: {
            include_docs: 'true'
        }
    },
    {from: '/', to: '_show/sms_forms'},
    {from: '*', to: '_show/not_found'}
]);
