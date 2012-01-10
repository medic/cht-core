/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/add', to: '_update/add_sms', method: 'POST'},
    {from: '/docs', to: '_show/docs', method: 'GET'},
    {from: '/docs/img/*', to: 'docs/img/*', method: 'GET'},
    {from: '/docs/:page', to: '_show/docs', method: 'GET'},
    {from: '/', to: '_show/sms_forms'},
    {
        from: '/:form/sms_messages.csv',
        to: '_list/sms_messages_csv/sms_message_values',
        query: {
            startkey: [':form'],
            endkey: [':form', {}]
        }
    },
    require('nodeunit-testrunner/rewrites'),
    {from: '*', to: '_show/not_found'}
];
