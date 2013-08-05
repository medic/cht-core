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
    {from: '/static/*', to: 'static/*'},
    {from: '/bootstrap/*', to: 'bootstrap/*'},
    {from: '/select2/*', to: 'select2/*'},
    {from: '/facilities', to: '_show/districts'},
    {from: '/facilities/clinics', to: '_show/clinics'},
    {from: '/facilities/health_centers', to: '_show/health_centers'},
    {from: '/facilities/districts', to: '_show/districts'},
    {
        from: '/facilities/backup',
        to: '_list/facilities_backup/facilities',
        query: {
            include_docs: 'true'
        }
    },
    {from: '/forms', to: '_show/sms_forms'},
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
    {from: '/', to: '_show/data_records'},
    {from: '', to: '_show/data_records'},
    {from: '/config.js', to: '_show/config'},
    {from: '*', to: '_show/not_found'}
]);
