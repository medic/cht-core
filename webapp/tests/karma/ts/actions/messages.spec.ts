import sinon from 'sinon';
import { expect } from 'chai';

import { Actions, MessagesActions } from '@mm-actions/messages';

describe('Messages Action', () => {
  let store: any;
  let globalActions:any = {
    settingSelected: sinon.stub()
  };

  beforeEach(() => {
    store = { dispatch: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should dispatch setSelectedConversation action', () => {
    const data = [{id: '124'}];
    const expectedAction = Actions.setSelectedConversation(data);
    const messageAction = new MessagesActions(store, globalActions);
    
    messageAction.setSelectedConversation(data);
    
    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch setConversations action', () => {
    const data = [{id: '124'}, {id: '567'}];
    const expectedAction = Actions.setConversations(data);
    const messageAction = new MessagesActions(store, globalActions);

    messageAction.setConversations(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch setMessagesError action', () => {
    const data = true;
    const expectedAction = Actions.setMessagesError(data);
    const messageAction = new MessagesActions(store, globalActions);

    messageAction.setMessagesError(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch removeMessageFromSelectedConversation action', () => {
    const id = '12345';
    const expectedAction = Actions.removeMessageFromSelectedConversation(id);
    const messageAction = new MessagesActions(store, globalActions);

    messageAction.removeMessageFromSelectedConversation(id);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch updateSelectedConversation action', () => {
    const data = {id: '124'};
    const expectedAction = Actions.updateSelectedConversation(data);
    const messageAction = new MessagesActions(store, globalActions);

    messageAction.updateSelectedConversation(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch setSelected action', () => {
    const doc = {id: '124'};
    const refresh = false;
    const messageAction = new MessagesActions(store, globalActions);
    const setSelectedConversationSpy = sinon.spy(messageAction, 'setSelectedConversation');

    messageAction.setSelected(doc, refresh);

    expect(globalActions.settingSelected.withArgs(refresh).callCount).to.equal(1);
    expect(setSelectedConversationSpy.withArgs(doc).callCount).to.equal(1);
  });

  it('should dispatch markSelectedConversationRead action', () => {
    const expectedAction = Actions.markSelectedConversationRead();
    const messageAction = new MessagesActions(store, globalActions);

    messageAction.markSelectedConversationRead();

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });
});
