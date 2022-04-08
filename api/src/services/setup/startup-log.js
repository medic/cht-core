const logger = require('../../logger');

const startupProgress = [];
const logProgress = (action) => {
  logger.info(action);
  startupProgress.push({
    action,
    date: new Date().getTime(),
  });
};

let indexerProgress = [];
const logIndexers = (indexers) => {
  indexerProgress = indexers;
};

const getProgress = () => {
  return {
    startupProgress,
    indexerProgress,
  };
};

module.exports = {
  logProgress,
  logIndexers,
  getProgress,
};
