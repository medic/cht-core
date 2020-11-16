import { expect } from 'chai';

import { Actions } from '@mm-actions/target-aggregates';
import { targetAggregatesReducer, TargetAggregatesState } from '@mm-reducers/target-aggregates';

describe('Target Aggregates Reducer', () => {
  let state: TargetAggregatesState;

  beforeEach(() => {
    state = {
      selected: null,
      targetAggregates: [],
      error: false,
    };
  });

  it('should set initial state and add data when latest state not provided', () => {
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.setTargetAggregates(data);
    const expectedState = {
      targetAggregates: [{id: '124'}, {id: '567'}],
      error: false,
      selected: null
    };

    const result = targetAggregatesReducer(undefined, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should not modify state when action not recognized', () => {
    const action = {type: 'UNKNOWN'};
    const expectedState = {
      targetAggregates: [],
      error: false,
      selected: null
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should set a list of targetAggregates in state when latest state provided', () => {
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.setTargetAggregates(data);
    const expectedState = {
      targetAggregates: [{id: '124'}, {id: '567'}],
      error: false,
      selected: null
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should set the selected target in state', () => {
    const data = {id: '124'};
    const action = Actions.setSelectedTargetAggregate(data);
    const expectedState = {
      targetAggregates: [],
      error: false,
      selected: {id: '124'}
    };

    const result = targetAggregatesReducer(state, action);

    expect(result.selected).to.not.equal(null);
    expect(result).to.deep.include(expectedState);
  });

  it('should set error in state', () => {
    const data = true;
    const action = Actions.setTargetAggregatesError(data);
    const expectedState = {
      targetAggregates: [],
      error: true,
      selected: null
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });
});
