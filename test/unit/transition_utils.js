var sinon = require('sinon'),
    utils = require('../../lib/utils'),
    testUtils = require('../test_utils'),
    ids = require('../../lib/ids');

var transitionUtils = require('../../transitions/utils.js');


exports.tearDown = function(callback) {
    testUtils.restore([
        utils.getRegistrations,
        ids.generate
    ]);

    callback();
};

module.exports['addUniqueId sets an id onto a doc'] = function(test) {
  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
  sinon.stub(ids, 'generate').returns(12345);

  var doc = {};

  transitionUtils.addUniqueId({}, doc, function(err, result) {
    if (err) {
      test.fail('addUniqueId shouldnt error');
    }
    if (result) {
      test.fail('addUniqueId shouldnt return a result, it should set a value on the passed doc');
    }

    test.equal(doc.patient_id, 12345);
    test.done();
  });
};

module.exports['addUniqueId retries with a longer id if it only generates duplicates'] = function(test) {
  sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [{key: 12345}]);
  var generate = sinon.stub(ids, 'generate');
  generate.withArgs(5).returns(12345);
  generate.withArgs(6).returns(123456);

  var doc = {};

  transitionUtils.addUniqueId({}, doc, function(err, result) {
    if (err) {
      test.fail('addUniqueId shouldnt error');
    }
    if (result) {
      test.fail('addUniqueId shouldnt return a result, it should set a value on the passed doc');
    }

    test.equal(doc.patient_id, 123456);
    test.done();
  });
};
