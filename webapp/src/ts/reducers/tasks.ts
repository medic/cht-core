import { createReducer, on } from '@ngrx/store';

import { Actions as GlobalActions } from '@mm-actions/global';
import { Actions } from '@mm-actions/tasks';
import { TaskEmission } from '@mm-services/rules-engine.service';
import { orderByDueDateAndPriority } from '@medic/task-utils';

export interface TasksFilters {
  taskOverdue?: boolean;
  taskTypes?: { selected: string[] };
  facilities?: { selected: string[] };
}

const initialState = {
  tasksList: [] as TaskEmission[],
  filteredTasksList: [] as TaskEmission[],
  filters: {} as TasksFilters,
  overdue: [] as TaskEmission[],
  selected: null,
  loaded: false,
  taskGroup: {
    lastSubmittedTask: null,
    contact: null,
    loadingContact: null as any,
  },
};

const applyFilters = (tasks: TaskEmission[], filters: TasksFilters = {}): TaskEmission[] => {
  let filtered = tasks;

  // Apply overdue filter
  if (filters?.taskOverdue !== undefined) {
    filtered = filtered.filter(task => task.overdue === filters.taskOverdue);
  }

  // Apply task type filter
  if (filters.taskTypes?.selected?.length) {
    const selectedTypes = filters.taskTypes.selected;
    filtered = filtered.filter(task => {
      const taskType = (task as any).resolved || task.title || '';
      return selectedTypes.includes(taskType);
    });
  }

  // Apply area/facility filter - check if any lineage ID is in selected facilities
  if (filters.facilities?.selected?.length) {
    const selectedFacilities = filters.facilities.selected;
    filtered = filtered.filter(task => {
      const lineageIds = (task as any).lineageIds || [];
      return lineageIds.some(id => selectedFacilities.includes(id));
    });
  }

  return filtered;
};

const _tasksReducer = createReducer(
  initialState,
  on(GlobalActions.clearSelected, state => ({ ...state, selected: null })),

  on(Actions.setTasksList, (state, { payload: { tasks } }) => {
    const taskEmissions = tasks as TaskEmission[];
    const sortedTasks = [...taskEmissions].sort(orderByDueDateAndPriority);
    const overdueTasks = taskEmissions.filter(task => task.overdue);
    const filteredTasks = applyFilters(sortedTasks, state.filters || {});

    return {
      ...state,
      tasksList: sortedTasks,
      filteredTasksList: filteredTasks,
      overdue: overdueTasks,
    };
  }),

  on(Actions.setTasksFilters, (state, { payload: { filters } }) => {
    const filteredTasks = applyFilters(state.tasksList, filters);

    return {
      ...state,
      filters,
      filteredTasksList: filteredTasks,
    };
  }),

  on(Actions.setOverdueTasks, (state, { payload: { tasks } }) => {
    const overdueTasks = [...state.overdue];
    tasks.forEach(({ emission }) => {
      const overdueTaskIndex = state.overdue.findIndex(overdue => overdue._id === emission._id);

      const isCurrentlyOverdue = overdueTaskIndex !== -1;

      if (isCurrentlyOverdue && !emission.overdue) {
        // was overdue, shouldn't be anymore → remove
        overdueTasks.splice(overdueTaskIndex, 1);
      } else if (!isCurrentlyOverdue && emission.overdue) {
        // wasn't overdue, should be now → add
        overdueTasks.push(emission);
      }
    });

    return {
      ...state,
      overdue: overdueTasks,
    };
  }),

  on(Actions.setTasksLoaded, (state, { payload: { loaded } }) => ({
    ...state,
    loaded,
  })),

  on(Actions.setSelectedTask, (state, { payload: { selected } }) => ({
    ...state,
    selected,
  })),

  on(Actions.setLastSubmittedTask, (state, { payload: { task } }) => ({
    ...state,
    tasksList: state.tasksList.filter(t => task?._id !== t._id),
    taskGroup: {
      ...state.taskGroup,
      lastSubmittedTask: task,
    },
  })),

  on(Actions.setTaskGroupContact, (state, { payload: { contact } }) => ({
    ...state,
    taskGroup: {
      ...state.taskGroup,
      contact,
      loadingContact: false,
    },
  })),

  on(Actions.setTaskGroupContactLoading, (state, { payload: { loading } }) => ({
    ...state,
    taskGroup: {
      ...state.taskGroup,
      loadingContact: loading,
    },
  })),

  on(Actions.setTaskGroup, (state, { payload: { taskGroup } }) => ({
    ...state,
    taskGroup: {
      lastSubmittedTask:
        taskGroup.lastSubmittedTask || state.taskGroup.lastSubmittedTask,
      contact: taskGroup.contact || state.taskGroup.contact,
      loadingContact:
        taskGroup.loadingContact || state.taskGroup.loadingContact,
    },
  })),

  on(Actions.clearTaskGroup, state => ({
    ...state,
    taskGroup: { ...initialState.taskGroup },
  })),

  on(Actions.clearTaskList, state => ({
    ...state,
    tasksList: [],
    filteredTasksList: [],
    filters: {},
  }))
);

export const tasksReducer = (state, action) => {
  return _tasksReducer(state, action);
};
