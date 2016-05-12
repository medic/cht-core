/**
 * Launcher for sentinel_monitor.js, to run it periodically and pipe its logs to file.
 * Also allows the monitor to be rerun again when crashed (robust!).
 */
'user strict';

var CronJob = require('cron').CronJob;
var fs = require('fs');
var spawn = require('child_process').spawn;

// Run every 5 minutes.
// var cronTime = '0 */5 * * * *';

// For testing : run every 15 seconds.
var cronTime = '*/15 * * * * *';

new CronJob(
  cronTime,
  function() {
    // Pipe stderr and stdout to logfile.
    var out = fs.openSync('./sentinel_monitor.log', 'a');
    var err = fs.openSync('./sentinel_monitor.log', 'a');

    spawn('node', ['sentinel_monitor.js'], {
      stdio: [ 'ignore', out, err ]
    });
  },
  null,
  true);

