import { expect } from 'chai';

import { Actions } from '@mm-actions/target-aggregates';
import { targetAggregatesReducer, TargetAggregatesState } from '@mm-reducers/target-aggregates';

describe('Target Aggregates Reducer', () => {
  let state: TargetAggregatesState;

  beforeEach(() => {
    state = {
      selected: undefined,
      targetAggregates: [],
      error: false,
      targetAggregatesLoaded: false,
    };
  });

  it('should set initial state and add data when latest state not provided', () => {
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.setTargetAggregates(data);
    const expectedState = {
      targetAggregates: [{id: '124'}, {id: '567'}],
      error: false
    };

    const result = targetAggregatesReducer(undefined, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should not modify state when action not recognized', () => {
    const action = {type: 'UNKNOWN'};
    const expectedState = {
      targetAggregates: [],
      error: false
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should set a list of targetAggregates in state when latest state provided', () => {
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.setTargetAggregates(data);
    const expectedState = {
      targetAggregates: [{id: '124'}, {id: '567'}],
      error: false
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

  it('should set selected property to item in targetAggregates', () => {
    state = {
      selected: undefined,
      targetAggregates: [{id: '124'}, {id: '567'}],
      error: false,
      targetAggregatesLoaded: false,
    };
    const data = {id: '124'};
    const action = Actions.setSelectedTargetAggregate(data);
    const expectedState = {
      selected: {id: '124'},
      targetAggregates: [{id: '124', selected: true}, {id: '567', selected: false}],
      error: false
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should update selected property to item in targetAggregates', () => {
    state = {
      selected: {id: '124'},
      targetAggregates: [{id: '124', selected: true}, {id: '567', selected: false}],
      error: false,
      targetAggregatesLoaded: false,
    };
    const data = {id: '567'};
    const action = Actions.setSelectedTargetAggregate(data);
    const expectedState = {
      selected: {id: '567'},
      targetAggregates: [{id: '124', selected: false}, {id: '567', selected: true}],
      error: false
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should set error in state', () => {
    const data = true;
    const action = Actions.setTargetAggregatesError(data);
    const expectedState = {
      targetAggregates: [],
      error: true
    };

    const result = targetAggregatesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });
});
