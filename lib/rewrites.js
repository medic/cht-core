/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_show/sms_forms'},
    {
        from: '/:form/sms_messages.csv',
        to: '_list/sms_messages_csv/sms_message_values',
        query: {
            startkey: [':form'],
            endkey: [':form', {}],
            group: 'true',
            group_level: '1',
            reduce: 'true'
        }
    },
    {from: '*', to: '_show/not_found'}
];
