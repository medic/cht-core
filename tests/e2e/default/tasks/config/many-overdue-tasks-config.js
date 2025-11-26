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
        start: 365,
        end: 365,
        dueDate: function (event, contact) {
          return contact.contact.reported_date + dueDays * oneDay;
        }
      }
    ]
  };
};

// Create 105 overdue tasks to test "100 +" display
const tasks = [];
for (let i = 1; i <= 105; i++) {
  tasks.push(createTask(`task_overdue_${i}`, -i));
}

module.exports = tasks;
