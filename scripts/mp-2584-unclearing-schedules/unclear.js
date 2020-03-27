/*
* Unclear the messages that were erroneously cleared by a bug, see
* https://github.com/medic/medic-projects/issues/2584
*
* This script requires exposing accept_patient_reports._findToClear, in sentinel code.
* It's not a public func in the current master, so I hack-exposed it for this script.
*/
/*jshint esversion: 6 */
'use strict';
const fs = require('fs');
const moment = require('moment');
const PouchDB = require('pouchdb');

const accept_patient_reports = require('../../sentinel/transitions/accept_patient_reports');
const config = require('../../sentinel/config');
const utils = require('../../sentinel/lib/utils');

const VISIT_CODE = 'ग';
const DELIVERY_CODE = 'ज';
const CLEARED = 'cleared';
const SCHEDULED = 'scheduled';
const BATCH_SIZE = 100; // batch size for db operations.
const HTTP_TIMEOUT_SEC = 120;

const dbUrl = process.env.COUCH_URL;
const db = new PouchDB(dbUrl, {ajax: {timeout: HTTP_TIMEOUT_SEC * 1000 }});

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
  })
    .catch(err => {
      console.log('findReportsForPatientId failed for patientId', patientId, err);
      throw err;
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
      console.log(report._id, 'Scheduling task due', task.due);
    }
  });
};

const findLatestReport = reports => {
  let maxDate = 0;
  let maxReport = {};
  reports.forEach(report => {
    if (report.reported_date > maxDate) {
      maxReport = report;
      maxDate = report.reported_date;
    }
  });
  return maxReport;
};

const getAcceptedReportsConfig = (formCode) => {
  return config._initConfig()
    .then(() => {
      const acceptedReportsConfig = config.get('patient_reports');
      return acceptedReportsConfig.find((config) => config.form === formCode);
    });
};

const silenceRemindersNoSaving = (
  latestVisitReportedDate,
  registrationReport,
  acceptedReportsConfig) => {

  // Code plucked from accept_patient_reports.silenceReminders
  // filter scheduled message by group
  const toClear = accept_patient_reports._findToClear(
    registrationReport, latestVisitReportedDate, acceptedReportsConfig);
  if (!toClear.length) {
    return;
  }
  toClear.forEach(function(task) {
    if (task.state === 'scheduled') {
      console.log(registrationReport._id, 'Clearing task due', task.due);
      utils.setTaskState(task, 'cleared');
    }
  });
  // end code pluck
};

const getDocs = ids => {
  return db.allDocs({keys: ids, include_docs: true})
    .then(data => {
      return data.rows.filter(row => {
        if (row.error) {
          console.error(
            'DOC', row.key,
            'NOT FETCHED! Error :', row.error ,'. Ignoring it. You should fix it by hand later.'
          );
          return false;
        }
        return true;
      }).map(row => row.doc);
    })
    .catch(err => {
      console.log('getDocs failed', err);
      throw err;
    });
};

