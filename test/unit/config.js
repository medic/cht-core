var _ = require('underscore'),
    sinon = require('sinon'),
    config = require('../../config');

exports.tearDown = function(callback) {
    if (config._initFeed.restore) {
        config._initFeed.restore();
    }
    if (config._initConfig.restore) {
        config._initConfig.restore();
    }
    if (config._initInfo.restore) {
        config._initInfo.restore();
    }
    callback();
};

exports['initConfig signature'] = function(test) {
    test.ok(_.isFunction(config._initConfig));
    test.equals(config._initConfig.length, 2);
    test.done();
};

exports['initConfig merges settings'] = function(test) {
    sinon.stub(config, '_initFeed', function(cb) {
        console.log('stub _initFeed');
        cb();
    });
    sinon.stub(config, '_initInfo', function(cb) {
        console.log('stub _initInfo');
        cb();
    });
    var data = {
        settings: {
            schedule_morning_hours: 0,
            schedule_morning_minutes: 0,
            transitions: {
                foo: {
                    load: './transitions/foo.js'
                }
            }
        }
    };
    test.done();
    // todo
    //config._initConfig(data, function() {
    //    // test the new transition as well as some defaults are there
    //    test.ok(config.transitions.foo);
    //    test.ok(config.transitions.registration);
    //    test.ok(config.transitions.update_clinics);
    //    test.done();
    //});
};
