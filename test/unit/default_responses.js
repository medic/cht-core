var _ = require('underscore'),
    sinon = require('sinon'),
    config = require('../../config'),
    utils = require('../../lib/utils'),
    messages = require('../../lib/messages'),
    transition = require('../../transitions/default_responses');

var restore = function(objs) {
    _.each(objs, function(obj) {
        if (obj.restore) obj.restore();
    });
}

exports.tearDown = function(callback) {
    restore([
        transition._isConfigFormsOnlyMode,
        config.get,
        messages.addMessage
    ]);
    callback();
}

exports['onMatch signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 4);
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

exports['when doc has no errors do nothing'] = function(test) {
    test.equals(transition.filter({
        type: 'data_record',
        errors: []
    }), false);
    test.done();
};

exports['when doc has no from property do nothing'] = function(test) {
    test.equals(transition.filter({
        type: 'data_record',
        errors: ['foo']
    }), false);
    test.done();
};

exports['when document type and errors matches pass filter'] = function(test) {
    test.equals(transition.filter({
        from: '+222',
        type: 'data_record',
        errors: ['foo']
    }), true);
    test.done();
};

exports['add response if form not found'] = function(test) {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    // stub the translations config
    sinon.stub(config, 'get').returns([
        {
            'key': 'sms_received',
            'default': 'SMS rcvd, thx!'
        }
    ]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        from: '+23',
        type: 'data_record',
        errors: [
            {
                code: 'sys.form_not_found'
            }
        ]
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+23',
            message: 'SMS rcvd, thx!'
        }));
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });
};

exports['add response if form not found and forms_only_mode'] = function(test) {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(true);
    // stub the translations config
    sinon.stub(config, 'get').returns([
        {
            'key': 'form_not_found',
            'default': 'Form was not recognized.'
        }
    ]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        from: '+444',
        type: 'data_record',
        errors: [
            {
                code: 'sys.form_not_found'
            }
        ]
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+444',
            message: 'Form was not recognized.'
        }));
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });
};

exports['add response if form not found and respect locale'] = function(test) {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    sinon.stub(transition, '_getLocale').returns('fr');
    // stub the translations config
    sinon.stub(config, 'get').returns([
        {
            'key': 'sms_received',
            'default': 'SMS message rcvd',
            'fr': 'Merci, votre message a été bien reçu.'
        }
    ]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);

    // locale value should be somewhere on the doc but will test that
    // functionality elsewhere.
    var doc = {
        from: '+444',
        type: 'data_record',
        errors: [
            {
                code: 'sys.form_not_found'
            }
        ]
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+444',
            message: 'Merci, votre message a été bien reçu.'
        }));
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });

};

exports['add response to empty message'] = function (test) {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    // stub the translations config
    sinon.stub(config, 'get').returns([
        {
            'key': 'empty',
            'default': 'SMS appears empty.'
        }
    ]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        from: '+23',
        type: 'data_record',
        errors: [
            {
                code: 'sys.empty'
            }
        ]
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: '+23',
            message: 'SMS appears empty.'
        }));
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });
};

