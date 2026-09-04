const oneDay = 24 * 60 * 60 * 1000;

const genTask = (dueDate) => ({
  icon: 'icon-healthcare',
  appliesTo: 'contacts',
  appliesToType: ['person'],
  resolvedIf: function () {
    return false;
  },
  appliesIf: function () {
    return true;
  },
  actions: [
    {
      type: 'report',
      form: 'any_form'
    }
  ],
  events: [
    {
      id: Date.now().toString(),
      start: 10,
      end: 10,
      dueDate: function () {
        return Date.now() + dueDate;
      }
    }
  ]
});

module.exports = [
  {
    name: 'home_visit_overdue',
    title: 'Home Visit',
    ...genTask(-5 * oneDay) // overdue
  },
  {
    name: 'home_visit_not_overdue',
    title: 'Home Visit',
    ...genTask(5 * oneDay) // not overdue
  },
  {
    name: 'assessment_overdue',
    title: 'Assessment',
    ...genTask(-3 * oneDay) // overdue
  },
  {
    name: 'assessment_not_overdue',
    title: 'Assessment',
    ...genTask(7 * oneDay) // not overdue
  },
  {
    name: 'follow_up_overdue',
    title: 'Follow Up',
    ...genTask(-2 * oneDay)
  }
];
