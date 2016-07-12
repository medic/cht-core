var assert = require('chai').assert;
var fs = require('fs');
var Nools = require('nools');
var _ = require('underscore');

// TODO this function is currently copy/pasted from `medic-webapp/static/js/services/rules-engine.js`,
// with one minor modification regards referencing of the `schedules` object in
// getSchedule().  We should instead link dynamically to this.
//
// This will likely require some refactoring in webapp to make getUtils() more
// easily accessible to us.
function getUtils(schedules) {
  return {
    isTimely: function(date, event) {
      var due = new Date(date);
      var start = this.addDate(null, event.start);
      var end = this.addDate(null, (event.end + 1) * -1);
      return due.getTime() < start.getTime() && due.getTime() > end.getTime();
    },
    addDate: function(date, days) {
      var result;
      if (date) {
        result = new Date(date.getTime());
      } else {
        result = new Date();
      }
      result.setDate(result.getDate() + days);
      return result;
    },
    getLmpDate: function(doc) {
      var weeks = doc.fields.last_menstrual_period || NO_LMP_DATE_MODIFIER;
      return this.addDate(new Date(doc.reported_date), weeks * -7);
    },
    getSchedule: function(name) {
      return _.findWhere(schedules, { name: name });
    },
    getMostRecentTimestamp: function(reports, form) {
      var report = this.getMostRecentReport(reports, form);
      return report && report.reported_date;
    },
    getMostRecentReport: function(reports, form) {
      var result = null;
      reports.forEach(function(report) {
        if (report.form === form &&
           (!result || report.reported_date > result.reported_date)) {
          result = report;
        }
      });
      return result;
    },
    isFormSubmittedInWindow: function(reports, form, start, end, count) {
      var result = false;
      reports.forEach(function(report) {
        if (!result && report.form === form) {
          if (report.reported_date >= start && report.reported_date <= end) {
            if (!count ||
               (count && report.fields && report.fields.follow_up_count > count)) {
              result = true;
            }
          }
        }
      });
      return result;
    },
    isFirstReportNewer: function(firstReport, secondReport) {
      if (firstReport && firstReport.reported_date) {
        if (secondReport && secondReport.reported_date) {
          return firstReport.reported_date > secondReport.reported_date;
        }
        return true;
      }
      return null;
    },
    isDateValid: function(date) {
      return !isNaN(date.getTime());
    },
    MS_IN_DAY: 24*60*60*1000 // 1 day in ms
  };
}

// TODO i would expect this function to return the same for the key '*' as i would for an empty key (undefined, null, or '').  But this does not seem to be the case currently.
function traverse(keys, element) {
  var keys = keys.slice(0);
  var key = keys.shift();
  if(!key || typeof element === 'undefined') return element;
  if(key === '*') {
          return _.map(element, function(e) { return traverse(keys, e); });
  }
  return traverse(keys, element[key]);
}

NoolsTest = module.exports = (function() {
  function parseRules(rulesetFilePath, scheduleFilePath) {
    var rawSchedules = fs.readFileSync(scheduleFilePath, { encoding:'utf-8' });
    var schedules = JSON.parse('{' + rawSchedules + '}').schedules; // TODO work out why this file doesn't contain real JSON
    var Utils = getUtils(schedules);

    var rawRules = fs.readFileSync(rulesetFilePath, { encoding:'utf-8' });
    var flow = Nools.compile(rawRules, { name:'test', scope:{ Utils:Utils } });
    var session = flow.getSession();

    session.expectEmits = function(key) {
      skip = 1;
      if(typeof key !== 'string') {
        skip = 0;
        key = null;
      }

      var expectedEmits = Array.prototype.slice.call(arguments, skip);
      var actualEmits = [];

      var keys = key ? key.split('.') : null;
      session.on('task', function() { // TODO we may not want to hard code this to listen for tasks here
        var args = Array.prototype.slice.call(arguments, 0);

        if(keys) actualEmits.push(traverse(keys, args[0]));
        else throw new Error('This is not currently handled correctly :-(  Please use \'*\' matcher.');
      });

      return session.match()
        .then(function() {
          assert.deepEqual(actualEmits, expectedEmits);
        });
    };

    return { flow:flow, session:session };
  }

  return {
    parseRules: parseRules,
  };
}());