// in-place edit of report
const fixReport = (registrationReport, visitFormConfig) => {
  console.log('----------\n Start work for', registrationReport._id);
  if (!isValid(registrationReport) || !registrationReport.patient_id) {
    console.log('nothing to do for', registrationReport._id);
    return Promise.resolve(registrationReport);
  }

  return findReportsForPatientId(registrationReport.patient_id)
    .then(associatedReports => {
      console.log(registrationReport._id ,'\nfound', associatedReports.length, 'reports for patient',
        registrationReport.patient_id, associatedReports.map(report => report.form));
      const birthReports = associatedReports.filter(report => report.form === DELIVERY_CODE);
      if (birthReports && birthReports.length) { // there is an associated birth report
        console.log('has birth report', birthReports.map(report => report._id));
        clearScheduledMessages(registrationReport); // clear all scheduled messages
        console.log('Report fixed (not saved yet)', registrationReport._id);
        return registrationReport;
      }

      const visitReports = associatedReports.filter(report => report.form === VISIT_CODE);
      if (visitReports && visitReports.length) {
        console.log('has visit reports',
          visitReports.map(report => [report._id, new Date(report.reported_date).toString()]));
        const latestVisitReport = findLatestReport(visitReports);
        console.log('has latest visit report', latestVisitReport._id, 'with reported_date',
          new Date(latestVisitReport.reported_date).toString());
        // Set status "cleared" for all messages whose due date is before latestVisitReport.reported_date
        clearScheduledMessagesBeforeTimestamp(registrationReport, latestVisitReport.reported_date);
        // Set status "scheduled" for all messages whose due date is after latestVisitReport.reported_date
        scheduleClearedMessagesAfterTimestamp(registrationReport, latestVisitReport.reported_date);
        // Run the piece of code in sentinel transition accept_patient_ids that clears the appropriate messages for
        // latestVisitReport, according to config.
        silenceRemindersNoSaving(latestVisitReport.reported_date, registrationReport, visitFormConfig);
        console.log('Report fixed (not saved yet)', registrationReport._id);
        return registrationReport;
      }

      console.log('no birth or visit report');
      scheduleClearedMessages(registrationReport);
      console.log('Report fixed (not saved yet)', registrationReport._id);
      return registrationReport;
    });
};

const saveDocs = docs => {
  return db.bulkDocs(docs);
};

// todo pass the result along, otherwise using this func is complicated.
const chainPromises = funcs => {
  let promiseChain = Promise.resolve();
  funcs.forEach(func => {
    promiseChain = promiseChain.then(func);
  });
  return promiseChain;
};

const doBatch = (index, visitFormConfig, registrationList) => {
  console.log('--------------------------------------------\nStart batch', index);
  const registrationSubList = registrationList.slice(index, index + BATCH_SIZE);
  console.log('registrationSubList', registrationSubList);
  return getDocs(registrationSubList)
    .then(registrationReports => {
      let fixedReports = [];
      const funcs = registrationReports.map(report => {
        return () => {
          return fixReport(report, visitFormConfig)
            .then(fixedReportsBatch => {
              fixedReports = fixedReports.concat(fixedReportsBatch);
            });
        };
      });
      return chainPromises(funcs)
        .then(() => fixedReports);
    })
    .then(reports => {
      reports.forEach(report => {
        fs.writeFileSync('edited_reports/' + report._id + '.json', JSON.stringify(report, null, 2));
      });
      console.log('Saving batch', index);
      return saveDocs(reports)
        .catch(err => {
          console.log('Save for batch', index, 'failed.', err);
          throw err;
        })
        .then(() => {
          console.log('Successfully saved batch', index);
          return reports;
        });
    })
    .catch(err => {
      console.log('Batch', index, 'failed.', err);
      throw err;
    });
};

const doAllBatches = (visitFormConfig, registrationList) => {
  let index = 0;
  let reports = [];
  const funcArray = [];
  while (index < registrationList.length) {
    const doBatchI = doBatch.bind(null, index, visitFormConfig, registrationList);
    funcArray.push(() => {
      return doBatchI().then(reportBatch => {
        reports = reports.concat(reportBatch);
      });
    });
    index += BATCH_SIZE;
  }
  return chainPromises(funcArray)
    .then(() => reports);
};


// ------------ actually do stuff now
// I think this breaks if file not found or wrong file format, which is cool.

// add timestamps to logs
console.normalLog = console.log;
console.log = (...args) => {
  console.normalLog(new Date(), ...args);
};

const registrationList = JSON.parse(fs.readFileSync(registrationListFile, { encoding: 'UTF8' }));
console.log('found', registrationList.length, 'registrations in file', registrationListFile);

getAcceptedReportsConfig(VISIT_CODE)
  .then(visitFormConfig => {
    console.log('visitFormConfig', visitFormConfig);
    return doAllBatches(visitFormConfig, registrationList);
  })
  .then(editedReports => {
    console.log('editedReports final', editedReports.map(report => report._id));
  })
  .catch(err => console.log('Final error catch', err));
