const oneDay = 24 * 60 * 60 * 1000;

const returnsTrue = function () {
  return true;
};
const returnsFalse = function () {
  return false;
};

const createTask = function (name, dueDays) {
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
        },
      },
    ],
  };
};

const tasks = [];

for (let i = 0; i < 200; i++) {
  const dueDays = (i % 10) - 5;
  tasks.push(createTask(`person_create_${i}`, dueDays));
}

module.exports = tasks;
