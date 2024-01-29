
const MAX_DAYS_IN_PREGNANCY = 42 * 7;  // 42 weeks

function getRangeForTask(task) {
  const a = task.triggers.map(t => {
    t = task.triggerUnit === 'weeks' ? t * 7 : t;
    const start = t - task.pre;
    const end = t + task.post;
    return range(start, end);
  });

  // return the flattened 1D array, with distinct members
  return [...new Set([].concat.apply([], a))];
}

//1 day before start, start day, end day, 1 day after end day 
function getTaskWindowEdges(task) {
  const arrays = task.triggers.map(trigger => {
    trigger = task.triggerUnit === 'weeks' ? trigger * 7 : trigger;
    const start = trigger - task.pre;
    const end = trigger + task.post;
    return [start - 1, start, end, end + 1];
  });

  // return the flattened 1D array, with distinct members
  return [...new Set([].concat.apply([], arrays))];
}

function range(start, end, difference = 1) {
  return Array.apply(null, { length: (end - start) / difference + 1 }).map((_, i) => i * difference + start);
}

//combine range from start to end separated by d days, task window edges, get unique and sort
function getTaskTestDays(start, end, task, interval = 1) {
  return [...new Set(range(start, end, interval).concat(getTaskWindowEdges(task)))].sort(function(a, b) {return a - b;});
}

module.exports = {
  MAX_DAYS_IN_PREGNANCY,
  range,
  getRangeForTask,
  getTaskTestDays
};
