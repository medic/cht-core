const utils = require('../../utils');
const personFactory = require('../../factories/cht/contacts/person');
const placeFactory = require('../../factories/cht/contacts/place');
const {expect} = require('chai');

describe('Editing contacts ', () => {
  const district = placeFactory.generateHierarchy(['district_hospital'])[0];
  const originalContact = personFactory.build(
    {
      parent: {
        _id: district._id,
        parent: district.parent
      }
    });

  const secondContact = personFactory.build(
    {
      parent: {
        _id: district._id,
        parent: district.parent
      }
    });
  district.contact = originalContact;

  before(() => utils.saveDocs([district, originalContact, secondContact]));
  after(() => utils.revertDb([], true));

  it('should change primary contact', async () => {

    //change contact
    await utils.request({
      path: `/api/v1/places/${district._id}`,
      method: 'POST',
      body: {
        contact: secondContact._id
      }
    });

    const newDistrict = await utils.getDoc(district._id);
    expect(newDistrict.contact._id).to.equal(secondContact._id);
  });
});
