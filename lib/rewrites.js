var rewrites = require('kujua-sms/rewrites').rules,
    _ = require('underscore')._;

module.exports = _.union(rewrites, [
    {from: '/static/*', to: 'static/*'},
    {from: '/templates/*', to: 'templates/*'},
    {from: '/status', to: '_show/status'},
    
    // TODO delete
    {from: '/bootstrap/*', to: 'bootstrap/*'},
    // TODO delete
    {from: '/select2/*', to: 'select2/*'},

    require('app-settings/rewrites'),
    {
        from: '/facilities_select2.json',
        to: '_list/facilities_select2/facilities',
        query: {
            include_docs: 'true'
        }
    },
    {from: '/', to: '_show/inbox'},
    {from: '#/*', to: '_show/inbox'},
    {from: '/#/*', to: '_show/inbox'},
    {from: '*', to: '_show/not_found'}
]);
