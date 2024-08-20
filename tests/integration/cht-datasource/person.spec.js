const utils = require('@utils');
const { Person, Qualifier, getRemoteDataContext} = require('@medic/cht-datasource');
const personFactory = require('@factories/cht/contacts/person');
const { expect } = require('chai');

describe('Person', () => {
  const dataContext = getRemoteDataContext(utils.getOrigin());
  const personType = 'person';
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const contact1 = utils.deepFreeze(personFactory.build({ name: 'contact1', role: 'chw' }));
  const contact2 = utils.deepFreeze(personFactory.build({ name: 'contact2', role: 'chw' }));
  const contact3 = utils.deepFreeze(personFactory.build({ name: 'contact3', role: 'chw' }));
  const allDocs = [contact0, contact1, contact2, contact3];
  const e2eTestUser = {
    '_id': 'e2e_contact_test_id',
    'type': 'person',
  };

  before(async () => {
    await utils.saveDocs(allDocs);
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  describe('v1', async () => {
    describe('getAll', async () => {
      it('fetches all data', async () => {
        const expectedData = [...allDocs, e2eTestUser];
        const docs = [];

        const generator = Person.v1.getAll(dataContext)(Qualifier.byContactType(personType));

        for await (const doc of generator) {
          docs.push(doc);
        }

        expect(docs).excluding(['_rev', 'reported_date']).to.deep.equalInAnyOrder(expectedData);
      });
    });
  });
});
