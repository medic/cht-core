const oneDay = 24 * 60 * 60 * 1000;

const returnsTrue = function () {
  return true;
};
const returnsFalse = function () {
  return false;
};

const createTask = function(name, dueDays) {
  return {
    name: name,
    icon: 'icon-person',
    title: name,
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: returnsTrue,
    resolvedIf: returnsFalse,
    actions: [{ type: 'report', form: name }],
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
];
