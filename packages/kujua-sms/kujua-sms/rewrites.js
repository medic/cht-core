exports.rules = [
    {from: '/add', to: '_update/add_sms', method: 'POST'},
    {from: '/', to: '_show/sms_forms'},
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
        from: '/tasks_referral/pending',
        to: '_list/tasks_referral_pending/tasks_referral_pending',
        query: {
            descending: 'true',
            include_docs: 'true'
        }
    }
];
