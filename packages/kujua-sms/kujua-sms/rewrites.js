exports.rules = [
    {from: '/add', to: '_update/add', method: 'POST'},
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
    {from: '/add/limit/*', to: '_update/add', method: 'POST'},
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
        from: '/export/feedback',
        to: '_list/export_feedback/feedback',
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
            descending: 'true'
        }
    },
    {
        from: '/:form/data_record/add/clinic/:phone',
        to: '_list/data_record/clinic_by_phone',
        query: {
            startkey: [':phone'],
            endkey: [':phone',{}]
        }
    },
    {
        from: '/data_record/add/facility/:phone',
        to: '_list/data_record/facility_by_phone',
        query: {
            startkey: [':phone'],
            endkey: [':phone',{}]
        }
    },
    {
        from: '/data_record/update/:id',
        to: '_update/updateRelated/:id',
        method: 'PUT'
    },
    {
        from: '/:form/data_record/add/facility/:phone',
        to: '_list/data_record/facility_by_phone',
        query: {
            startkey: [':phone'],
            endkey: [':phone',{}]
        }
    },
    {
        from: '/:form/data_record/add/health_center/:phone',
        to: '_list/data_record/clinic_by_parent_phone',
        query: {
            startkey: [':phone'],
            endkey: [':phone',{}]
        }
    },
    {
        from: '/:form/data_record/add/refid/:refid',
        to: '_list/data_record/clinic_by_refid',
        query: {
            startkey: [':refid',{}],
            endkey: [':refid'],
            descending: 'true'
        }
    }
];
