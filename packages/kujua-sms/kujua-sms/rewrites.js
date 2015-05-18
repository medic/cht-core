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
