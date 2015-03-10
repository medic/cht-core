var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

module.exports = _.union(rewrites, [
    {from: '/static/*', to: 'static/*'},
    {from: '/templates/*', to: 'templates/*'},
    {from: '/bootstrap/*', to: 'bootstrap/*'},
    {from: '/select2/*', to: 'select2/*'},
    {from: '/schedules', to: '_show/workflows'},
    {from: '/schedules/:form', to: '_show/workflow'},
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
        from: '/read_records',
        to: '_view/data_records_read_by_type'
    },
    {
        from: '/message_contacts',
        to: '_view/data_records_by_contact'
    },
    {from: '/status', to: '_show/status'},
    {from: '/', to: '_show/inbox'},
    {from: '#/*', to: '_show/inbox'},
    {from: '/#/*', to: '_show/inbox'},
    {from: '/admin', to: '_show/configuration'},
    {from: '/migration', to: '_show/migration'},
    {from: '*', to: '_show/not_found'}
]);
