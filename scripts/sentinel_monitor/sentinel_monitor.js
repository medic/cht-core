/**
 * Sentinel monitor script. Looks for restarts in logs, and emails if too many.
 *
 * Will look for a config file in same dir as script, called sentinel_monitor_config.json.
 * Will log its output to a dir called sentinel_monitor_log.
 */

'user strict';

var _ = require('underscore');
var CronJob = require('cron').CronJob;
var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var nodemailer = require('nodemailer');
var stripJsonComments = require('strip-json-comments');
var util = require('util');

// Overload console.log to log to file.
var setupLogging = function(logdir, logfile) {
  try {
    fs.accessSync(logdir);
  } catch (err) {
    // Dir doesn't exist. Create it.
    if (!mkdirp.sync(logdir)) {
      console.log('Couldnt create logdir, aborting.');
      process.exit();
    }
  }
  var log_file = fs.createWriteStream(logdir + '/' + logfile, {flags : 'a'}); // append
  console.log = function() {
    function log(stuff) {
      log_file.write(stuff);
    }
    for (var i = 0; i < arguments.length; i++) {
      log(util.format(arguments[i]) + ' ');
    }
    log('\n');
  };
};

var runCommand = function(commandString) {
  return new Promise(function(resolve, reject) {
    exec(commandString, function(error, stdout, stderr) {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(stderr);
      }
      resolve(stdout);
    });
  });
};

var readConfigFromFile = function(file) {
  var config = [];
  try {
    config = JSON.parse(stripJsonComments(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    console.log('Couldnt open config file ' + file + '. Aborting.');
    process.exit();
  }
  checkConfig(config);
  return config;
};

var checkConfig = function(config) {
  var hasErrors = false;
  function checkProperty(propName) {
    if (!config.hasOwnProperty(propName)) {
      console.log('No ' + propName + ' in config. Aborting.');
      hasErrors = true;
    }
  }
  _.each(
    ['instanceName', 'logdir', 'errorString', 'maxNumRestarts', 'ageLimitMinutes', 'sender', 'recipients'],
    checkProperty);
  if (!config.sender.email) {
    console.log('No sender.email in config. Aborting.');
    hasErrors = true;
  }
  if (!config.sender.password) {
    console.log('No sender.password in config. Aborting.');
    hasErrors = true;
  }
  if (config.recipients && config.recipients.length === 0) {
    console.log('sender.recipients is empty. Aborting.');
    hasErrors = true;
  }
  if (hasErrors) {
    process.exit();
  }
};

var findLogFiles = function(dir) {
  var logfiles = fs.readdirSync(dir);
  return _.filter(logfiles, function(fileName) {
    return fileName.indexOf('sentinel') > -1;
  });
};

var findRestartMessage = function(logfile, errorString) {
  return grep(errorString, logfile)
    .then(function(loglines) {
      loglines = loglines.split('\n');
      console.log('Found', loglines.length, 'log lines');
      return loglines;
    });
};

var extractDate = function(loglines) {
  var nonEmptyLines = _.filter(loglines,function(line) {
    return line !== '';
  });

  var dates = _.map(nonEmptyLines, function(logline) {
    // E.g. 2015-10-17T15:14:32.176Z
    var dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
    var date = dateFormat.exec(logline);
    if (!date) {
      console.log('Could not read date!!! Will use today.');
      return new Date();
    }
    console.log('date', Date.parse(date[0]));
    return Date.parse(date[0]);
  });
  return dates;
};

var numDatesInAgeLimit = function(dates, ageLimitMinutes) {
  var ageLimitMillis = ageLimitMinutes * 60 * 1000;
  var now = new Date();
  var limitDate = now.getTime() - ageLimitMillis;
  var recent = _.filter(dates, function(date) {
    return date > limitDate;
  });
  return recent.length;
};

var grep = function(string, file) {
  console.log('Finding "' + string + '" in ' + file);
  var cmd = 'grep "' + string + '" ' + file;
  return runCommand(cmd);
};

var sendEmail = function(senderEmail, senderPassword, recipients, instanceName, numRestarts, ageLimitMinutes, dryrun) {
  var transporter = nodemailer.createTransport(
    'smtps://' + encodeURIComponent(senderEmail) + ':' + encodeURIComponent(senderPassword) + '@smtp.gmail.com');
  var body = 'You may want to know that ' + instanceName + '\'s sentinel restarted ' + numRestarts + ' times in the last ' + ageLimitMinutes + ' minutes. Consider panicking.';
  var subject = 'Sentinel alert for ' + instanceName + '!';
  var mailOptions = {
    from: '"Sentinel Monitor" <' + senderEmail + '>',
    to: recipients.join(),
    subject: subject,
    text: 'Hello chickens 🐥,\n' + body,
    html: '<b>Hello chickens 🐥 !</b> <p>' + body + '</p>'
  };
  console.log('Sending email', mailOptions, '\n');
  if (dryrun) {
    console.log('Dryrun! No email sent.');
    return Promise.resolve();
  }
  return new Promise(function(resolve, reject) {
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        reject(error);
      }
      console.log('Message sent: ' + info.response);
      resolve(info);
    });
  });
};

var monitor = function() {
  var now = new Date();
  setupLogging(__dirname, 'sentinel_monitor.log');

  console.log('\n---------' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')');

  var config = readConfigFromFile(__dirname + '/sentinel_monitor_config.json');
  // Print out config, without the password.
  var configCopy = JSON.parse(JSON.stringify(config));
  configCopy.sender.password = '***';
  console.log('Config :\n', configCopy, '\n');

  var files = findLogFiles(config.logdir);
  findRestartMessage(config.logdir + '/' + files[files.length - 1], config.errorString)
    .then(_.partial(extractDate, _, config.errorString))
    .then(_.partial(numDatesInAgeLimit, _, config.ageLimitMinutes))
    .then(function(numRestarts) {
      console.log(numRestarts, 'restarts within last', config.ageLimitMinutes, 'minutes.');
      if (numRestarts > config.maxNumRestarts) {
        console.log('NOT OK!!!!\n');
        sendEmail(config.sender.email, config.sender.password, config.recipients, config.instanceName, numRestarts, config.ageLimitMinutes, config.dryrun);
      } else {
        console.log('That\'s cool.');
      }
    })
    .catch(function(err) {
      console.log('Something went wrong', err);
    });
};

// Run every 5 minutes.
new CronJob('0 */5 * * * *', monitor, null, true);
