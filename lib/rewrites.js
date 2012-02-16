/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    // smssync url
    {from: '/add', to: '_update/add_sms', method: 'POST'},
    {from: '/add',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            descending: 'true',
            include_docs: 'true'
        },
        method: 'GET'},
    {from: '/docs', to: '_show/docs', method: 'GET'},
    {from: '/docs/img/*', to: 'docs/img/*', method: 'GET'},
    {from: '/docs/:page', to: '_show/docs', method: 'GET'},
    {from: '/', to: '_show/sms_forms'},
    //{from: '/gateway/tasks', to: '_show/sms_forms'},
    {
        from: '/:form/sms_messages.csv',
        to: '_list/sms_messages_csv/sms_message_values',
        query: {
            startkey: [':form'],
            endkey: [':form', {}]
        }
    },
    {
        from: '/:form/sms_messages.xml',
        to: '_list/sms_messages_xml/sms_message_values',
        query: {
            startkey: [':form'],
            endkey: [':form', {}]
        }
    },
    {
        from: '/:form/tasks_referral/add/:phone',
        to: '_list/tasks_referral/clinic_by_phone',
        query: {
            startkey: [':phone'],
            endkey: [':phone',{}]
        }
    },
    {
        from: '/:form/tasks_referral/add/refid/:refid',
        to: '_list/tasks_referral/clinic_by_refid',
        query: {
            startkey: [':refid',{}],
            endkey: [':refid'],
            descending: 'true'
        }
    },
    {
        from: '/tasks/pending',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            descending: 'true',
            include_docs: 'true'
        },
        method: 'GET'
    },
    require('nodeunit-testrunner/rewrites'),
    {from: '*', to: '_show/not_found'}
];
