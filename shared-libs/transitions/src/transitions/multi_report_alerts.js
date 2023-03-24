const vm = require('vm');
const _ = require('lodash');
const config = require('../config');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const logger = require('../lib/logger');
const messages = require('../lib/messages');
const utils = require('../lib/utils');
const transitionUtils = require('./utils');
const MAX_NUM_REPORTS_THRESHOLD = 100;
const TRANSITION_NAME = 'multi_report_alerts';
const BATCH_SIZE = 100;
const requiredFields = [
  'is_report_counted',
  'name',
  'num_reports_threshold',
  'message',
  'recipients',
  'time_window_in_days',
];

const getAlertConfig = () => config.get(TRANSITION_NAME);

// Returned list does not include the change.doc
const fetchReports = (
  latestTimestamp,
  timeWindowInDays,
  formTypes,
  options
) => {
  return utils
    .getReportsWithinTimeWindow(latestTimestamp, timeWindowInDays, options)
    .then(reports => {
      if (formTypes && formTypes.length) {
        return reports.filter(
          report => report.form && formTypes.includes(report.form)
        );
      }
      return reports;
    })
    .then(lineage.hydrateDocs)
    .then(reports => reports.filter(report => utils.isValidSubmission(report)));
};

const countReports = (reports, latestReport, script) => {
  return reports.filter(report => {
    const context = { report: report, latestReport: latestReport };
    try {
      return script.runInNewContext(context);
    } catch (err) {
      logger.error(
        `Could not eval "is_report_counted" function for (report=${
          context.report._id
        }, latestReport=${
          context.latestReport._id
        }). Report will not be counted. Error: ${err.message}`
      );
      return false;
    }
  });
};

const generateMessages = (
  alert,
  phones,
  latestReport,
  countedReportsIds,
  newReports
) => {
  phones.forEach(phone => {

    if (phone.error) {
      logger.error('%o', phone.error);
      messages.addError(latestReport, phone.error);
      return;
    }
    const context = {
      templateContext: {
        // use snake_case for consistency with other fields.
        new_reports: newReports,
        num_counted_reports: countedReportsIds.length,
        alert_name: alert.name,
        num_reports_threshold: alert.num_reports_threshold,
        time_window_in_days: alert.time_window_in_days,
      },
    };
    const task = messages.addMessage(latestReport, alert, phone, context);
    if (task) {
      task.type = 'alert';
      task.alert_name = alert.name;
      task.counted_reports = countedReportsIds;
    }
  });

  // true to save the report
  return phones.length >= 0;
};

// Recipients format examples:
// [
//    '+254777888999',
//    'new_report.contact.parent.parent.contact.phone',   // returns string
//    'new_report.contact.parent.parent.alertRecipients', // returns string array
// ]
const getPhones = (recipients, reports) => {
  let phones = [];
  reports.forEach(report => {
    const phonesForReport = getPhonesOneReport(recipients, report);
    phones = phones.concat(phonesForReport);
  });
  return _.uniq(phones);
};

const getPhonesOneReport = (recipients, report) => {
  if (!recipients) {
    return [];
  }

  let phones;
  if (_.isArray(recipients)) {
    phones = _.flattenDeep(
      recipients.map(
        _.partial(getPhonesOneReportOneRecipientWithDuplicates, _, report)
      )
    );
  } else {
    phones = getPhonesOneReportOneRecipientWithDuplicates(recipients, report);
  }

  return _.uniq(phones);
};

const getPhonesOneReportOneRecipientWithDuplicates = (recipient, newReport) => {
  if (!recipient) {
    return [];
  }

  if (/^\+[0-9]+$/.exec(recipient)) {
    return [recipient];
  }

  const context = { new_report: newReport };
  try {
    const evaled = vm.runInNewContext(recipient, context);
    if (_.isString(evaled)) {
      return [evaled];
    }
    if (_.isArray(evaled)) {
      return evaled.map(shouldBeAString => {
        if (!_.isString(shouldBeAString)) {
          return {
            error:
              `${TRANSITION_NAME} : one of the phone numbers for "${recipient}"` +
              ` is not a string. Message will not be sent. Found : ${JSON.stringify(shouldBeAString)}`,
          };
        }
        return shouldBeAString;
      });
    }
    return {
      error:
        `${TRANSITION_NAME} : phone number for "${recipient}"` +
        ` is not a string or array of strings. Message will not be sent. Found: "${JSON.stringify(evaled)}"`,
    };
  } catch (err) {
    return {
      error:
        `${TRANSITION_NAME} : Could not find a phone number for "${recipient}". ` +
        `Message will not be sent. Error: "${err.message}"`,
    };
  }
};

