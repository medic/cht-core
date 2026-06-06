const { expect } = require('chai');
const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Editing contacts ', () => {
  const district = placeFactory.place().build({type: CONTACT_TYPES.DISTRICT_HOSPITAL});
  const originalContact = personFactory.build(
    {
      parent: {
        _id: district._id,
        parent: district.parent
      }
    }
  );

  const secondContact = personFactory.build(
    {
      parent: {
        _id: district._id,
        parent: district.parent
      }
    }
  );
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
