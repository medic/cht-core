const { DOC_IDS } = require('@medic/constants');

const errorTarget = {
  id: 'muted-this-month',
  context: `user.parent.type === "${DOC_IDS.HEALTH_CENTER}"`,
  type: 'count',
  goal: 0,
  appliesTo: 'contacts',
  appliesIf: (c) => !!c.foo.muted
};

module.exports = [
  errorTarget
];
