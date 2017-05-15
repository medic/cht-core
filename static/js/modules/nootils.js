var _ = require('underscore');

var NO_LMP_DATE_MODIFIER = 4;

module.exports = function(settings) {
  var lib = {
    isTimely: function(date, event) {
      var due = new Date(date);
      var start = lib.now();
      start.setDate(start.getDate() + event.start);
      var end = lib.now();
      end.setDate(end.getDate() - event.end - 1);
      return due.getTime() < start.getTime() && due.getTime() > end.getTime();
    },
    addDate: function(date, days) {
      var result;
      if (date) {
        result = new Date(date.getTime());
      } else {
        result = lib.now();
      }
      result.setDate(result.getDate() + days);
      result.setHours(0, 0, 0, 0);
      return result;
    },
    getLmpDate: function(doc) {
      var weeks = doc.fields.last_menstrual_period || NO_LMP_DATE_MODIFIER;
      return this.addDate(new Date(doc.reported_date), weeks * -7);
    },
    getSchedule: function(name) {
      return _.findWhere(settings.tasks.schedules, { name: name });
    },
    getMostRecentTimestamp: function(reports, form) {
      var report = this.getMostRecentReport(reports, form);
      return report && report.reported_date;
    },
    getMostRecentReport: function(reports, form) {
      var result = null;
      reports.forEach(function(report) {
        if (report.form === form &&
           !report.deleted &&
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
    MS_IN_DAY: 24*60*60*1000, // 1 day in ms
    now: function() { return new Date(); },
  };
  return lib;
};
