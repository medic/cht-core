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
  createTask('person_create_7', 7),
  createTask('person_create_5', 5),
  createTask('person_create_2', 2),
  createTask('person_create_1', 1),
  createTask('person_create_0', 0),
  createTask('person_create_overdue_1', -1),
  createTask('person_create_overdue_2', -2),
  createTask('person_create_overdue_5', -5),
];
