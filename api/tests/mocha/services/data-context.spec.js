const dataSource = require('@medic/cht-datasource');
const { expect } = require('chai');
const db = require('../../../src/db');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');

describe('Data context service', () => {
  it('is initialized with the methods from the data context', () => {
    const expectedDataContext = dataSource.getLocalDataContext(config, db);

    expect(dataContext.bind).is.a('function');
    expect(dataContext).excluding('bind').to.deep.equal(expectedDataContext);
  });
});
