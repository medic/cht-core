var sinon = require('sinon'),
    testUtils = require('../test_utils'),
    config = require('../../config'),
    ids = require('../../lib/ids');

exports.tearDown = function(callback) {
    testUtils.restore([
        config.get
    ]);
    callback();
};

exports['generate 1000 unique short ids with less than 100 collisions'] = function(test) {
    sinon.stub(config, 'get', function() {
      return '1111';
    });
    var LIMIT = 1000,
        MAX_RETRIES = 100;
    var stats = {retries: 0, count: 0},
        data = {};
    while (stats.count < LIMIT) {
        var id = ids.generate();
        if (data[id]) {
            stats.retries++;
        } else{
            data[id] = 1;
            stats.count++;
        }
    }
    test.equals(Object.keys(data).length, LIMIT);
    test.equals(stats.retries < MAX_RETRIES, true);
    test.done();
};
