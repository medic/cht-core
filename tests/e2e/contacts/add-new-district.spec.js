const commonElements = require('../../page-objects/common/common.po.js');
const contactPage = require('../../page-objects/contacts/contacts.po.js');
const helper = require('../../helper');
const utils = require('../../utils');

describe('Add new district tests : ', () => {
  afterEach(utils.afterEach);
  afterAll(utils.afterEach);

  it('should add new district with a new person', async () => {
    await commonElements.goToPeople();
    const district = 'BedeDistrict';
    await contactPage.addNewDistrict(district);
    await helper.waitUntilReadyNative(contactPage.center());
    expect(await contactPage.center().getText()).toBe(district);
    await helper.waitUntilReadyNative(contactPage.name());
    expect(await contactPage.name().getText()).toBe('Bede');
  });

  it('should edit district', async () => {
    const contacts = [
      {
        _id: 'one_district',
        type: 'district_hospital',
        name: 'Caroline\'s district',
        contact: { _id: 'one_person' },
        reported_at: new Date().getTime(),
      },
      {
        _id: 'one_person',
        type: 'person',
        name: 'Caroline',
        parent: { _id: 'one_district' },
        reported_at: new Date().getTime(),
      },
    ];

    await utils.saveDocs(contacts);
    await commonElements.goToPeople();
    await contactPage.editDistrict('Caroline\'s district', 'At Caroline\'s');
    await helper.waitUntilReadyNative(contactPage.center());
    expect(await contactPage.center().getText()).toBe('At Caroline\'s');
  });

  it('should edit district with contact_type', async () => {
    const contacts = [
      {
        _id: 'other_district',
        type: 'district_hospital',
        contact_type: 'not a district_hospital',
        name: 'Tudor\'s district',
        contact: { _id: 'other_person' },
        reported_at: new Date().getTime(),
      },
      {
        _id: 'other_person',
        type: 'person',
        contact_type: 'something',
        name: 'Tudor',
        parent: { _id: 'other_district' },
        reported_at: new Date().getTime(),
      },
      {
        _id: 'third_person',
        type: 'person',
        name: 'Ginny',
        parent: { _id: 'other_district' },
        reported_at: new Date().getTime(),
      },
    ];

    await utils.saveDocs(contacts);
    await commonElements.goToPeople();
    await contactPage.editDistrict('Tudor\'s district', 'At Tudor\'s');
    await helper.waitUntilReadyNative(contactPage.center());
    expect(await contactPage.center().getText()).toBe('At Tudor\'s');

    const updatedDistrict = await utils.getDoc('other_district');
    expect(updatedDistrict.contact_type).toEqual('not a district_hospital'); // editing didn't overwrite

    // expect to have a single children section
    expect(await contactPage.childrenCards().count()).toEqual(1);
    // expect to list two children
    expect(await contactPage.peopleRows.count()).toEqual(2);
    const childrenNames = await contactPage.peopleRows.map(row => helper.getTextFromElementNative(row));
    expect(childrenNames).toEqual(['Tudor', 'Ginny']);
  });
});
