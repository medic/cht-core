exports.rules = [
    {from: '/add', to: '_update/add_sms', method: 'POST'},
    // by default smssync uses the same URL for tasks polling
    {from: '/add',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            include_docs: 'true',
            limit: '25'
        },
        method: 'GET'
    },
    /* use this path if you need to specify the limit */
    {from: '/add/limit/*', to: '_update/add_sms', method: 'POST'},
    {from: '/add/limit/:limit',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            include_docs: 'true',
            limit: ':limit'
        },
        method: 'GET'
    },
    //export messages by default returns nothing, startkey and endkey need to
    //be configured to get results
    {
        from: '/export/messages',
        to: '_list/export_messages/data_records',
        query: {
            include_docs: 'true',
            descending: 'true'
        }
    },
    {
        from: '/export/audit',
        to: '_list/export_audit/audit_records_by_doc',
        query: {
            include_docs: 'true',
            descending: 'true'
        }
    },
    {
        from: '/export/forms',
        to: '_list/export_data_records/data_records',
        query: {
            include_docs: 'true',
            descending: 'true'
        }
    },
    {
        from: '/export/forms/:form',
        to: '_list/export_data_records/data_records',
        query: {
            include_docs: 'true',
            descending: 'true',
            form: ':form'
        }
    }
];
