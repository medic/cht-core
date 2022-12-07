const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../../src/config');
const messages = require('../../../src/lib/messages');

describe('default responses', () => {
  let transition;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
    });
    transition = require('../../../src/transitions/default_responses');
    sinon.stub(transition, '_isReportedAfterStartDate').returns(true);
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('when document type is unknown do not pass filter', () => {
    assert.equal(transition.filter({}), false);
  });

  it('when doc has no errors do nothing', () => {
    assert.equal(transition.filter({
      type: 'data_record',
      errors: []
    }), false);
  });

  it('when doc has no from property do nothing', () => {
    assert.equal(transition.filter({
      type: 'data_record',
      errors: ['foo']
    }), false);
  });

  it('when doc has errors still pass filter', () => {
    assert.equal(transition.filter({
      from: '+222',
      type: 'data_record',
      errors: ['foo']
    }), true);
  });

  it('filter passes when message is from gateway', () => {
    sinon.stub(messages, 'isMessageFromGateway').returns(true);
    assert.equal(transition.filter({
      from: 'x',
      type: 'data_record'
    }), true);
  });

  it('filter passes when message is not from gateway', () => {
    sinon.stub(messages, 'isMessageFromGateway').returns(false);
    assert.equal(transition.filter({
      from: 'x',
      type: 'data_record'
    }), true);
  });

  it('filter passes when response is allowed', () => {
    // Filter passes because message is added with a 'denied' state.
    sinon.stub(messages, 'isOutgoingAllowed').returns(true);
    assert.equal(transition.filter({
      from: 'x',
      type: 'data_record'
    }), true);
  });

  it('pass filter when message is not from gateway', () => {
    sinon.stub(transition, '_getConfig').returns('+774455558889');
    assert.equal(transition.filter({
      from: 'x',
      type: 'data_record'
    }), true);
  });

  it('do nothing if reported date is not after config start date', () => {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_isReportedAfterStartDate').returns(false);
    assert.equal(transition.filter({
      from: '+222',
      type: 'data_record',
    }), false);
  });

  it('do nothing if outgoing message', () => {
    assert.equal(transition.filter({
      kujua_message: true,
      type: 'data_record',
    }), false);
  });

  it('when doc has no errors the message is not empty', () => {
    assert.equal(transition._isMessageEmpty({
      from: '+222',
      type: 'data_record',
      errors: []
    }), false);
  });

  it('when doc has no errors, form is not found returns false', () => {
    assert.equal(transition._isFormNotFound({
      from: '+222',
      type: 'data_record',
      errors: []
    }), false);
  });

  it('isReportedAfterStartDate returns false if config start date is whitespace', () => {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_getConfig').withArgs('default_responses').returns({ start_date: ' ' });
    assert.equal(transition._isReportedAfterStartDate({}), false);
  });

  it('isReportedAfterStartDate returns true when reported date is after start date', () => {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_getConfig').withArgs('default_responses').returns({ start_date: '2014-01-01' });
    assert.equal(transition._isReportedAfterStartDate({
      reported_date: 1412641215000
    }), true);
  });

  it('isReportedAfterStartDate returns false when reported date is before start date', () => {
    transition._isReportedAfterStartDate.restore();
    sinon.stub(transition, '_getConfig').withArgs('default_responses').returns({ start_date: '2014-12-01' });
    assert.equal(transition._isReportedAfterStartDate({
      reported_date: 1412641215000
    }), false);
  });

  it('add response if unstructured message and setting enabled', () => {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: null,
      from: '+23',
      type: 'data_record',
      errors: []
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(messageFn.calledOnce);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].translation_key, 'sms_received');
      assert.equal(changed, true);
    });
  });

  it('add response if unstructured message (form prop is undefined)', () => {
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      from: '+23',
      type: 'data_record',
      errors: []
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(messageFn.calledOnce);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].translation_key, 'sms_received');
      assert.equal(changed, true);
    });
  });

  /*
   * If we receive a valid form submission (errors array is empty) then we
   * skip response handling here because validation and responses are handled
   * on different transition.
   */
  it('do not add response if valid form', () => {
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: 'V',
      from: '+23',
      type: 'data_record',
      errors: []
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(messageFn.called, false);
      assert.equal(changed, true);
    });
  });

  it('add response if form not found', () => {
    sinon.stub(transition, '_isConfigFormsOnlyMode').returns(false);
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      from: '+23',
      type: 'data_record',
      errors: [ { code: 'sys.form_not_found' } ]
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(messageFn.calledOnce);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].translation_key, 'sms_received');
      assert.equal(changed, true);
    });
  });

  it('add response if form not found and forms_only_mode', () => {
    config.get.withArgs('forms_only_mode').returns(true);
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      from: '+444',
      type: 'data_record',
      errors: [ { code: 'sys.form_not_found' } ]
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(messageFn.calledOnce);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].translation_key, 'form_not_found');
      assert.equal(changed, true);
    });
  });

  it('add response to empty message', () => {
    config.get.withArgs('forms_only_mode').returns(true);
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      from: '+23',
      type: 'data_record',
      errors: [ { code: 'sys.empty' } ]
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(messageFn.calledOnce);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].translation_key, 'empty');
      assert.equal(changed, true);
    });
  });
});
