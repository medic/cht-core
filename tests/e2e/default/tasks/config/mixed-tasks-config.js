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
  // 2 overdue tasks
  createTask('task_overdue_1', -1),
  createTask('task_overdue_2', -5),
  // 5 future/upcoming tasks
  createTask('task_today', 0),
  createTask('task_future_1', 1),
  createTask('task_future_2', 2),
  createTask('task_future_3', 5),
  createTask('task_future_4', 10),
];
