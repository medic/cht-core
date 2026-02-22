const dataFactory = require('@factories/cht/generate');

const generate = () => {
  return dataFactory.createHierarchy({
    name: 'test',
    user: true,
    useRealNames: true,
    nbrClinics: 50,
    nbrPersons: 20,
  });
};

module.exports = {
  generate,
};
