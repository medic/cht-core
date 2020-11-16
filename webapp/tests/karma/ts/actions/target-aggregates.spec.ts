import sinon from 'sinon';
import { expect } from 'chai';

import { Actions, TargetAggregates } from '@mm-actions/target-aggregates';

describe('Target Aggregates Action', () => {
  let store: any;

  beforeEach(() => {
    store = { dispatch: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should dispatch setSelectedTargetAggregate action', () => {
    const data = [ {id: '124'} ];
    const expectedAction = Actions.setSelectedTargetAggregate(data);
    const targetAggregatesAction = new TargetAggregates(store);

    targetAggregatesAction.setSelectedTargetAggregate(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch setTargetAggregates action', () => {
    const data = [ {id: '124'}, {id: '356'} ];
    const expectedAction = Actions.setTargetAggregates(data);
    const targetAggregatesAction = new TargetAggregates(store);

    targetAggregatesAction.setTargetAggregates(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });

  it('should dispatch setTargetAggregatesError action', () => {
    const data = true;
    const expectedAction = Actions.setTargetAggregatesError(data);
    const targetAggregatesAction = new TargetAggregates(store);

    targetAggregatesAction.setTargetAggregatesError(data);

    expect(store.dispatch.withArgs(expectedAction).callCount).to.equal(1);
  });
});
