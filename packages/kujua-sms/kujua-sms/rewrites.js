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
        from: '/:form/data_records.csv',
        to: '_list/data_records_csv/data_records_valid_by_district_and_form'
    },
    {
        from: '/:form/data_records.xml',
        to: '_list/data_records_xml/data_records_valid_by_district_and_form'
    },
    {
        from: '/clinics.json',
        to: '_view/clinic_by_phone',
        query: {
            include_docs: 'true'
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
        from: '/CNPW/data_record/merge/:phone/:wkn',
        to: '_list/data_record_merge/data_record_by_phone_and_wkn',
        query: {
            startkey: [':phone', ':wkn'],
            endkey: [':phone', ':wkn', {}]
        }
    },
    {
        from: '/:form/data_record/merge/:year/:month/:clinic_id',
        to: '_list/data_record_merge/data_record_by_year_month_and_clinic_id',
        query: {
            startkey: [':year', ':month', ':clinic_id'],
            endkey: [':year', ':month', ':clinic_id', {}]
        }
    },
];
