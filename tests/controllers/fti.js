var controller = require('../../controllers/fti'),
    utils = require('../../controllers/utils'),
    config = require('../../config'),
    sinon = require('sinon');

exports.setUp = function(callback) {
  callback();
};

exports.tearDown = function (callback) {
  if (utils.fti.restore) {
    utils.fti.restore();
  }
  if (config.get.restore) {
    config.get.restore();
  }
  callback();
};

exports['get returns errors from util call'] = function(test) {
  test.expect(3);
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, 'bang');
  controller.get('data_records', {}, 'abc', function(err) {
    test.equals(err.message, 'bang');
    test.equals(err.code, 503);
    test.equals(fti.callCount, 1);
    test.done();
  });
};

exports['get returns errors from query parse'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(utils, 'fti');
  controller.get('data_records', { q: 'hello' }, 'abc', function(err) {
    test.equals(err.code, 503);
    test.equals(fti.callCount, 0);
    test.done();
  });
};

exports['get returns errors from schema parse'] = function(test) {
  test.expect(2);
  var fti = sinon.stub(utils, 'fti');
  var query = { type: 'reports' };
  controller.get('data_records', { q: JSON.stringify(query), schema: 'hello' }, 'abc', function(err) {
    test.equals(err.code, 503);
    test.equals(fti.callCount, 0);
    test.done();
  });
};

exports['returns successfully without query'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var district = 'abc';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  controller.get(indexName, {}, district, function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.same(fti.firstCall.args[1], {});
    test.same(actual, expected);
    test.done();
  });
};

exports['returns successfully with query'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var query = { $operands: { name: 'gareth' } };
  controller.get(indexName, { q: JSON.stringify(query) }, null, function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'name:gareth');
    test.same(actual, expected);
    test.done();
  });
};

exports['returns successfully with query builds schema for date'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var query = { $operands: { registration_date: '2015-12-12' } };
  controller.get(indexName, { q: JSON.stringify(query) }, null, function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'registration_date<date>:"2015-12-12"');
    test.same(actual, expected);
    test.done();
  });
};

exports['returns successfully with query builds schema for number'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var query = { $operands: { errors: 0 } };
  controller.get(indexName, { q: JSON.stringify(query) }, null, function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'errors<int>:0');
    test.same(actual, expected);
    test.done();
  });
};

exports['returns successfully with query builds schema for number'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var query = { $operands: { errors: 0 } };
  controller.get(indexName, { q: JSON.stringify(query) }, null, function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'errors<int>:0');
    test.same(actual, expected);
    test.done();
  });
};

exports['returns successfully with query using provided schema'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var query = { $operands: { dob: '2014-01-01' } };
  var schema = { dob: 'date' };
  controller.get(indexName, { q: JSON.stringify(query), schema: JSON.stringify(schema) }, null, function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'dob<date>:"2014-01-01"');
    test.same(actual, expected);
    test.done();
  });
};

exports['adds district'] = function(test) {
  test.expect(5);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var query = { $operands: { name: 'gareth' } };
  controller.get(indexName, { q: JSON.stringify(query), allocatedOnly: true }, 'abc', function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'district:abc AND (name:gareth)');
    test.same(actual, expected);
    test.done();
  });
};

exports['add unallocated when setting set and user is district admin'] = function(test) {
  test.expect(7);
  var expected = [ { total_rows: 0 } ];
  var indexName = 'data_records';
  var fti = sinon.stub(utils, 'fti').callsArgWith(2, null, expected);
  var configGet = sinon.stub(config, 'get').returns(true);
  var query = { $operands: { name: 'gareth' } };
  controller.get(indexName, { q: JSON.stringify(query), allocatedOnly: false }, 'abc', function(err, actual) {
    test.equals(err, null);
    test.equals(fti.callCount, 1);
    test.equals(fti.firstCall.args[0], indexName);
    test.equals(fti.firstCall.args[1].q, 'district:(abc OR none) AND (name:gareth)');
    test.equals(configGet.callCount, 1);
    test.equals(configGet.firstCall.args[0], 'district_admins_access_unallocated_messages');
    test.same(actual, expected);
    test.done();
  });
};