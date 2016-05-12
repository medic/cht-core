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

// Fun fact : using file descriptor rather than WriteStream, because
// fd has a synchronous close function, so that we can wait for
// file close before killing process. With async close functions,
// you end up killing before file is flushed and losing logs.
var log_fd;

var abort = function() {
  // Close file properly, to not lose unflushed logs.
  fs.closeSync(log_fd);
  process.exit();
};

// Overload console.log to log to file.
var setupLogging = function(logdir, logfile) {
  try {
    fs.accessSync(logdir);
  } catch (err) {
    // Dir doesn't exist. Create it.
    if (!mkdirp.sync(logdir)) {
      console.log('Couldnt create logdir, aborting.');
      abort();
    }
  }
  log_fd = fs.openSync(logdir + '/' + logfile, 'a');
  console.log = function() {
    function log(stuff) {
      fs.writeSync(log_fd, stuff);
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
    abort();
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
    ['instanceName', 'logdir', 'errors', 'sender', 'recipients'],
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
  if (config.errors && config.errors.length === 0) {
    console.log('errors is empty. Aborting.');
    hasErrors = true;
  }
  _.each(config.errors, function(errorObj) {
    if (!errorObj.hasOwnProperty('name')) {
      console.log('No name in error obj. Aborting.');
      hasErrors = true;
    }
    if (!errorObj.hasOwnProperty('string')) {
      console.log('No string in error obj. Aborting.');
      hasErrors = true;
    }
    if (!errorObj.hasOwnProperty('maxNumOccurrences')) {
      console.log('No maxNumOccurrences in error obj. Aborting.');
      hasErrors = true;
    }
    if (!errorObj.hasOwnProperty('ageLimitMinutes')) {
      console.log('No ageLimitMinutes in error obj. Aborting.');
      hasErrors = true;
    }
  });

  if (hasErrors) {
    abort();
  }
};

var findLogFiles = function(dir) {
  var logfiles = fs.readdirSync(dir);
  return _.filter(logfiles, function(fileName) {
    return fileName.indexOf('sentinel') > -1;
  });
};

var findErrorMessage = function(logfile, errorString) {
  return grep(errorString, logfile)
    .then(function(loglines) {
      loglines = loglines.split('\n');
      console.log('Found', loglines.length, 'log lines containing error string.');
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

var sendEmail = function(senderEmail, senderPassword, recipients, instanceName, messages, dryrun) {
  var transporter = nodemailer.createTransport(
    'smtps://' + encodeURIComponent(senderEmail) + ':' + encodeURIComponent(senderPassword) + '@smtp.gmail.com');

  var subject = 'Sentinel alert for ' + instanceName + '!';
  var body = 'Bad news. The Sentinel from ' + instanceName + ' is acting weird. We found these problems:';
  var textOnlyBody = body;
  _.each(messages, function(message) {
    body = body + '<p> - ' + message + '</p>';
    textOnlyBody = textOnlyBody + '\n - ' + message;
  });
  textOnlyBody = textOnlyBody + '\n';
  var mailOptions = {
    from: '"Sentinel Monitor" <' + senderEmail + '>',
    to: recipients.join(),
    subject: subject,
    text: 'Hello chickens 🐥,\n' + textOnlyBody,
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
        console.log('Error sending message: ' + JSON.stringify(error));
        reject(error);
        return;
      }
      console.log('Message sent: ' + JSON.stringify(info));
      resolve(info);
    });
  });
};

var monitorError = function(errorObj, logfile, emailMessages) {
  console.log(' - ' + errorObj.name);
  return findErrorMessage(logfile, errorObj.string)
    .then(_.partial(extractDate, _, errorObj.string))
    .then(_.partial(numDatesInAgeLimit, _, errorObj.ageLimitMinutes))
    .then(function(numOccurrences) {
      var message = numOccurrences + ' ' + errorObj.name + ' within the last ' + errorObj.ageLimitMinutes +
      ' minutes. Limit is ' + errorObj.maxNumOccurrences + '.';
      console.log(message);
      if (numOccurrences > errorObj.maxNumOccurrences) {
        console.log('NOT OK!!!!\n');
        emailMessages.push(message);
      } else {
        console.log('That\'s cool.');
      }
      return;
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
  var logFileToParse = config.logdir + '/' + files[files.length - 1];

  var emailMessages = [];
  var megaPromise = Promise.resolve();
  _.each(config.errors, function(errorObj) {
    megaPromise = megaPromise.then(function() {
      return monitorError(errorObj, logFileToParse, emailMessages);
    });
  });
  megaPromise = megaPromise.then(function() {
    console.log();
    if (emailMessages.length > 0) {
      console.log('Found problems, sending email.');
      sendEmail(config.sender.email, config.sender.password, config.recipients, config.instanceName, emailMessages, config.dryrun);
    } else {
      console.log('No problems!');
    }
  });
};

// Run every 5 minutes.
new CronJob('0 */5 * * * *', monitor, null, true);
