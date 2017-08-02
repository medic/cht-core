/*jshint esversion: 6 */
'use strict';
const fs = require('fs'),
    moment = require('moment'),
    PouchDB = require('pouchdb');

const accept_patient_reports = require('../../sentinel/transitions/accept_patient_reports'),
    config = require('../../sentinel/config'),
    utils = require('../../sentinel/lib/utils');

const VISIT_CODE = 'ग';
const DELIVERY_CODE = 'ज';
const CLEARED = 'cleared';
const SCHEDULED = 'scheduled';

const dbUrl = process.env.COUCH_URL;
const db = new PouchDB(dbUrl);

const registrationListFile = process.argv[2];
// I think this breaks if file not found or wrong file format, which is cool.
const content = fs.readFileSync(registrationListFile, { encoding: 'UTF8' });
const registrationList = JSON.parse(content);
console.log('found', registrationList.length, 'registrations in file', registrationListFile);

const isValid = report => {
  return !(report.errors && report.errors.length);
};

const findReportsForPatientId = patientId => {
  return db.query(
    'medic-client/reports_by_subject',
    {
      startkey: [ patientId ],
      endkey: [ patientId + '\ufff0'],
      include_docs: true
    }).then(data => {
      return data.rows.map(row => row.doc)
        .filter(isValid);
    });
};

// in-place edit of report
const clearScheduledMessages = report => {
  if (!report.scheduled_tasks || report.scheduled_tasks.length === 0) {
    return;
  }
  report.scheduled_tasks.forEach(task => {
    if (task.state === SCHEDULED) {
      utils.setTaskState(task, CLEARED);
    }
  });
};

// in-place edit of report
const clearScheduledMessagesBeforeTimestamp = (report, timestamp) => {
  console.log('clearScheduledMessagesBeforeTimestamp');
  if (!report.scheduled_tasks || report.scheduled_tasks.length === 0) {
    return;
  }
  report.scheduled_tasks.forEach(task => {
    if (moment(task.due).valueOf() < timestamp && task.state === SCHEDULED) {
      utils.setTaskState(task, CLEARED);
    }
  });
};

// in-place edit of report
const scheduleClearedMessages = report => {
  if (!report.scheduled_tasks || report.scheduled_tasks.length === 0) {
    return;
  }
  report.scheduled_tasks.forEach(task => {
    if (task.state === CLEARED) {
      utils.setTaskState(task, SCHEDULED);
    }
  });
};

const scheduleClearedMessagesAfterTimestamp = (report, timestamp) => {
  console.log('scheduleClearedMessagesAfterTimestamp');
  if (!report.scheduled_tasks || report.scheduled_tasks.length === 0) {
    return;
  }
  report.scheduled_tasks.forEach(task => {
    if (moment(task.due).valueOf() > timestamp && task.state === CLEARED) {
      utils.setTaskState(task, SCHEDULED);
    }
  });
};

const findLatestReport = reports => {
  let maxDate = 0;
  let maxReport = {};
  reports.forEach(report => {
    if (report.reported_date > maxDate) {
      maxReport = report;
    }
  });
  return maxReport;
};

const getAcceptedReportsConfig = (formCode) => {
  return config.init()
    .then(() => {
      const acceptedReportsConfig = config.get('patient_reports');
      console.log('acceptedReportsConfig', acceptedReportsConfig);
      return acceptedReportsConfig.find((config) => config.form === formCode);
    });
};

const silenceRemindersNoSaving = (
    latestVisitReportedDate,
    registrationReport,
    acceptedReportsConfig) => {
  console.log('silenceRemindersNoSaving');
  const options = {
    reported_date: latestVisitReportedDate,
    registration: registrationReport,
    silence_for: acceptedReportsConfig.silence_for,
    type: acceptedReportsConfig.silence_type
  };

  // Code plucked from accept_patient_reports.silenceReminders
  // filter scheduled message by group
  var toClear = accept_patient_reports.findToClear(options);
  if (!toClear.length) {
      return;
  }
  toClear.forEach(function(task) {
      if (task.state === 'scheduled') {
          utils.setTaskState(task, 'cleared');
      }
  });
  // end code pluck
};

const getDoc = id => {
  return db.get(id);
};

// in-place edit of report
const fixReport = (registrationReport, visitFormConfig) => {
  if (!isValid(registrationReport) || !registrationReport.patient_id) {
    console.log('nothing to do');
    return registrationReport;
  }

  return findReportsForPatientId(registrationReport.patient_id)
    .then(associatedReports => {
      console.log('found', associatedReports.length, 'reports for patient', registrationReport.patient_id);
      console.log('formCodes', associatedReports.map(report => report.form));
      const birthReports = associatedReports.find(report => report.form === DELIVERY_CODE);
      if (birthReports && birthReports.length) { // there is an associated birth report
        console.log('has birth report', birthReports.map(report => report._id));
        clearScheduledMessages(registrationReport); // clear all scheduled messages
        return registrationReport;
      }

      const visitReports = associatedReports.filter(report => report.form === VISIT_CODE);
      if (visitReports && visitReports.length) {
        const latestVisitReport = findLatestReport(visitReports);
        console.log('has visit report', latestVisitReport._id);
        // Set status "cleared" for all messages whose due date is before latestVisitReport.reported_date
        clearScheduledMessagesBeforeTimestamp(registrationReport, latestVisitReport.reported_date);
        // Set status "scheduled" for all messages whose due date is after latestVisitReport.reported_date
        scheduleClearedMessagesAfterTimestamp(registrationReport, latestVisitReport.reported_date);
        // Run the piece of code in sentinel transition accept_patient_ids that clears the appropriate messages for latestVisitReport, according to config.
        silenceRemindersNoSaving(latestVisitReport.reported_date, registrationReport, visitFormConfig);
        console.log('all done');
        return registrationReport;
      }

      console.log('no birth or visit report');
      scheduleClearedMessages(registrationReport);
      return registrationReport;
    });
};

const registrationReportId = registrationList[0];
console.log('first registration', registrationReportId);

Promise.all([getAcceptedReportsConfig(VISIT_CODE), getDoc(registrationList[1])])
  .then(([ visitFormConfig, report ]) => {
    console.log('visitFormConfig', visitFormConfig, 'report', report._id);
    return fixReport(report, visitFormConfig);
  })
  .then(report => {
    console.log('fixed schedule', report.scheduled_tasks);
  })
  .catch(console.log);
