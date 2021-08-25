const extras = require('./nools-extras');

const {
  isFormArraySubmittedInWindow,
  addDays,
  getField
} = extras;

module.exports = [
  {
    name: 'covid19-rdt-capture-results',
    icon: 'icon-follow-up',
    title: 'task.covid19.capture.title',
    appliesTo: 'reports',
    appliesToType: ['covid19:rdt:provision'],
    appliesIf: (contact, report) => {
      return !!getField(report, 'test-reference.test_id');
    },
    resolvedIf: (contact, report, event, dueDate) => {
      if (!contact.reports) {
        return false;
      }

      const captureReport = contact.reports.find(reportDoc => {
        if (reportDoc.form !== 'covid19:rdt:capture') {
          return false;
        }
        const testId = getField(report, 'test-reference.test_id');
        return getField(reportDoc, 'test_id') === testId;
      });

      if (!captureReport) {
        return false;
      }

      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);
      const endTime = addDays(dueDate, event.end + 1).getTime();

      return isFormArraySubmittedInWindow(contact.reports, ['covid19:rdt:capture'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'covid19:rdt:capture',
        modifyContent: function(content, contact, report) {
          content.test_id = getField(report, 'test-reference.test_id');
          // eslint-disable-next-line no-console
          console.warn('getField(report, \'patient_uuid\')', getField(report, 'patient_uuid'));
          content.patient_uuid = getField(report, 'patient_uuid');
        }
      }
    ],
    events: [
      {
        id: 'covid19-rdt-capture-event',
        start: 1,
        end: 2,
        days: 1
      }
    ]
  },

  {
    name: 'covid19-rdt-repeat',
    icon: 'icon-follow-up',
    title: 'task.covid19.repeat.title',
    appliesTo: 'reports',
    appliesToType: ['covid19:rdt:capture'],
    appliesIf: (contact, report) => {
      return getField(report, 'repeat-test.repeat_test') === 'yes';
    },
    resolvedIf: (contact, report, event, dueDate) => {
      if (!contact.reports) {
        return false;
      }

      const provisionReport = contact.reports.find(reportDoc => {
        if (reportDoc.form !== 'covid19:rdt:provision') {
          return false;
        }
        return getField(reportDoc, 'patient_uuid') === getField(report, 'patient_uuid');
      });

      if (!provisionReport) {
        return false;
      }

      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);
      const endTime = addDays(dueDate, event.end + 1).getTime();

      return isFormArraySubmittedInWindow(contact.reports, ['covid19:rdt:provision'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'covid19:rdt:provision',
        modifyContent: function(content, contact, report) {
          content.patient_uuid = getField(report, 'patient_uuid');
        }
      }
    ],
    events: [
      {
        id: 'covid19-rdt-capture-event',
        start: 1,
        end: 2,
        days: 1
      }
    ]
  }
];
