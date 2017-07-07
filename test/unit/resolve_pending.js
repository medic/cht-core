var transition = require('../../transitions/resolve_pending');

exports.tearDown = function(callback) {
    callback();
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
                to: 'foo',
                message: 'foo',
            }],
            state: 'pending'
        }]
    }), true);
    test.done();
};

exports['filter succeeds with scheduled message tasks'] = function(test) {
    test.equals(transition.filter({
        scheduled_tasks: [{
            messages: [{
                to: 'foo',
                message: 'foo',
            }],
            state: 'pending'
        }]
    }), true);
    test.done();
};

exports['filter fails with error and scheduled message task'] = function(test) {
    test.equals(transition.filter({
        errors: ['foo'],
        scheduled_tasks: [{
            messages: [{
                to: 'foo',
                message: 'foo',
            }],
            state: 'pending'
        }]
    }), false);
    test.done();
};

exports['onMatch does not cause update if message is already sent'] = function(test) {
    var doc = {
        errors: ['foo'],
        scheduled_tasks: [{
            messages: [{
                to: 'foo',
                message: 'foo',
            }],
            state: 'sent'
        }]
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.equals(changed, false);
        test.done();
    });
};
