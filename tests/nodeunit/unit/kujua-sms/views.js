var vm = require('vm'),
    views = require('../../../../lib/views'),
    clientViews = require('../../../../ddocs/compiled.json'),
    viewContext = {};

var results;

exports.setUp = function (callback) {
  results = [];
  viewContext.emit = function(key, val) {
    results.push({
      key: key,
      val: val
    });
  };
  var script = new vm.Script('data_records_read_by_type = ' + clientViews.docs[0].views.data_records_read_by_type.map);
  script.runInNewContext(viewContext);
  callback();
};

exports.tearDown = function (callback) {
  results = undefined;
  emit = undefined;
  callback();
};

exports['views exist'] = function (test) {
  test.strictEqual(typeof views.data_records_by_ancestor, 'object');
  test.strictEqual(typeof views.data_records, 'object');
  test.strictEqual(typeof views.contacts_by_refid, 'object');
  test.strictEqual(typeof views.tasks_pending, 'object');
  test.done();
};

exports['data_records_read_by_type map emits nothing when not data_record'] = function (test) {
  var doc = {
    type: 'facility'
  };
  viewContext.data_records_read_by_type(doc);
  test.same(results.length, 0);
  test.done();
};

exports['data_records_read_by_type map emits unread message'] = function (test) {
  var doc = {
    type: 'data_record'
  };
  viewContext.data_records_read_by_type(doc);
  test.same(results.length, 1);
  test.same(results[0].key[0], '_total');
  test.same(results[0].key[1], 'messages');
  test.done();
};

exports['data_records_read_by_type map emits unread report'] = function (test) {
  var doc = {
    type: 'data_record',
    form: 'ZYX'
  };
  viewContext.data_records_read_by_type(doc);
  test.same(results.length, 1);
  test.same(results[0].key[0], '_total');
  test.same(results[0].key[1], 'forms');
  test.done();
};

exports['data_records_read_by_type map emits no read when empty array'] = function (test) {
  var doc = {
    type: 'data_record',
    read: []
  };
  viewContext.data_records_read_by_type(doc);
  test.same(results.length, 1);
  test.same(results[0].key[0], '_total');
  test.same(results[0].key[1], 'messages');
  test.done();
};

exports['data_records_read_by_type map emits read when populated array'] = function (test) {
  var doc = {
    type: 'data_record',
    read: ['gareth','milan','dave'],
    form: 'ZYX'
  };
  viewContext.data_records_read_by_type(doc);
  test.same(results.length, 4);
  test.same(results[0].key[0], '_total');
  test.same(results[0].key[1], 'forms');
  test.same(results[1].key[0], 'gareth');
  test.same(results[1].key[1], 'forms');
  test.same(results[2].key[0], 'milan');
  test.same(results[2].key[1], 'forms');
  test.same(results[3].key[0], 'dave');
  test.same(results[3].key[1], 'forms');
  test.done();
};