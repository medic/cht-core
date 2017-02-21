var _ = require('underscore'),
    testUtils = require('../test_utils'),
    config = require('../../config');

exports.tearDown = function(callback) {
    testUtils.restore([
        config._initFeed,
        config._initConfig]);
    callback();
};

exports['initConfig signature'] = function(test) {
    test.ok(_.isFunction(config._initConfig));
    test.equals(config._initConfig.length, 2);
    test.done();
};
