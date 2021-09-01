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
        return getField(reportDoc, 'test-information.test_id') === testId;
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
          content.patient_uuid = getField(report, 'patient_uuid');
          content['test-information'] = {
            case_id: getField(report, 'test-reference.case_id'),
            administrator_id: getField(report, 'inputs.user.contact_id'),
            administrator_name: getField(report, 'inputs.user.name'),
            test_id: getField(report, 'test-reference.test_id'),
            facility_id: getField(report, 'test-reference.facility_id'),
            facility_name: getField(report, 'test-reference.facility_name') ||
              getField(report, 'test-reference.other_facility_name'),
            facility_address: getField(report, 'test-reference.facility_address') ||
              getField(report, 'test-reference.other_facility_address') ,
            facility_test_setting: getField(report, 'test-reference.other_facility_test_setting'),
            other_test_setting: getField(report, 'test-reference.other_test_setting'),
            gps: getField(report, 'test-reference.gps'),
            test_reason: getField(report, 'test-reference.test_reason'),
            symptoms: getField(report, 'test-reference.symptoms'),
            days_since_symptoms_began: getField(report, 'test-reference.days_since_symptoms_began'),
            specimen_type: getField(report, 'test-reference.specimen_type'),
            specimen_type_other: getField(report, 'test-reference.specimen_type_other'),
            rdt_lot: getField(report, 'test-reference.rdt_lot'),
            additional_notes: getField(report, 'test-reference.additional_notes'),
          };
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
