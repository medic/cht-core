exports.rules = [
    {from: '/add', to: '_update/add_sms', method: 'POST'},
    // by default smssync uses the same URL for tasks polling
    {from: '/add',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            descending: 'true',
            include_docs: 'true'
        },
        method: 'GET'
    },
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
        from: '/:form/tasks_referral/add/clinic/:phone',
        to: '_list/tasks_referral/clinic_by_phone',
        query: {
            startkey: [':phone'],
            endkey: [':phone',{}]
        }
    },
    {
        from: '/:form/tasks_referral/add/health_center/:phone',
        to: '_list/tasks_referral/clinic_by_parent_phone',
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
    }
];
