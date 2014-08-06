var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

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
    {from: '/settings', to: '_show/configuration'},
    {from: '/schedules', to: '_show/workflows'},
    {from: '/schedules/:form', to: '_show/workflow'},
    {from: '/users', to: '_show/users'},
    require('nodeunit-testrunner/rewrites'),
    require('app-settings/rewrites'),
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
    {
        from: '/facilities_select2.json',
        to: '_list/facilities_select2/facilities',
        query: {
            include_docs: 'true'
        }
    },
    {
        from: '/data_records',
        to: '_list/data_records/data_records'
    },
    {from: '/', to: '_show/inbox'},
    {from: '#/*', to: '_show/inbox'},
    {from: '/#/*', to: '_show/inbox'},
    {from: '/admin', to: '_show/configuration'},
    {from: '/config.js', to: '_show/config'},
    {from: '/help', to: '_show/help'},
    {from: '/help/:page', to: '_show/help'},
    {from: '/migration', to: '_show/migration'},
    {from: '*', to: '_show/not_found'}
]);
