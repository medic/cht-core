const sinon = require('sinon'),
      assert = require('chai').assert,
      messages = require('../../../src/lib/messages'),
      utils = require('../../../src/lib/utils'),
      transitionUtils = require('../../../src/transitions/utils');

describe('unit transition utils', () => {
  afterEach(() => sinon.restore());

  it('addRejectionMessage handles no configured messages', () => {
    const doc = { _id: 'a' };
    const config = { };
    const errorKey = 'notfound';
    const addMessage = sinon.stub(messages, 'addMessage');
    const addError = sinon.stub(messages, 'addError');
    transitionUtils.addRejectionMessage(doc, config, errorKey);
    assert.equal(addMessage.callCount, 1);
    assert.equal(addMessage.args[0][0]._id, 'a');
    assert.equal(addMessage.args[0][1].translationKey, 'messages.generic.notfound');
    assert.equal(addMessage.args[0][2], 'from');
    assert.equal(addError.callCount, 1);
    assert.equal(addError.args[0][0]._id, 'a');
    assert.equal(addError.args[0][1].message, 'messages.generic.notfound');
    assert.equal(addError.args[0][1].code, errorKey);
  });

  it('addRejectionMessage finds configured message', () => {
    const doc = { _id: 'a' };
    const config = { messages: [
      { event_type: 'notfound', recipient: 'bob' },
      { event_type: 'found', message: 'some message', recipient: 'jim' }
    ] };
    const errorKey = 'found';
    const addMessage = sinon.stub(messages, 'addMessage');
    const addError = sinon.stub(messages, 'addError');
    const getMessage = sinon.stub(messages, 'getMessage').returns('some message');
    const getLocale = sinon.stub(utils, 'getLocale').returns('xyz');
    transitionUtils.addRejectionMessage(doc, config, errorKey);
    assert.equal(addMessage.callCount, 1);
    assert.equal(addMessage.args[0][0]._id, 'a');
    assert.equal(addMessage.args[0][1].message, 'some message');
    assert.equal(addMessage.args[0][2], 'jim');
    assert.equal(getLocale.callCount, 1);
    assert.equal(getLocale.args[0][0]._id, 'a');
    assert.equal(getMessage.callCount, 1);
    assert.equal(getMessage.args[0][0].event_type, 'found');
    assert.equal(getMessage.args[0][1], 'xyz');
    assert.equal(addError.callCount, 1);
    assert.equal(addError.args[0][0]._id, 'a');
    assert.equal(addError.args[0][1].message, 'some message');
    assert.equal(addError.args[0][1].code, errorKey);
  });
});
