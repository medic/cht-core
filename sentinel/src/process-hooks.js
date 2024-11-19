const feed = require('./lib/feed');
const schedule = require('./schedule');

module.exports = {
  init: () => {
    process.on('SIGUSR1', () => {
      feed.toggle();
    });
    process.on('SIGCONT', () => {
      schedule.runTasks();
    });
  }
};
