describe('Tasks store', () => {
  'use strict';

  let tasksActions;
  let getState;
  let selectors;

  beforeEach(module('inboxApp'));

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    inject(($ngRedux, Selectors, TasksActions) => {
      tasksActions = TasksActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  };

  const createTasksState = state => ({ tasks: state });
  
  it('sets selected task', () => {
    const initialState = createTasksState({ selected: null });
    setupStore(initialState);
    const selected = {};
    tasksActions.setSelectedTask(selected);
    const state = getState();
    const tasksState = selectors.getTasksState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(tasksState).to.deep.equal({ selected });
  });

});
