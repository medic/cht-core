const context = {};

const cards = [
  {
    label: 'first.card',
    collapsed: false,
    fields: [{
      label: 'first.field',
      value: 'Test Value 1'
    }]
  },
  {
    label: 'second.card',
    collapsed: true,
    fields: [{
      label: 'second.field',
      value: 'Test Value 2'
    }]
  }
];

const fields = [];

module.exports = {
  cards,
  fields,
  context
};
