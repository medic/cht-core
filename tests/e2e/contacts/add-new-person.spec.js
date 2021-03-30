const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const helper = require('../../helper');
const utils = require('../../utils');

describe('Add new person tests : ', () => {
  afterEach(utils.afterEach);
  beforeEach(utils.beforeEach);

  it('should add new person', async () => {
    const district = {
      _id: 'the_district',
      name: 'Mary\'s District',
      type: 'district_hospital',
      reported_date: new Date().getTime()
    };
    await utils.saveDoc(district);

    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(district.name);
    await contactPage.addPerson('Himalaya', '1988-10-10');

    await helper.waitUntilReadyNative(contactPage.center());
    expect(await helper.getTextFromElementNative(contactPage.center())).toBe('Himalaya');
  });

  it('should edit a person', async () => {
    const person = {
      _id: 'the_person',
      name: 'Johnny',
      type: 'person',
      reported_date: new Date().getTime(),
    };
    await utils.saveDoc(person);

    await commonElements.goToPeople();
    await contactPage.editPerson(person.name, 'Johnny Silverhand');
    await helper.waitUntilReadyNative(contactPage.center());
    expect(await helper.getTextFromElementNative(contactPage.center())).toBe('Johnny Silverhand');
  });

  it('should edit a person with a contact_type', async () => {
    const person = {
      _id: 'the_person',
      name: 'Rogue',
      type: 'person',
      contact_type: 'omg this field should not be here',
      reported_date: new Date().getTime(),
    };
    await utils.saveDoc(person);

    await commonElements.goToPeople();
    await contactPage.editPerson(person.name, 'Rogue Amendiares');
    await helper.waitUntilReadyNative(contactPage.center());
    expect(await helper.getTextFromElementNative(contactPage.center())).toBe('Rogue Amendiares');
  });
});
