module.exports = [
  {
    id: 'muted-this-month',
    context: 'user.parent.type === "district_hospital"',
    type: 'count',
    goal: 0,
    appliesTo: 'contacts',
    appliesIf: (c) => !!c.foo.muted
  },
];
