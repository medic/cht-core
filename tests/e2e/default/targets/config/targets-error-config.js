const errorTarget = {
  id: 'muted-this-month',
  context: 'user.parent.type === "health_center"',
  type: 'count',
  goal: 0,
  appliesTo: 'contacts',
  appliesIf: (c) => !!c.foo.muted
};

module.exports = [
  errorTarget
];
