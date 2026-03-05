module.exports = [
  {
    id: 'deaths-this-month',
    context: 'user.parent.type === "district_hospital"',
    type: 'count',
    goal: 0,
    appliesTo: 'contacts'
  },
];
