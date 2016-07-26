var _ = require('underscore'),
    config = require('../../config');

exports.tearDown = function(callback) {
    if (config._initFeed.restore) {
        config._initFeed.restore();
    }
    if (config._initConfig.restore) {
        config._initConfig.restore();
    }
    callback();
};

exports['initConfig signature'] = function(test) {
    test.ok(_.isFunction(config._initConfig));
    test.equals(config._initConfig.length, 2);
    test.done();
};
