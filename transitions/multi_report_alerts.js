const vm = require('vm'),
      _ = require('underscore'),
      async = require('async'),
      config = require('../config'),
      lineage = require('../lib/lineage'),
      logger = require('../lib/logger'),
      messages = require('../lib/messages'),
      utils = require('../lib/utils'),
      transitionUtils = require('./utils'),
      MAX_NUM_REPORTS_THRESHOLD = 100,
      TRANSITION_NAME = 'multi_report_alerts',
      BATCH_SIZE = 100,
      requiredFields = [
        'is_report_counted',
        'name',
        'num_reports_threshold',
        'message',
        'recipients',
        'time_window_in_days'
      ];

const getAlertConfig = () => config.get(TRANSITION_NAME);

/* Returned list does not include the change.doc. */
const fetchReports = (latestTimestamp, timeWindowInDays, formTypes, options) => {
  return utils.getReportsWithinTimeWindow(latestTimestamp, timeWindowInDays, options)
    .then((reports) => {
      if (formTypes && formTypes.length) {
        return reports.filter((report) => report.form && formTypes.includes(report.form));
      }
      return reports;
    })
    .then(lineage.hydrateDocs);
};

const countReports = (reports, latestReport, script) => {
  return reports.filter((report) => {
    const context = { report: report, latestReport: latestReport };
    try {
      return script.runInNewContext(context);
    } catch(err) {
      logger.error(`Could not eval "is_report_counted" function for (report=${context.report._id}, latestReport=${context.latestReport._id}). Report will not be counted. Error: ${err.message}`);
      return false;
    }
  });
};

/** Has this report already been SMSed about for this alert? */
const isReportAlreadyMessaged = (report, alertName) => {
  return report.tasks && report.tasks.filter(task => task.alert_name === alertName).length;
};

const generateMessages = (alert, phones, latestReport, countedReportsIds, newReports) => {
  let isLatestReportChanged = false;
  phones.forEach((phone) => {
    if (phone.error) {
      logger.error(phone.error);
      messages.addError(latestReport, phone.error);
      isLatestReportChanged = true;
      return;
    }
    messages.addMessage({
      doc: latestReport,
      phone: phone,
      message: alert.message,
      templateContext: {
        // use snake_case for consistency with other fields.
        new_reports: newReports,
        num_counted_reports: countedReportsIds.length,
        alert_name: alert.name,
        num_reports_threshold: alert.num_reports_threshold,
        time_window_in_days: alert.time_window_in_days
      },
      taskFields: {
        type: 'alert',
        alert_name: alert.name,
        counted_reports: countedReportsIds
      }
    });
    isLatestReportChanged = true;
  });
  return isLatestReportChanged;
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
  phones = _.uniq(phones);
  return phones;
};

const getPhonesOneReport = (recipients, report) => {
  if (!recipients) {
    return [];
  }

  let phones;
  if (_.isArray(recipients)) {
    phones = _.flatten(
      recipients.map(_.partial(getPhonesOneReportOneRecipientWithDuplicates, _, report)));
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
      return evaled.map((shouldBeAString) => {
        if (!_.isString(shouldBeAString)) {
          return { error: `${TRANSITION_NAME} : one of the phone numbers for "${recipient}"` +
            ` is not a string. Message will not be sent. Found : ${JSON.stringify(shouldBeAString)}` };
        }
        return shouldBeAString;
      });
    }
    return { error: `${TRANSITION_NAME} : phone number for "${recipient}"` +
      ` is not a string or array of strings. Message will not be sent. Found: "${JSON.stringify(evaled)}"` };
  } catch(err) {
    return { error: `${TRANSITION_NAME} : Could not find a phone number for "${recipient}". ` +
      `Message will not be sent. Error: "${err.message}"` };
  }
};

