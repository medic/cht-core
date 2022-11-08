const oneDay = 24 * 60 * 60 * 1000;
const isFormArraySubmittedInWindow = (reports, formArray, start, end, count) => {
  end = end || start + 10 * oneDay;
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });

  return count ? reportCount >= count : found;
};

module.exports = [
  {
    name: 'person_create',
    icon: 'icon-person',
    title: 'person_create',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function () {
      return true;
    },
    resolvedIf: function (contact) {
      return isFormArraySubmittedInWindow(contact.reports, ['home_visit'], contact.contact.reported_date);
    },
    actions: [
      {
        type: 'report',
        form: 'home_visit'
      }
    ],
    events: [
      {
        id: 'person-creation-follow-up',
        start: 3,
        end: 7,
        dueDate: function (event, contact) {
          return contact.contact.reported_date;
        }
      }
    ]
  },
];
