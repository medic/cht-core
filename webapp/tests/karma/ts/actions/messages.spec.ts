import sinon from 'sinon';
import { expect } from 'chai';

import { Actions, MessagesActions } from '@mm-actions/messages';

describe('Messages Action', () => {
  let store: any;

  beforeEach(() => {
    store = { dispatch: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should dispatch setSelectedConversation action', () => {
    const data = [{id: '124'}];
    const expectedAction = Actions.setSelectedConversation(data);
    const messageAction = new MessagesActions(store);
    
    messageAction.setSelectedConversation(data);
    
    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch setConversations action', () => {
    const data = [{id: '124'}, {id: '567'}];
    const expectedAction = Actions.setConversations(data);
    const messageAction = new MessagesActions(store);

    messageAction.setConversations(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });
});
