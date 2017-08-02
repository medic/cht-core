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
const BATCH_SIZE = 100; // batch size for db operations.

const dbUrl = process.env.COUCH_URL;
const db = new PouchDB(dbUrl);

const registrationListFile = process.argv[2];

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
      return acceptedReportsConfig.find((config) => config.form === formCode);
    });
};

const silenceRemindersNoSaving = (
    latestVisitReportedDate,
    registrationReport,
    acceptedReportsConfig) => {
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

const getDocs = ids => {
  return db.allDocs({keys: ids, include_docs: true})
    .then(data => data.rows.map(row => row.doc));
};

// in-place edit of report
const fixReport = (registrationReport, visitFormConfig) => {
  if (!isValid(registrationReport) || !registrationReport.patient_id) {
    console.log('nothing to do');
    return registrationReport;
  }

  fs.appendFileSync('message.txt', 'data to append');
  return findReportsForPatientId(registrationReport.patient_id)
    .then(associatedReports => {
      console.log('----------\n', registrationReport._id ,'\nfound', associatedReports.length, 'reports for patient', registrationReport.patient_id, associatedReports.map(report => report.form));
      const birthReports = associatedReports.filter(report => report.form === DELIVERY_CODE);
      if (birthReports && birthReports.length) { // there is an associated birth report
        console.log('has birth report', birthReports.map(report => report._id));
        clearScheduledMessages(registrationReport); // clear all scheduled messages
        console.log('all done', registrationReport._id);
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
        console.log('all done', registrationReport._id);
        return registrationReport;
      }

      console.log('no birth or visit report');
      scheduleClearedMessages(registrationReport);
      console.log('all done', registrationReport._id);
      return registrationReport;
    });
};

const saveDocs = docs => {
  return db.bulkDocs(docs);
};


const doBatch = (index, visitFormConfig, registrationList) => {
  const registrationSubList = registrationList.slice(index, BATCH_SIZE);
  return getDocs(registrationSubList)
      .then(registrationReports => {
        console.log('registrationReports', registrationReports.map(report => report._id));
        return Promise.all(registrationReports.map(report => fixReport(report, visitFormConfig)));
      })
    .then(reports => {
      reports.forEach(report => {
        fs.writeFileSync('edited_reports/' + report._id + '.json', JSON.stringify(report, null, 2));
      });
    });
};

const doAllBatches = (visitFormConfig, registrationList) => {
  const promiseChain = Promise.resolve();
  let index = 0;
  while (index < registrationList.length) {
    promiseChain.then(() => {
      return doBatch(index, visitFormConfig, registrationList);
    });
    index += BATCH_SIZE;
  }
  return promiseChain;
};


// ------------ actually do stuff now
// I think this breaks if file not found or wrong file format, which is cool.
const registrationList = JSON.parse(fs.readFileSync(registrationListFile, { encoding: 'UTF8' }));
console.log('found', registrationList.length, 'registrations in file', registrationListFile);

getAcceptedReportsConfig(VISIT_CODE)
  .then(visitFormConfig => {
    doAllBatches(visitFormConfig, registrationList);
  })
  // todo save results when we're happy with them.
  .catch(console.log);
