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

const returnsTrue = function () {
  return true;
};

const createTask = function(name, dueDays) {
  return {
    name: name,
    icon: 'icon-person',
    title: name,
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: returnsTrue,
    resolvedIf: function (contact) {
      if (dueDays > 0) {
        return false;
      }

      return isFormArraySubmittedInWindow(contact.reports, ['home_visit'], contact.contact.reported_date);
    },
    actions: [{ type: 'report', form: 'home_visit' }],
    events: [
      {
        id: name,
        start: 10,
        end: 10,
        dueDate: function (event, contact) {
          return contact.contact.reported_date + dueDays * oneDay;
        }
      }
    ]
  };
};

module.exports = [
  // Three overdue tasks
  createTask('task_overdue_1', -1),
  createTask('task_overdue_2', -2),
  createTask('task_overdue_3', -3),
  // Some future tasks that should not be counted
  createTask('task_future_1', 1),
  createTask('task_future_2', 2),
  createTask('task_future_3', 5),
  createTask('task_future_4', 10),
];
