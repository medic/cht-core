const _ = require('lodash');

const db = require('../../db');
const logger = require('../../logger');

const QUERY_TASKS_INTERVAL = 5000;
// progress bar stretches to match console width.
// 60 is roughly the nbr of chars displayed around the bar (ddoc name + debug padding)
const INDEXER_BAR_PREFIX = 60;
const DDOC_NAME_PAD = 35;
const DDOC_PREFIX = /^_design\/:staged:/;
// example "database" is "shards/a0000000-bfffffff/medic.1637673820" (shards/<shard_name>/<db_name>.???)
const INDEXER_DB_RE = /^shards\/[^/]+\/([^.]+)\..*$/;

const setTasksToComplete = (indexer) => {
  Object
    .keys(indexer.tasks)
    .forEach(pid => {
      indexer.tasks[pid] = 100;
    });
};

const allTasksComplete = (indexers) => {
  return indexers.every(indexer => indexer.progress === 100);
};

const getDatabaseName = (indexer) => {
  if (!indexer || !indexer.database || typeof indexer.database !== 'string') {
    return;
  }

  const match = indexer.database.match(INDEXER_DB_RE);
  return (match && match[1]) || indexer.database;
};

const getDdocName = (indexer) => {
  if (!indexer || !indexer.design_document || typeof indexer.design_document !== 'string') {
    return;
  }
  return indexer.design_document.replace(DDOC_PREFIX, '');
};

const updateRunningTasks = (indexers, activeTasks = []) => {
  activeTasks.forEach(task => {
    const dbName = getDatabaseName(task);
    const ddocName = getDdocName(task);
    let indexer = indexers.find(indexer => {
      return indexer.ddoc === ddocName && indexer.database === dbName;
    });
    if (!indexer) {
      indexer = {
        database: dbName,
        ddoc: ddocName,
        tasks: {},
      };
      indexers.push(indexer);
    }

    indexer.tasks[`${task.node}-${task.pid}`] = task.progress;
  });
};

const calculateAverageProgress = (indexer) => {
  indexer.progress = Math.round(_.mean(Object.values(indexer.tasks)));
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
    const ddocName = `${indexer.database}/${indexer.ddoc}`.padEnd(DDOC_NAME_PAD, ' ');

    logger.info(`${ddocName}[${bar}]`);
  };
  indexers.forEach(logProgress);
};

const getIndexers = async (indexers = []) => {
  try {
    const activeTasks = await db.activeTasks();
    const tasks = activeTasks.filter(task => task.type === 'indexer' && DDOC_PREFIX.test(String(task.design_document)));
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

  const stopQueryingIndexes = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const logIndexerProgress = async () => {
    indexers = await getIndexers(indexers);
    logIndexersProgress(indexers);

    if (indexers.length && allTasksComplete(indexers)) {
      stopQueryingIndexes();
      return;
    }

    timeout = setTimeout(() => logIndexerProgress(indexers, timeout), QUERY_TASKS_INTERVAL);
  };

  logIndexerProgress(indexers);

  return stopQueryingIndexes;
};

module.exports = {
  log: logProgress,
  query: getIndexers,
};
