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

  it('should dispatch addSelectedConversation action', () => {
    const data = [{id: '124'}];
    const expectedAction = Actions.addSelectedConversation(data);
    const messageAction = new MessagesActions(store);
    
    messageAction.addSelectedConversation(data);
    
    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch addConversations action', () => {
    const data = [{id: '124'}, {id: '567'}];
    const expectedAction = Actions.addConversations(data);
    const messageAction = new MessagesActions(store);

    messageAction.addConversations(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });
});
