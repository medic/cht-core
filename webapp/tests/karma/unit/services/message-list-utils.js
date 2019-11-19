describe('Message list utils', () => {
  'use strict';

  let service;

  beforeEach(() => {
    module('inboxApp');
    inject(_MessageListUtils_ => {
      service = _MessageListUtils_;
    });
  });

  describe('removeDeleted', () => {
    it('Removes messages that no longer exist from the passed message list', () => {
      const allMessages = [
        {key: 'a', message: {inAllMessages: true}},
        {key: 'b', message: {inAllMessages: true}},
        {key: 'c', message: {inAllMessages: true}},
        {key: 'd', message: {inAllMessages: true}},
        {key: 'e', message: {inAllMessages: true}},
      ];
      const updatedMessages = [
        {key: 'a', message: {updatedMessage: true}},
        {key: 'c', message: {updatedMessage: true}},
      ];

      service.removeDeleted(allMessages, updatedMessages);

      chai.expect(allMessages).to.deep.equal([
        {key: 'a', message: {inAllMessages: true}},
        {key: 'c', message: {inAllMessages: true}},
      ]);
    });
  });

  describe('mergeUpdated', () => {

    it('Adds new messages to allMessages', () => {
      const allMessages = [
        {key: 'a', message: {inAllMessages: true}},
        {key: 'c', message: {inAllMessages: true}}
      ];
      const updatedMessages = [
        {key: 'b', message: {fromUpdatedMessages: true}}
      ];

      service.mergeUpdated(allMessages, updatedMessages);

      chai.expect(allMessages).to.deep.equal([
        {key: 'a', message: {inAllMessages: true}},
        {key: 'c', message: {inAllMessages: true}},
        {key: 'b', message: {fromUpdatedMessages: true}}
      ]);
    });

    it('Replaces updated messages in allMessages', () => {
      const allMessages = [
        {key: 'a', message: {inAllMessages: true}},
        {key: 'b', message: {inAllMessages: true}, read: true},
        {key: 'c', message: {inAllMessages: true}}
      ];
      const updatedMessages = [
        {key: 'b', message: {fromUpdatedMessages: true}}
      ];

      service.mergeUpdated(allMessages, updatedMessages);

      chai.expect(allMessages).to.deep.equal([
        {key: 'a', message: {inAllMessages: true}},
        {key: 'b', message: {fromUpdatedMessages: true}, read: false},
        {key: 'c', message: {inAllMessages: true}}
      ]);
    });

  });
});
