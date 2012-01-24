/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/add', to: '_update/add_sms', method: 'POST'},
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
        from: '/tasks_referral/by_phone/:phone',
        to: '_list/tasks_referral/facilities_by_phone',
        query: {
            startkey: [':phone'],
            limit: '1',
            include_docs: 'true'
        }
    },
    {
        from: '/tasks_referral/pending',
        to: '_list/tasks_referral_pending/tasks_referral_pending',
        query: {
            descending: 'true'
        }
    },
    require('nodeunit-testrunner/rewrites'),
    {from: '*', to: '_show/not_found'}
];
