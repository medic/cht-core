const dataFactory = require('@factories/cht/generate');
let data;

const generate = () => {
  data = dataFactory.createHierarchy({
    name: 'mychw',
    user: true,
    useRealNames: true,
  });

  return data;
};

module.exports = {
  generate,
  data: () => data,
};
