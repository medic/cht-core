var sinon = require('sinon').sandbox.create(),
    config = require('../../config'),
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
    sinon.stub(messages, 'isMessageFromGateway').returns(true);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['filter passes when message is not from gateway'] = function(test) {
    sinon.stub(messages, 'isMessageFromGateway').returns(false);
    test.equals(transition.filter({
        from: 'x',
        type: 'data_record'
    }), true);
    test.done();
};

exports['filter passes when response is allowed'] = function(test) {
    // Filter passes because message is added with a 'denied' state.
    sinon.stub(messages, 'isOutgoingAllowed').returns(true);
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
    var messageFn = sinon.spy(messages, 'addMessage');
    var doc = {
        form: null,
        from: '+23',
        type: 'data_record',
        errors: []
    };
    transition.onMatch({ doc: doc }).then(changed => {
        test.ok(messageFn.calledOnce);
        test.equals(messageFn.args[0][0], doc);
        test.equals(messageFn.args[0][1].translation_key, 'sms_received');
        test.equals(changed, true);
        test.done();
    });
};

exports['add response if unstructured message (form prop is undefined)'] = function(test) {
    var messageFn = sinon.spy(messages, 'addMessage');
    var doc = {
        from: '+23',
        type: 'data_record',
        errors: []
    };
    transition.onMatch({ doc: doc }).then(changed => {
        test.ok(messageFn.calledOnce);
        test.equals(messageFn.args[0][0], doc);
        test.equals(messageFn.args[0][1].translation_key, 'sms_received');
        test.equals(changed, true);
        test.done();
    });
};

/*
 * If we receive a valid form submission (errors array is empty) then we
 * skip response handling here because validation and responses are handled
 * on different transition.
 */
exports['do not add response if valid form'] = function(test) {
    var messageFn = sinon.spy(messages, 'addMessage');
    var doc = {
        form: 'V',
        from: '+23',
        type: 'data_record',
        errors: []
    };
    transition.onMatch({ doc: doc }).then(changed => {
        test.equals(messageFn.called, false);
        test.equals(changed, true);
        test.done();
    });
};

exports['add response if form not found'] = function(test) {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    var messageFn = sinon.spy(messages, 'addMessage');
    var doc = {
        from: '+23',
        type: 'data_record',
        errors: [ { code: 'sys.form_not_found' } ]
    };
    transition.onMatch({ doc: doc }).then(changed => {
        test.ok(messageFn.calledOnce);
        test.equals(messageFn.args[0][0], doc);
        test.equals(messageFn.args[0][1].translation_key, 'sms_received');
        test.equals(changed, true);
        test.done();
    });
};

exports['add response if form not found and forms_only_mode'] = function(test) {
    sinon.stub(config, 'get').withArgs('forms_only_mode').returns(true);
    var messageFn = sinon.spy(messages, 'addMessage');
    var doc = {
        from: '+444',
        type: 'data_record',
        errors: [ { code: 'sys.form_not_found' } ]
    };
    transition.onMatch({ doc: doc }).then(changed => {
        test.ok(messageFn.calledOnce);
        test.equals(messageFn.args[0][0], doc);
        test.equals(messageFn.args[0][1].translation_key, 'form_not_found');
        test.equals(changed, true);
        test.done();
    });
};

exports['add response to empty message'] = function (test) {
    sinon.stub(config, 'get').withArgs('forms_only_mode').returns(true);
    var messageFn = sinon.spy(messages, 'addMessage');
    var doc = {
        from: '+23',
        type: 'data_record',
        errors: [ { code: 'sys.empty' } ]
    };
    transition.onMatch({ doc: doc }).then(changed => {
        test.ok(messageFn.calledOnce);
        test.equals(messageFn.args[0][0], doc);
        test.equals(messageFn.args[0][1].translation_key, 'empty');
        test.equals(changed, true);
        test.done();
    });
};
