/*const probeViewsLoop = (deployDoc, viewlist) => {
  return new Promise(res => {
    const probeViews = () => {
      if (stopViewWarming) {
        return res();
      }

      Promise
        .all(viewlist.map(view => DB.app.query(view, { limit: 1 })))
        .then(() => {
          stopViewWarming = true;
          info('Warming views complete');
          return updateIndexers(deployDoc);
        })
        .catch(err => {
          if (err.error !== 'timeout') {
            // Ignore errors in the view warming loop because long-running view queries aren't that
            // trust-worthy. We *do* check for errors in the writeProgressTimeout loop, so that will
            // catch real CouchDB errors
            info(`Unexpected error while warming: (${err.message}), continuing`);
          }

          probeViews();
        });
    };

    probeViews();
  });
};*/

const db = require('../../db');

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

    console.log(`${ddocName}[${bar}]`);
  };

  console.log('View indexer progress');
  indexers.forEach(logProgress);
};

const viewIndexerProgress = () => {
  const indexers = [];

  const logIndexerProgress = async () => {
    const activeTasks = await db.activeTasks();
    const relevantTasks = activeTasks.filter(task =>
      task.type === 'indexer' && task.design_document.includes(':staged:'));

    // We assume all previous tasks have finished.
    indexers.forEach(setTasksToComplete);
    updateRunningTasks(indexers, relevantTasks);
    indexers.forEach(calculateAverageProgress);
    logIndexersProgress(indexers);
  };

  logIndexerProgress();
  const interval = setInterval(logIndexerProgress, 5000);

  return () => {
    clearInterval(interval);
  };
};

module.exports = {
  viewIndexerProgress,
};
