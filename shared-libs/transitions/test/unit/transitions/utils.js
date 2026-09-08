const sinon = require('sinon');
const assert = require('chai').assert;
const messages = require('../../../src/lib/messages');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');

describe('unit transition utils', () => {
  let transitionUtils;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
      getTranslations: sinon.stub().returns({})
    });
    transitionUtils = require('../../../src/transitions/utils');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe('addRejectionMessage', () => {
    it('handles no configured messages', () => {
      const doc = { _id: 'a' };
      const config = { };
      const errorKey = 'notfound';
      const addMessage = sinon.stub(messages, 'addMessage');
      const addError = sinon.stub(messages, 'addError');
      transitionUtils.addRejectionMessage(doc, config, errorKey);
      assert.equal(addMessage.callCount, 1);
      assert.equal(addMessage.args[0][0]._id, 'a');
      assert.equal(addMessage.args[0][1].translation_key, 'messages.generic.notfound');
      assert.equal(addMessage.args[0][2], 'from');
      assert.equal(addError.callCount, 1);
      assert.equal(addError.args[0][0]._id, 'a');
      assert.equal(addError.args[0][1].message, 'messages.generic.notfound');
      assert.equal(addError.args[0][1].code, errorKey);
    });

    it('finds configured message', () => {
      const doc = { _id: 'a' };
      const config = {
        messages: [
          { event_type: 'notfound', recipient: 'bob' },
          { event_type: 'found', message: 'some message', recipient: 'jim' }
        ]
      };
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

    it('should pass context', () => {
      const doc = { _id: 'a', parent: { _id: 'PARENT' }, name: 'doc_name' };
      const parent = { _id: 'PARENT', name: 'parent_name' };
      const config = {
        messages: [
          { event_type: 'notfound', recipient: 'bob' },
          { event_type: 'found', message: '{{parent.name}} is not valid for {{doc_name}}', recipient: 'jim' }
        ]
      };
      const errorKey = 'found';
      const addMessage = sinon.stub(messages, 'addMessage');
      const addError = sinon.stub(messages, 'addError');
      const getMessage = sinon.stub(messages, 'getMessage').returns('{{parent.name}} is not valid for {{doc_name}}');
      const getLocale = sinon.stub(utils, 'getLocale').returns('xyz');
      transitionUtils.addRejectionMessage(doc, config, errorKey,  { parent });
      assert.equal(addMessage.callCount, 1);
      assert.equal(addMessage.args[0][0]._id, 'a');
      assert.equal(addMessage.args[0][1].message, '{{parent.name}} is not valid for {{doc_name}}');
      assert.equal(addMessage.args[0][2], 'jim');
      assert.deepEqual(addMessage.args[0][3], { parent });
      assert.equal(getLocale.callCount, 1);
      assert.equal(getLocale.args[0][0]._id, 'a');
      assert.equal(getMessage.callCount, 1);
      assert.equal(getMessage.args[0][0].event_type, 'found');
      assert.equal(getMessage.args[0][1], 'xyz');
      assert.equal(addError.callCount, 1);
      assert.equal(addError.args[0][0]._id, 'a');
      assert.equal(addError.args[0][1].message, '{{parent.name}} is not valid for {{doc_name}}');
      assert.equal(addError.args[0][1].code, errorKey);
      assert.deepEqual(addError.args[0][2], { parent });
    });
  });

  describe('addSuccessMessage', () => {
    it('should handle no configured messages and not add a task', () => {
      const doc = { _id: 'a' };
      const config = { };
      sinon.spy(messages, 'addMessage');
      transitionUtils.addSuccessMessage(doc, config, 'report_accepted');
      assert.equal(messages.addMessage.callCount, 0);
      assert.hasAllKeys(doc, ['_id']);
    });

    it('should add message when configured', () => {
      const doc = { _id: 'a', from: '123456' };
      const config = {
        messages: [{
          event_type: 'report_accepted',
          translation_key: 'success'
        }]
      };
      const eventType = 'report_accepted';
      sinon.spy(messages, 'addMessage');
      transitionUtils.addSuccessMessage(doc, config, eventType);
      assert.equal(messages.addMessage.callCount, 1);
      assert.deepEqual(messages.addMessage.args[0], [
        doc,
        {
          event_type: 'report_accepted',
          translation_key: 'success'
        },
        undefined,
        {}
      ]);

      assert.hasAllKeys(doc, ['_id', 'from', 'tasks']);
      assert.equal(doc.tasks.length, 1);
    });

    it('should pass context and recipient', () => {
      const doc = { _id: 'a', from: '123456' };
      const config = {
        messages: [{
          event_type: 'report_accepted',
          translation_key: 'success',
          recipient: 'some_recipient',
        }]
      };
      const eventType = 'report_accepted';
      const context = { some: 'context' };
      sinon.spy(messages, 'addMessage');
      transitionUtils.addSuccessMessage(doc, config, eventType, context);
      assert.equal(messages.addMessage.callCount, 1);
      assert.deepEqual(messages.addMessage.args[0], [
        doc,
        {
          event_type: 'report_accepted',
          translation_key: 'success',
          recipient: 'some_recipient',
        },
        'some_recipient',
        context,
      ]);

      assert.hasAllKeys(doc, ['_id', 'from', 'tasks']);
      assert.equal(doc.tasks.length, 1);
    });
  });

  it('getDeprecationMessage() should return message based on information provided', () => {
    assert.equal(transitionUtils.getDeprecationMessage(), undefined);
    assert.equal(transitionUtils.getDeprecationMessage('ABC'), 'ABC transition is deprecated');
    assert.equal(transitionUtils.getDeprecationMessage('ABC', '3.2.x'), 'ABC transition is deprecated since 3.2.x');
    const expectedMsg = 'ABC transition is deprecated since 3.2.x. Some extra info.';
    assert.equal(transitionUtils.getDeprecationMessage('ABC', '3.2.x', 'Some extra info.'), expectedMsg);
  });
});
