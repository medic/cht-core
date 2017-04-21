var _ = require('underscore'),
    sinon = require('sinon').sandbox.create(),
    config = require('../../config'),
    utils = require('../../lib/utils'),
    messages = require('../../lib/messages'),
    transition = require('../../transitions/default_responses');

exports.setUp = function(callback) {
    sinon.stub(transition, '_isReportedAfterStartDate').returns(true);
    callback();
};

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

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
    sinon.stub(utils, '_isMessageFromGateway').returns(true);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['filter passes when message is not from gateway'] = function(test) {
    sinon.stub(utils, '_isMessageFromGateway').returns(false);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['filter passes when response is allowed'] = function(test) {
    // Filter passes because message is added with a 'denied' state.
    sinon.stub(utils, 'isOutgoingAllowed').returns(true);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['pass filter when message is not from gateway'] = function(test) {
    sinon.stub(transition, '_getConfig').returns('+774455558889');
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
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
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'SMS rcvd, thx!' }
    });

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
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'SMS rcvd, thx!' }
    });
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
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'SMS rcvd, thx!' }
    });
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
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'SMS rcvd, thx!' }
    });
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
    sinon.stub(config, 'get').withArgs('forms_only_mode').returns(true);
    sinon.stub(transition, '_translate').withArgs('form_not_found').returns(
        'Form was not recognized.'
    );
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
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'SMS message rcvd' },
        fr: { sms_received: 'Merci, votre message a été bien reçu.' },
        es: { sms_received: 'Recibimos tu mensaje.' }
    });
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
    sinon.stub(config, 'get').withArgs('forms_only_mode').returns(true);
    sinon.stub(config, 'getTranslations').returns({
        en: { empty: 'SMS appears empty.' }
    });
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

exports['add response when recipient is allowed'] = function (test) {
    sinon.stub(utils, 'isOutgoingAllowed').returns(true);
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'ahoy mate' }
    });
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        from: 'x',
        type: 'data_record'
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: 'x',
            message: 'ahoy mate'
        }));
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });
};

exports['add response with denied state when recipient is denied'] = function (test) {
    sinon.stub(utils, 'isOutgoingAllowed').returns(false);
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'ahoy mate' }
    });
    var messageFn = sinon.spy(messages, 'addMessage');
    test.expect(4);
    var doc = {
        from: 'x',
        type: 'data_record'
    };
    transition.onMatch({ doc: doc }, {}, {}, function(err, changed) {
        test.ok(messageFn.calledOnce);
        test.ok(messageFn.calledWith({
            doc: doc,
            phone: 'x',
            message: 'ahoy mate',
            state: 'denied'
        }));
        test.equals(err, null);
        test.equals(changed, true);
        test.done();
    });
};
