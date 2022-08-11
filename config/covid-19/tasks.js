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
    appliesToType: ['covid19_rdt_provision'],
    appliesIf: (contact, report) => {
      return !!getField(report, 'test-reference.test_id');
    },
    resolvedIf: (contact, report, event, dueDate) => {
      if (!contact.reports) {
        return false;
      }

      const captureReport = contact.reports.find(reportDoc => {
        if (reportDoc.form !== 'covid19_rdt_capture') {
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

      return isFormArraySubmittedInWindow(contact.reports, ['covid19_rdt_capture'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'covid19_rdt_capture',
        modifyContent: function(content, contact, report) {
          content.patient_uuid = getField(report, 'patient_uuid');
          content['test-information'] = {
            session_id: getField(report, 'test-reference.session_id'),
            administrator_id: getField(report, 'inputs.user.contact_id'),
            administrator_name: getField(report, 'inputs.user.name'),
            test_id: getField(report, 'test-reference.test_id'),
            facility_id: getField(report, 'test-reference.facility_id'),
            facility_name: getField(report, 'test-reference.facility_name') ||
              getField(report, 'test-reference.other_facility_name'),
            facility_address: getField(report, 'test-reference.facility_address') ||
              getField(report, 'test-reference.other_facility_address'),
            facility_test_setting: getField(report, 'test-reference.other_facility_test_setting'),
            other_test_setting: getField(report, 'test-reference.other_test_setting'),
            test_reason: getField(report, 'test-reference.test_reason'),
            symptoms: getField(report, 'test-reference.symptoms'),
            days_since_symptoms_began: getField(report, 'test-reference.days_since_symptoms_began'),
            specimen_type: getField(report, 'spec-lot.specimen_type'),
            specimen_type_other: getField(report, 'spec-lot.specimen_type_other'),
            rdt_lot: getField(report, 'spec-lot.rdt_lot'),
            rdt_lot_expiry_date: getField(report, 'spec-lot.rdt_lot_expiry_date'),
            additional_notes: getField(report, 'spec-lot.additional_notes'),
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
    appliesToType: ['covid19_rdt_capture'],
    appliesIf: (contact, report) => {
      return getField(report, 'repeat-test.repeat_test') === 'yes';
    },
    resolvedIf: (contact, report, event, dueDate) => {
      if (!contact.reports) {
        return false;
      }

      const provisionReport = contact.reports.find(reportDoc => {
        if (reportDoc.form !== 'covid19_rdt_provision') {
          return false;
        }
        return getField(reportDoc, 'patient_uuid') === getField(report, 'patient_uuid');
      });

      if (!provisionReport) {
        return false;
      }

      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);
      const endTime = addDays(dueDate, event.end + 1).getTime();

      return isFormArraySubmittedInWindow(contact.reports, ['covid19_rdt_provision'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'covid19_rdt_provision',
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
