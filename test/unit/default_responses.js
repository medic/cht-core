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

exports.setUp = function(callback) {
    sinon.stub(transition, '_isReportedAfterStartDate').returns(true);
    callback();
}

exports.tearDown = function(callback) {
    restore([
        transition.filter,
        transition._isMessageEmpty,
        transition._isMessageFromGateway,
        transition._isFormNotFound,
        transition._isConfigFormsOnlyMode,
        transition._isReportedAfterStartDate,
        transition._isResponseAllowed,
        transition._getConfig,
        transition._getLocale,
        transition._translate,
        transition._addMessage,
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

exports['when doc has errors still pass filter'] = function(test) {
    test.equals(transition.filter({
        from: '+222',
        type: 'data_record',
        errors: ['foo']
    }), true);
    test.done();
};

exports['filter passes when message is from gateway'] = function(test) {
    sinon.stub(transition, '_isMessageFromGateway').returns(true);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['filter passes when message is not from gateway'] = function(test) {
    sinon.stub(transition, '_isMessageFromGateway').returns(false);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['describe _isMessageFromGateway'] = function(test) {
    var tests = [
      ['+774455558888', '77-44-5555-8888', true],
      ['+774455558889', '77-44-5555-8888', false],
      // missing country code matches
      ['+41446681800', '446681800', true]
    ];
    _.each(tests, function(t) {
      var s = sinon.stub(transition, '_getConfig');
      s.withArgs('gateway_number').returns(t[0]);
      test.equals(transition._isMessageFromGateway({from: t[1]}), t[2]);
      s.restore();
    });
    test.done();
};

exports['filter passes when response is allowed'] = function(test) {
    // Filter passes because message is added with a 'denied' state.
    sinon.stub(transition, '_isResponseAllowed').returns(true);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['filter passes when response is not allowed'] = function(test) {
    // Filter passes because message is added with a 'denied' state.
    sinon.stub(transition, '_isResponseAllowed').returns(false);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['describe _isResponseAllowed'] = function(test) {
    /*
     * Support comma separated string config to match an outgoing phone number
     * or MNO (mobile network operator) defined string.
     */
    var tests = [
      // denied
      ['+123', '+123', false],
      ['+123', '+123999999', false],
      ['SAFARI', 'SAFARICOM', false],
      ['Safari', 'SAFARICOM', false],
      ['+123,+456,+789', '+456', false],
      ['+123,+456,+789', '+4569999999', false],
      ['SAFARI, ORANGE', 'ORANGE NET', false],
      ['0', '0000123', false],
      ['0', '0', false],
      // allowed
      ['+123', '+999', true],
      ['SAFARI, ORANGE NET', 'ORANGE', true],
      ['VIVO', 'EM VIVO', true],
      ['0', '-1', true],
      // allow falsey inputs
      ['snarf', undefined, true],
      ['snarf', null, true],
      ['', '+123', true],
      ['', '', true]
    ];
    _.each(tests, function(t) {
      var s = sinon.stub(transition, '_getConfig');
      s.withArgs('outgoing_deny_list').returns(t[0]);
      test.equals(transition._isResponseAllowed({from: t[1]}), t[2]);
      s.restore();
    });
    test.done();
};

exports['do nothing if reported date is not after config start date'] = function(test) {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_isReportedAfterStartDate').returns(false);
    test.equals(transition.filter({
        from: '+222',
        type: 'data_record',
    }), false);
    test.done();
};

exports['do nothing if outgoing message'] = function(test) {
    test.equals(transition.filter({
        kujua_message: true,
        type: 'data_record',
    }), false);
    test.done();
};

exports['when doc has no errors the message is not empty'] = function(test) {
    test.equals(transition._isMessageEmpty({
        from: '+222',
        type: 'data_record',
        errors: []
    }), false);
    test.done();
};

exports['when doc has no errors, form is not found returns false'] = function(test) {
    test.equals(transition._isFormNotFound({
        from: '+222',
        type: 'data_record',
        errors: []
    }), false);
    test.done();
};


exports['isReportedAfterStartDate returns false if config start date is whitespace'] = function(test) {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_getConfig').withArgs('default_responses').returns({ start_date: ' ' });
    test.equals(transition._isReportedAfterStartDate({}), false);
    test.done();
};

exports['isReportedAfterStartDate returns true when reported date is after start date'] = function(test) {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_getConfig').withArgs('default_responses').returns({ start_date: '2014-01-01' });
    test.equals(transition._isReportedAfterStartDate({
        reported_date: 1412641215000
    }), true);
    test.done();
};

exports['isReportedAfterStartDate returns false when reported date is before start date'] = function(test) {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_getConfig').withArgs('default_responses').returns({ start_date: '2014-12-01' });
    test.equals(transition._isReportedAfterStartDate({
        reported_date: 1412641215000
    }), false);
    test.done();
};

exports['add response if unstructured message and setting enabled'] = function(test) {

    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    sinon.stub(config, 'get').withArgs('translations').returns([
        {
            'key': 'sms_received',
            'default': 'SMS rcvd, thx!'
        }
    ]);

    var messageFn = sinon.spy(messages, 'addMessage');

    test.expect(4);
    var doc = {
        form: null,
        from: '+23',
        type: 'data_record',
        errors: []
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

exports['add response if unstructured message (form prop is undefined)'] = function(test) {
    sinon.stub(config, 'get').withArgs('translations').returns([
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
        errors: []
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

exports['do not add response if valid form'] = function(test) {

    /*
     * If we receive a valid form submission (errors array is empty) then we
     * skip response handling here because validation and responses are handled
     * on different transition.
     */

    sinon.stub(config, 'get').withArgs('translations').returns([
        {
            'key': 'sms_received',
            'default': 'SMS rcvd, thx!'
        }
    ]);
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(3);
    var doc = {
        form: 'V',
        from: '+23',
        type: 'data_record',
        errors: []
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.equals(messageFn.called, false);
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });
};

exports['add response if form not found'] = function(test) {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    // stub the translations config
    sinon.stub(config, 'get').withArgs('translations').returns([
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
    sinon.stub(config, 'get').withArgs('translations').returns([
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
    sinon.stub(config, 'get').withArgs('translations').returns([
        {
            key: 'sms_received',
            default: 'SMS message rcvd',
            translations: [
                {
                    locale: 'fr',
                    content: 'Merci, votre message a été bien reçu.'
                },
                {
                    locale: 'es',
                    content: 'Recibimos tu mensaje.'

                }
            ]
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
    sinon.stub(config, 'get').withArgs('translations').returns([
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