const validateConfig = () => {
  const alertConfig = getAlertConfig();
  const errors = [];
  alertConfig.forEach((alert, idx) => {
    requiredFields.forEach(field => {
      if (!alert[field]) {
        errors.push(
          `Alert number ${idx}, expecting fields: ${requiredFields.join(', ')}`
        );
      }
    });
    alert.time_window_in_days = parseInt(alert.time_window_in_days);
    if (isNaN(alert.time_window_in_days)) {
      errors.push(
        `Alert "${alert.name}", expecting "time_window_in_days" to be an integer, eg: "time_window_in_days": "3"`
      );
    }
    alert.num_reports_threshold = parseInt(alert.num_reports_threshold);
    if (isNaN(alert.num_reports_threshold)) {
      errors.push(
        `Alert "${alert.name}", expecting "num_reports_threshold" to be an integer, eg: "num_reports_threshold": "3"`
      );
    }
    if (alert.num_reports_threshold > MAX_NUM_REPORTS_THRESHOLD) {
      errors.push(
        `Alert "${alert.name}", "num_reports_threshold" should be less than ${MAX_NUM_REPORTS_THRESHOLD}. ` +
        `Found ${alert.num_reports_threshold}`
      );
    }
    if (!_.isArray(alert.recipients)) {
      errors.push(
        `Alert "${alert.name}", expecting "recipients" to be an array of strings, ` +
        `eg: "recipients": ["+9779841452277", "countedReports[0].contact.phone"]`
      );
    }
    if (alert.forms && !_.isArray(alert.forms)) {
      alert.forms = null;
      logger.warn(
        `Bad config for ${TRANSITION_NAME}, alert "${alert.name}". ` +
        `Expecting "forms" to be an array of form codes. Continuing without "forms", since it's optional.`
      );
    }
  });

  const names = alertConfig.map(alert => alert.name);
  if (_.uniq(names).length !== names.length) {
    errors.push(`Alert names should be unique. Found names: ${names}`);
  }

  if (errors.length) {
    logger.error(`Validation failed for ${TRANSITION_NAME} transition`);
    logger.error(errors.join('\n'));
    throw new Error(`Validation failed for ${TRANSITION_NAME} transition`);
  }
};

// Returns { countedReportsIds, newReports, phones }.
const getCountedReportsAndPhones = (alert, latestReport) => {
  const script = vm.createScript(
    `(${alert.is_report_counted})(report, latestReport)`
  );

  if (!countReports([latestReport], latestReport, script).length) {
    // The latest_report didn't pass the is_report_counted function, abort the transition.
    return Promise.resolve({
      countedReportsIds: [],
      newReports: [],
      phones: [],
    });
  }

  const promiseLoop = (skip, allCountedReports, allOldReportIds) =>
    getCountedReportsBatch(script, latestReport, alert, skip).then(
      ({ countedReports, oldReportIds, numFetched }) => {
        allCountedReports = allCountedReports.concat(countedReports);
        allOldReportIds = allOldReportIds.concat(oldReportIds);

        if (numFetched === BATCH_SIZE) {
          return promiseLoop(
            (skip += BATCH_SIZE),
            allCountedReports,
            allOldReportIds
          );
        } else {
          return {
            countedReports: allCountedReports,
            oldReportIds: allOldReportIds,
          };
        }
      }
    );

  return promiseLoop(0, [latestReport], []).then(
    ({ countedReports, oldReportIds }) => {
      const countedReportsIds = countedReports.map(report => report._id);
      const newReports = countedReports.filter(
        report => !oldReportIds.includes(report._id)
      );
      const phones = getPhones(alert.recipients, newReports);

      return {
        countedReportsIds: countedReportsIds,
        newReports: newReports,
        phones: phones,
      };
    }
  );
};

// Returns Promise({ numFetched, countedReports, oldReportIds }):
// numFetched: skip value for batch
// countedReports: reports in batch that 'count', determined by the script logic
// oldReportIds: report ids that have counted towards previous alerts, see generateMessages()
//   These may include ids for documents returned in countedReports.
const getCountedReportsBatch = (script, latestReport, alert, skip) => {
  const options = { skip: skip, limit: BATCH_SIZE };
  return fetchReports(
    latestReport.reported_date - 1,
    alert.time_window_in_days,
    alert.forms,
    options
  ).then(fetched => {
    const countedReports = countReports(fetched, latestReport, script);
    const oldReportIds = [];
    countedReports.forEach(report => {
      if (!report.tasks) {
        return;
      }
      report.tasks
        .filter(task => task.alert_name === alert.name && task.counted_reports && task.counted_reports.length)
        .forEach(task => oldReportIds.push(...task.counted_reports));
    });
    return {
      numFetched: fetched.length,
      countedReports: countedReports,
      oldReportIds: oldReportIds,
    };
  });
};

// Return true if the doc has been changed
const runOneAlert = (alert, latestReport) => {
  if (
    alert.forms &&
    alert.forms.length &&
    !alert.forms.includes(latestReport.form)
  ) {
    return Promise.resolve(false);
  }
  return getCountedReportsAndPhones(alert, latestReport).then(output => {
    if (output.countedReportsIds.length >= alert.num_reports_threshold) {
      return generateMessages(
        alert,
        output.phones,
        latestReport,
        output.countedReportsIds,
        output.newReports
      );
    }
    return false;
  });
};

const onMatch = change => {
  const latestReport = change.doc;
  const alertConfig = getAlertConfig();
  const errors = [];
  let docNeedsSaving = false;
  let promiseSeries = Promise.resolve();
  alertConfig.forEach(alert => {
    promiseSeries = promiseSeries.then(() => {
      return runOneAlert(alert, latestReport)
        .then(isDocChangedByOneAlert => {
          docNeedsSaving = docNeedsSaving || isDocChangedByOneAlert;
        })
        .catch(errors.push);
    });
  });
  return promiseSeries.then(() => {
    if (errors.length) {
      const err = new Error(`${TRANSITION_NAME} threw errors`);
      err.errors = errors;
      err.changed = true;
      throw err;
    }
    return docNeedsSaving;
  });
};

module.exports = {
  name: TRANSITION_NAME,
  asynchronousOnly: true,
  filter: ({ doc, info }) => {
    return !!(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      !transitionUtils.hasRun(info, TRANSITION_NAME) &&
      utils.isValidSubmission(doc)
    );
  },
  onMatch: onMatch,
  init: validateConfig,
  _getCountedReportsAndPhones: getCountedReportsAndPhones,
  _lineage: lineage
};
