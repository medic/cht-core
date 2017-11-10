const sinon = require('sinon').sandbox.create(),
      messages = require('../../../lib/messages'),
      utils = require('../../../lib/utils'),
      transitionUtils = require('../../../transitions/utils');

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['addRejectionMessage handles no configured messages'] = test => {
  const doc = { _id: 'a' };
  const config = { };
  const errorKey = 'notfound';
  const addMessage = sinon.stub(messages, 'GARETH_addMessage');
  const addError = sinon.stub(messages, 'addError');
  transitionUtils.addRejectionMessage(doc, config, errorKey);
  test.equals(addMessage.callCount, 1);
  test.equals(addMessage.args[0][0]._id, 'a');
  test.equals(addMessage.args[0][1].translationKey, 'messages.generic.notfound');
  test.equals(addMessage.args[0][2], 'from');
  test.equals(addError.callCount, 1);
  test.equals(addError.args[0][0]._id, 'a');
  test.equals(addError.args[0][1].message, 'messages.generic.notfound');
  test.equals(addError.args[0][1].code, errorKey);
  test.done();
};

exports['addRejectionMessage finds configured message'] = test => {
  const doc = { _id: 'a' };
  const config = { messages: [
    { event_type: 'notfound', recipient: 'bob' },
    { event_type: 'found', message: 'some message', recipient: 'jim' }
  ] };
  const errorKey = 'found';
  const addMessage = sinon.stub(messages, 'GARETH_addMessage');
  const addError = sinon.stub(messages, 'addError');
  const getMessage = sinon.stub(messages, 'getMessage').returns('some message');
  const getLocale = sinon.stub(utils, 'getLocale').returns('xyz');
  transitionUtils.addRejectionMessage(doc, config, errorKey);
  test.equals(addMessage.callCount, 1);
  test.equals(addMessage.args[0][0]._id, 'a');
  test.equals(addMessage.args[0][1].message, 'some message');
  test.equals(addMessage.args[0][2], 'jim');
  test.equals(getLocale.callCount, 1);
  test.equals(getLocale.args[0][0]._id, 'a');
  test.equals(getMessage.callCount, 1);
  test.equals(getMessage.args[0][0].event_type, 'found');
  test.equals(getMessage.args[0][1], 'xyz');
  test.equals(addError.callCount, 1);
  test.equals(addError.args[0][0]._id, 'a');
  test.equals(addError.args[0][1].message, 'some message');
  test.equals(addError.args[0][1].code, errorKey);
  test.done();
};
