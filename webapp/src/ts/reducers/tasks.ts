import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/tasks';
import { Actions as GlobalActions } from '@mm-actions/global';

const initialState = {
  tasksList: [] as any[],
  selected: null,
  loaded: false,
  taskGroup: {
    lastSubmittedTask: null,
    contact: null,
    loadingContact: null as any,
  },
};


const orderByDueDateAndPriority1 = (t1, t2) => {
  const lhs = t1?.dueDate;
  const rhs = t2?.dueDate;
  if (!lhs && !rhs) {
    return 0;
  }
  if (!lhs) {
    return 1;
  }
  if (!rhs) {
    return -1;
  }

  return lhs < rhs ? -1 : 1;
};

/**
 * Task prioritization algorithm that combines:
 * 1. Overdue status (most urgent)
 * 2. Due today status (high urgency)
 * 3. Priority (importance)
 * 4. Due date (soonest first)
 * 5. Tasks without due dates (lowest priority)
 * 
 * Sorting rules (in order):
 * 1. Overdue tasks appear first (most urgent)
 * 2. Tasks due today appear next
 * 3. Then sort by priority (high to low)
 * 4. For equal priority, sort by due date (earlier first)
 * 5. Tasks without due dates appear last
 */
const orderByDueDateAndPriority2 = (t1, t2) => {

  const p1 = t1?.priority ?? 0;
  const p2 = t2?.priority ?? 0;
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  // Due date handling (Infinity for missing dates)
  const d1 = t1?.dueDate ? new Date(t1.dueDate).getTime() : Infinity;
  const d2 = t2?.dueDate ? new Date(t2.dueDate).getTime() : Infinity;
  
  // Calculate days until due (negative = overdue)
  const daysUntilDue1 = Math.floor((d1 - startOfToday) / (1000 * 60 * 60 * 24));
  const daysUntilDue2 = Math.floor((d2 - startOfToday) / (1000 * 60 * 60 * 24));
  
  // Status flags
  const isOverdue1 = daysUntilDue1 < 0;
  const isOverdue2 = daysUntilDue2 < 0;
  const isDueToday1 = daysUntilDue1 === 0;
  const isDueToday2 = daysUntilDue2 === 0;
  const hasNoDueDate1 = d1 === Infinity;
  const hasNoDueDate2 = d2 === Infinity;
    
  // 1. Overdue tasks come first (most urgent)
  if (isOverdue1 && !isOverdue2) return -1;
  if (isOverdue2 && !isOverdue1) return 1;
  if (isOverdue1 && isOverdue2) {
    // If both overdue, more overdue comes first
    return daysUntilDue1 - daysUntilDue2;
  }
  
  // 2. Tasks due today come next
  if (isDueToday1 && !isDueToday2) return -1;
  if (isDueToday2 && !isDueToday1) return 1;
  
  // 3. Then sort by priority (higher first)
  if (p1 !== p2) return p2 - p1;
  
  // 4. For equal priority, sort by due date (earlier first)
  if (d1 !== d2) return d1 - d2;
  
  // 5. Tasks without due dates come last
  if (hasNoDueDate1 && !hasNoDueDate2) return 1;
  if (hasNoDueDate2 && !hasNoDueDate1) return -1;
  
  // 6. All else being equal, maintain original order
  return 0;
};

/**
 * Task prioritization algorithm that combines:
 * 1. Overdue status (most urgent)
 * 2. Due today status (high urgency)
 * 3. Priority (importance)
 * 4. Due date (soonest first)
 * 5. Tasks without due dates (lowest priority)
 * 
 * Sorting rules (in order):
 * 1. Overdue tasks appear first (most urgent), sorted by priority (higher first)
 * 2. Tasks due today appear next, sorted by priority (higher first)
 * 3. Then sort other dates too by date and priority (high to low)
 * 4. For equal priority, sort by due date (earlier first)
 * 5. Tasks without due dates appear last
 */

const orderByDueDateAndPriority = (t1, t2) => {
  // Normalize priority to a number
  const getPriority = (t) =>
    t?.priority === 'high' ? 10 :
    t?.priority === 'medium' ? 6 :
    typeof t?.priority === 'string' ? 0 :
    t?.priority ?? 0;

  const p1 = getPriority(t1);
  const p2 = getPriority(t2);

  // Normalize due dates
  const d1 = t1?.dueDate ? new Date(t1.dueDate).getTime() : Infinity;
  const d2 = t2?.dueDate ? new Date(t2.dueDate).getTime() : Infinity;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const daysUntilDue1 = Math.floor((d1 - startOfToday) / (1000 * 60 * 60 * 24));
  const daysUntilDue2 = Math.floor((d2 - startOfToday) / (1000 * 60 * 60 * 24));

  const isOverdue1 = daysUntilDue1 < 0;
  const isOverdue2 = daysUntilDue2 < 0;
  const isDueToday1 = daysUntilDue1 === 0;
  const isDueToday2 = daysUntilDue2 === 0;
  const hasNoDueDate1 = d1 === Infinity;
  const hasNoDueDate2 = d2 === Infinity;

  // 1. Overdue tasks first, sorted by priority (higher first), then by due date (earlier first)
  if (isOverdue1 && !isOverdue2) return -1;
  if (isOverdue2 && !isOverdue1) return 1;
  if (isOverdue1 && isOverdue2) {
    if (p1 !== p2) return p2 - p1;
    return d1 - d2;
  }

  // 2. Tasks due today next, sorted by priority (higher first)
  if (isDueToday1 && !isDueToday2) return -1;
  if (isDueToday2 && !isDueToday1) return 1;
  if (isDueToday1 && isDueToday2) {
    if (p1 !== p2) return p2 - p1;
    return d1 - d2;
  }

  // 3. Other tasks: sort by due date (earlier first), then by priority (higher first)
  if (!hasNoDueDate1 && !hasNoDueDate2) {
    if (d1 !== d2) return d1 - d2;
    if (p1 !== p2) return p2 - p1;
  }

  // 4. Tasks without due dates come last
  if (hasNoDueDate1 && !hasNoDueDate2) return 1;
  if (hasNoDueDate2 && !hasNoDueDate1) return -1;

  // 5. All else being equal, maintain original order
  return 0;
};



const _tasksReducer = createReducer(
  initialState,
  on(GlobalActions.clearSelected, (state) => ({ ...state, selected: null })),

  on(Actions.setTasksList, (state, { payload: { tasks } }) => {
    return {
      ...state,
      tasksList: [...tasks].sort(orderByDueDateAndPriority),
    };
  }),

  on(Actions.setTasksLoaded, (state, { payload: { loaded }}) => ({ ...state, loaded })),

  on(Actions.setSelectedTask, (state, { payload: { selected } }) => ({ ...state, selected })),

  on(Actions.setLastSubmittedTask, (state, { payload: { task } }) => ({
    ...state,
    tasksList: state.tasksList.filter(t => task?._id !== t._id),
    taskGroup: {
      ...state.taskGroup,
      lastSubmittedTask: task
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
      lastSubmittedTask: taskGroup.lastSubmittedTask || state.taskGroup.lastSubmittedTask,
      contact: taskGroup.contact || state.taskGroup.contact,
      loadingContact: taskGroup.loadingContact || state.taskGroup.loadingContact,
    },
  })),

  on(Actions.clearTaskGroup, (state) => ({
    ...state,
    taskGroup: { ...initialState.taskGroup },
  }))
);

export const tasksReducer = (state, action) => {
  return _tasksReducer(state, action);
};
