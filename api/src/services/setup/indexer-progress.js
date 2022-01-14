const db = require('../../db');
const logger = require('../../logger');

const QUERY_TASKS_INTERVAL = 5000;
// progress bar stretches to match console width.
// 60 is roughly the nbr of chars displayed around the bar (ddoc name + debug padding)
const INDEXER_BAR_PREFIX = 60;
const DDOC_NAME_PAD = 35;

const setTasksToComplete = (indexer) => {
  Object
    .keys(indexer.tasks)
    .forEach(pid => {
      indexer.tasks[pid] = 100;
    });
};

const updateRunningTasks = (indexers, activeTasks = []) => {
  activeTasks.forEach(task => {
    let indexer = indexers.find(indexer => {
      return indexer.design_document === task.design_document && indexer.database === task.database;
    });
    if (!indexer) {
      indexer = {
        database: task.database,
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
  if (!indexers || !Array.isArray(indexers) || !indexers.length) {
    return;
  }

  const logProgress = (indexer) => {
    const barLength = (process.stdout.columns - INDEXER_BAR_PREFIX) || 1;
    const progress = `${indexer.progress}%`;
    const filledBarLength = Math.floor(indexer.progress / 100 * barLength);
    const bar = progress
      .padStart(Math.floor((filledBarLength + progress.length) / 2), '|')
      .padEnd(filledBarLength, '|')
      .padEnd(barLength, '_');
    const ddocName = `${indexer.database}/${indexer.design_document}`.padEnd(DDOC_NAME_PAD, ' ');

    logger.info(`${ddocName}[${bar}]`);
  };
  indexers.forEach(logProgress);
};

const getIndexers = async (indexers = []) => {
  try {
    const activeTasks = await db.activeTasks();
    const tasks = activeTasks.filter(task => task.type === 'indexer' && task.design_document.includes(':staged:'));
    // We assume all previous tasks have finished.
    indexers.forEach(setTasksToComplete);
    updateRunningTasks(indexers, tasks);
    indexers.forEach(calculateAverageProgress);
    return indexers;
  } catch (err) {
    logger.error('Error while querying active tasks: %o', err);
    return indexers;
  }
};

const logProgress = () => {
  let timeout;
  let indexers = [];

  const logIndexerProgress = async () => {
    indexers = await getIndexers(indexers);
    logIndexersProgress(indexers);
    timeout = setTimeout(() => logIndexerProgress(indexers, timeout), QUERY_TASKS_INTERVAL);
  };

  logIndexerProgress(indexers);
  return () => {
    clearTimeout(timeout);
    timeout = null;
  };
};

module.exports = {
  log: logProgress,
  query: getIndexers,
};
