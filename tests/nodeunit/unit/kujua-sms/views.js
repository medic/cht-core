var views = require('../../../../packages/kujua-sms/kujua-sms/views');

var results;

exports.setUp = function (callback) {
  results = [];
  emit = function(key, val) {
    results.push({
      key: key,
      val: val
    });
  };
  callback();
};

exports.tearDown = function (callback) {
  results = undefined;
  emit = undefined;
  callback();
};

exports['views exist'] = function (test) {
  test.strictEqual(typeof views.data_records_by_district, 'object');
  test.strictEqual(typeof views.data_records, 'object');
  test.strictEqual(typeof views.clinic_by_phone, 'object');
  test.strictEqual(typeof views.clinic_by_refid, 'object');
  test.strictEqual(typeof views.tasks_pending, 'object');
  test.done();
};
