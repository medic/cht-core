var views = require('kujua-sms/views');

exports.views_exist = function (test) {
    test.expect(5);
    test.strictEqual(typeof views.sms_message_values, 'object');
    test.strictEqual(typeof views.sms_messages, 'object');
    test.strictEqual(typeof views.clinic_by_phone, 'object');
    test.strictEqual(typeof views.clinic_by_refid, 'object');
    test.strictEqual(typeof views.tasks_pending, 'object');
    test.done();
}
