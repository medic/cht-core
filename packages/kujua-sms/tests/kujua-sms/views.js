var views = require('kujua-sms/views');

exports.views_exist = function (test) {
    test.expect(6);
    test.strictEqual(typeof views.data_records_valid_by_district_and_form, 'object');
    test.strictEqual(typeof views.data_records_by_district, 'object');
    test.strictEqual(typeof views.data_records_by_district_and_reported_date, 'object');
    test.strictEqual(typeof views.clinic_by_phone, 'object');
    test.strictEqual(typeof views.clinic_by_refid, 'object');
    test.strictEqual(typeof views.tasks_pending, 'object');
    test.done();
}
