exports.rules = [
    /*
     * A rewrite entry is needed for the POST and the GET because in SMSSync
     * the Sync URL is used for both.
     */
    {
        from: '/add',
        to: '_update/add',
        method: 'POST'
    },
    {
        from: '/add',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            include_docs: 'true',
            limit: '25'
        },
        method: 'GET'
    },
    /*
     * Use this path to specify a limit on the number of documents the view
     * will return. This allows you reduce the JSON payload the gateway
     * processes, or to increase it from the default of 25 hard coded above.
     */
    {
        from: '/add/limit/*',
        to: '_update/add',
        method: 'POST'
    },
    {
        from: '/add/limit/:limit',
        to: '_list/tasks_pending/tasks_pending',
        query: {
            include_docs: 'true',
            limit: ':limit'
        },
        method: 'GET'
    },
    {
        from: '/update_message_task/:data_record',
        to: '_update/update_message_task/:data_record',
        method: 'PUT'
    },
    {
        from: '/messages',
        to: '_view/tasks_messages',
        method: 'GET',
        query: {
            limit: '25'
        }
    },
    {
        from: '/messages/:uuid',
        to: '_view/tasks_messages',
        query: {
            key: ':uuid'
        },
        method: 'GET'
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
    },
    {
        from: '/duplicate_count/:form',
        to:'_list/duplicate_form_submissions_with_count/duplicate_form_submissions',
        query: {
            group:'true',
            startkey: [':form'],
            endkey: [':form',{}]
        }
    },
    {
        from:'/duplicate_records/:form',
        to:'_list/duplicate_individual_form_submissions/duplicate_form_submissions',
        query:{
            reduce: 'false',
            startkey: [':form'],
            endkey: [':form',{}]
        }
    }
];
