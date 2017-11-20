module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/templates/*', to: 'templates/*'},
    {from: '/status', to: '_show/status'},
    {from: '/add', to: '_update/add', method: 'POST'},
    {from: '/', to: '_show/inbox'},
    {from: '#/*', to: '_show/inbox'},
    {from: '/#/*', to: '_show/inbox'},
    {from: '/migration', to: '_show/migration'},
    {from: '*', to: '_show/not_found'},
];
