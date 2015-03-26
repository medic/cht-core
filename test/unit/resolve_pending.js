var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/resolve_pending');

exports.tearDown = function(callback) {
    callback();
}

exports['filter signature'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
};

exports['filter fails on undefined tasks or scheduled_tasks'] = function(test) {
    test.equals(transition.filter({}), false);
    test.done();
};

exports['filter fails on empty tasks or scheduled_tasks'] = function(test) {
    test.equals(transition.filter({
        tasks: [],
        scheduled_tasks: []
    }), false);
    test.done();
};

exports['filter fails if task object looks wrong'] = function(test) {
    test.equals(transition.filter({
        tasks: ['foo']
    }), false);
    test.done();
};

exports['filter succeeds with message task'] = function(test) {
    test.equals(transition.filter({
        tasks: [{
            messages: [{
                to: "foo",
                message: "foo",
            }],
            state: "pending"
        }]
    }), true);
    test.done();
};

exports['filter succeeds with scheduled message tasks'] = function(test) {
    debugger;
    test.equals(transition.filter({
        scheduled_tasks: [{
            messages: [{
                to: "foo",
                message: "foo",
            }],
            state: "pending"
        }]
    }), true);
    test.done();
};

exports['filter fails with error and scheduled message task'] = function(test) {
    test.equals(transition.filter({
        errors: ['foo'],
        scheduled_tasks: [{
            messages: [{
                to: "+2896503099",
                message: "Thank you Dickson for reporting on Prudence (20047).",
            }],
            state: "pending"
        }]
    }), false);
    test.done();
};
