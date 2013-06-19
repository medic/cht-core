exports.rules = [
    {
        from: '/reporting/:form/:id',
        to: '_show/facility_reporting/:id',
        method: 'GET'
    },
    {
        from: '/reporting',
        to: '_show/facility_reporting',
        method: 'GET'
    }
];
