const db = require('../../db');
const logger = require('../../logger');

const setTasksToComplete = (indexer) => {
  Object
    .keys(indexer.tasks)
    .forEach(pid => {
      indexer.tasks[pid] = 100;
    });
};

const updateRunningTasks = (indexers, activeTasks = []) => {
  activeTasks.forEach(task => {
    let indexer = indexers.find(indexer => indexer.design_document === task.design_document);
    if (!indexer) {
      indexer = {
        design_document: task.design_document,
        tasks: {},
      };
      indexers.push(indexer);
    }
    indexer.tasks[`${task.node}-${task.pid}`] = task.progress;
  });
};

const calculateAverageProgress = (indexer) => {
  const tasks = Object.keys(indexer.tasks);
  indexer.progress = Math.round(tasks.reduce((progress, pid) => progress + indexer.tasks[pid], 0) / tasks.length);
};

// logs indexer progress in the console
// _design/doc  [||||||||||29%||||||||||_________________________________________________________]
const logIndexersProgress = (indexers) => {
  if (!indexers || !indexers.length) {
    return;
  }

  const logProgress = (indexer) => {
    // progress bar stretches to match console width.
    // 60 is roughly the nbr of chars displayed around the bar (ddoc name + debug padding)
    const barLength = process.stdout.columns - 60;
    const progress = `${indexer.progress}%`;
    const filledBarLength = (indexer.progress / 100 * barLength);
    const bar = progress
      .padStart((filledBarLength + progress.length) / 2, '|')
      .padEnd(filledBarLength, '|')
      .padEnd(barLength, '_');
    const ddocName = indexer.design_document.padEnd(35, ' ');

    logger.info(`${ddocName}[${bar}]`);
  };
  indexers.forEach(logProgress);
};

const viewIndexerProgress = () => {
  const indexers = [];
  let timeout;

  const logIndexerProgress = async () => {
    const activeTasks = await db.activeTasks();
    const relevantTasks = activeTasks.filter(task =>
      task.type === 'indexer' && task.design_document.includes(':staged:'));

    // We assume all previous tasks have finished.
    indexers.forEach(setTasksToComplete);
    updateRunningTasks(indexers, relevantTasks);
    indexers.forEach(calculateAverageProgress);
    logIndexersProgress(indexers);
    timeout = setTimeout(logIndexerProgress, 5000);
  };

  logIndexerProgress();

  return () => {
    clearTimeout(timeout);
  };
};

module.exports = {
  viewIndexerProgress,
};
