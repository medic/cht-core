const commonElements = require('@page-objects/default/common/common.wdio.page.js');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page.js');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe.skip('Add new district tests : ', () => {
  before(async () => await loginPage.cookieLogin());
  afterEach(() => sentinelUtils.waitForSentinel());

  it('should add new district with a new person', async () => {
    await commonElements.goToPeople();
    const district = 'TestDistrict';
    await contactPage.addPlace({ placeName: 'TestDistrict', contactName: 'Tester' }, false);

    await sentinelUtils.waitForSentinel();

    expect(await (await contactPage.contactCard()).getText()).to.equal(district);
    expect(await contactPage.getPrimaryContactName()).to.equal('Tester');
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
    await contactPage.editDistrict('Caroline\'s district', 'Edited Caroline\'s');
    expect(await (await contactPage.contactCard()).getText()).to.equal('Edited Caroline\'s');
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
    expect(await (await contactPage.contactCard()).getText()).to.equal('At Tudor\'s');

    await commonElements.waitForLoaders();

    const updatedDistrict = await utils.getDoc('other_district');
    expect(updatedDistrict.contact_type).to.equal('not a district_hospital'); // editing didn't overwrite

    // expect to have a single children section
    expect(await (await contactPage.childrenCards()).length).to.equal(1);
    // expect to list two children
    expect(await contactPage.getAllRHSPeopleNames()).to.deep.equal(['Tudor', 'Ginny']);
  });
});
