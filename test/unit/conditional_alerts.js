var _ = require('underscore'),
    sinon = require('sinon'),
    messages = require('../../lib/messages'),
    transition = require('../../transitions/conditional_alerts');

exports.tearDown = function(callback) {
    if (transition._getConfig.restore){
        transition._getConfig.restore();      
    }

    if (messages.addMessage.restore){
        messages.addMessage.restore();
    }

    callback();
}

exports['onMatch signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 3);
    test.done();
};

exports['filter signature'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
};

exports['when document type is unknown do not pass filter'] = function(test) {
    test.equals(transition.filter({}), false);
    test.done();
};

exports['when document type matches pass filter'] = function(test) {
    test.equals(transition.filter({
        form: 'STCK'
    }), true);
    test.done();
};

exports['when no alerts are registered do nothing'] = function(test) {
    sinon.stub(transition, '_getConfig').returns([]);
    test.expect(2);
    transition.onMatch({}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.done();
    });
};

exports['when no alerts match document do nothing'] = function(test) {
    sinon.stub(transition, '_getConfig').returns([{
        form: 'STCK',
        condition: 'false'
    }]);
    test.expect(2);
    transition.onMatch({
        doc: {
            form: 'PINK'
        }
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.done();
    });
};

exports['when alert matches document send message'] = function(test) {
    sinon.stub(transition, '_getConfig').returns([{
        form: 'STCK',
        condition: 'true',
        message: 'hello world',
        recipient: '+5555555'
    }, {
        form: 'XXXX',
        condition: 'true',
        message: 'goodbye world',
        recipient: '+6666666'
    }]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        form: 'STCK'
    };
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+5555555',
            message: 'hello world'
        }));
        test.equals(err, null);
        test.equals(complete, true);
        test.done();
    });
};

exports['when alert matches multiple documents send message multiple times'] = function(test) {
    sinon.stub(transition, '_getConfig').returns([{
        form: 'STCK',
        condition: 'true',
        message: 'hello world',
        recipient: '+5555555'
    }, {
        form: 'STCK',
        condition: 'true',
        message: 'goodbye world',
        recipient: '+6666666'
    }]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(5);
    var doc = {
        form: 'STCK'
    };
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.ok(messageFn.calledTwice);
        test.ok(messageFn.getCall(0).calledWith({
            doc: doc,
            phone: '+5555555',
            message: 'hello world'
        }));
        test.ok(messageFn.getCall(1).calledWith({
            doc: doc,
            phone: '+6666666',
            message: 'goodbye world'
        }));
        test.equals(err, null);
        test.equals(complete, true);
        test.done();
    });
};

exports['when alert matches document and condition is true send message'] = function(test) {
    sinon.stub(transition, '_getConfig').returns([{
        form: 'STCK',
        condition: 'true',
        message: 'hello world',
        recipient: '+5555555'
    }, {
        form: 'STCK',
        condition: 'false',
        message: 'goodbye world',
        recipient: '+6666666'
    }]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        form: 'STCK'
    };
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+5555555',
            message: 'hello world'
        }));
        test.equals(err, null);
        test.equals(complete, true);
        test.done();
    });
};


exports['when alert matches document and complex condition is true send message'] = function(test) {
    sinon.stub(transition, '_getConfig').returns([{
        form: 'STCK',
        condition: 'STCK(0).s1_avail < (STCK(0).s1_used + STCK(1).s1_used + STCK(2).s1_used ) / 3',
        message: 'hello world',
        recipient: '+5555555'
    }]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        form: 'STCK'
    };
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+5555555',
            message: 'hello world'
        }));
        test.equals(err, null);
        test.equals(complete, true);
        test.done();
    });
};