const validateConfig = () => {
  const alertConfig = getAlertConfig();
  const errors = [];
  alertConfig.forEach((alert, idx) => {
    requiredFields.forEach(field => {
      if (!alert[field]) {
        errors.push(`Alert number ${idx}, expecting fields: ${requiredFields.join(', ')}`);
      }
    });
    alert.time_window_in_days = parseInt(alert.time_window_in_days);
    if (isNaN(alert.time_window_in_days)) {
      errors.push(`Alert "${alert.name}", expecting "time_window_in_days" to be an integer, eg: "time_window_in_days": "3"`);
    }
    alert.num_reports_threshold = parseInt(alert.num_reports_threshold);
    if (isNaN(alert.num_reports_threshold)) {
      errors.push(`Alert "${alert.name}", expecting "num_reports_threshold" to be an integer, eg: "num_reports_threshold": "3"`);
    }
    if (alert.num_reports_threshold > MAX_NUM_REPORTS_THRESHOLD) {
      errors.push(`Alert "${alert.name}", "num_reports_threshold" should be less than ${MAX_NUM_REPORTS_THRESHOLD}. Found ${alert.num_reports_threshold}`);
    }
    if(!_.isArray(alert.recipients)) {
      errors.push(`Alert "${alert.name}", expecting "recipients" to be an array of strings, eg: "recipients": ["+9779841452277", "countedReports[0].contact.phone"]`);
    }
    if (alert.forms && (!_.isArray(alert.forms))) {
      alert.forms = null;
      logger.warn(`Bad config for ${TRANSITION_NAME}, alert "${alert.name}". Expecting "forms" to be an array of form codes. Continuing without "forms", since it\'s optional.`);
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

/**
 * Returns { countedReportsIds, newReports, phones }.
 */
const getCountedReportsAndPhones = (alert, latestReport) => {
  return new Promise((resolve, reject) => {
    const script = vm.createScript(`(${alert.is_report_counted})(report, latestReport)`);
    let skip = 0;
    let countedReportsIds = [ latestReport._id ];
    let newReports = [ latestReport ];
    let phones = getPhonesOneReport(alert.recipients, latestReport);
    async.doWhilst(
      callback => {
        getCountedReportsAndPhonesBatch(script, latestReport, alert, skip)
          .then(output => {
            countedReportsIds = countedReportsIds.concat(output.countedReportsIds);
            newReports = newReports.concat(output.newReports);
            phones = phones.concat(output.phones);
            callback(null, output.numFetched);
          })
          .catch(callback);
      },
      numFetched => {
        skip += BATCH_SIZE;
        return numFetched === BATCH_SIZE;
      },
      err => {
        if (err) {
          return reject(err);
        }
        resolve({ countedReportsIds: countedReportsIds, newReports: newReports, phones: _.uniq(phones) });
      }
    );
  });
};

/**
 * Returns Promise({ numFetched, countedReportsIds, newReports, phones }) for the db batch with skip value.
 */
const getCountedReportsAndPhonesBatch = (script, latestReport, alert, skip) => {
  const options = { skip: skip, limit: BATCH_SIZE };
  return fetchReports(latestReport.reported_date - 1, alert.time_window_in_days, alert.forms, options)
    .then(fetched => {
      const countedReports = countReports(fetched, latestReport, script);
      const newReports = countedReports.filter(report => !isReportAlreadyMessaged(report, alert.name));
      return {
        numFetched: fetched.length,
        countedReportsIds: countedReports.map(report => report._id),
        newReports: newReports,
        phones: getPhones(alert.recipients, newReports)
      };
    });
};

/* Return true if the doc has been changed. */
const runOneAlert = (alert, latestReport) => {
  if (alert.forms && alert.forms.length && !alert.forms.includes(latestReport.form)) {
    return Promise.resolve(false);
  }
  return getCountedReportsAndPhones(alert, latestReport).then(output => {
    if (output.countedReportsIds.length >= alert.num_reports_threshold) {
      return generateMessages(alert, output.phones, latestReport, output.countedReportsIds, output.newReports);
    }
    return false;
  });
};

const onMatch = (change, db, audit, callback) => {
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
  promiseSeries.then(() => {
    if (errors.length) {
      return callback(errors, true);
    }
    callback(null, docNeedsSaving);
  })
  .catch((err) => {
    callback(err, false);
  });
};

module.exports = {
  filter: doc => !!(
    doc &&
    doc.form &&
    doc.type === 'data_record' &&
    !transitionUtils.hasRun(doc, TRANSITION_NAME)
  ),
  onMatch: onMatch,
  init: validateConfig
};
