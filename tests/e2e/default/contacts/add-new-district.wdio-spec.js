const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');


describe('Add new district tests : ', () => {
  before(async () => await loginPage.cookieLogin());
  afterEach(async () => {
    sentinelUtils.waitForSentinel();
    await utils.revertDb([/^form:/], true);
  });

  it('should add new district with a new person', async () => {
    await commonPage.goToPeople();
    const district = 'TestDistrict';
    await contactPage.addPlace({ placeName: 'TestDistrict', contactName: 'Tester' }, false);

    await sentinelUtils.waitForSentinel();
    await commonPage.waitForPageLoaded();

    expect(await contactPage.getContactCardText()).to.equal(district);
    expect(await contactPage.getPrimaryContactName()).to.equal('Tester');
  });

  it('should edit district', async () => {
    const district = placeFactory.place().build({
      _id: 'dist1',
      type: 'district_hospital',
      name: 'Caroline\'s district',
      contact: { _id: 'first_person' },
    });

    const person = personFactory.build({
      _id: 'first_person',
      name: 'Caroline',
      parent: { _id: district._id }
    });

    await utils.saveDocs([ district, person ]);
    await commonPage.goToPeople();
    await contactPage.editDistrict('Caroline\'s district', 'Edited Caroline\'s');
    await commonPage.waitForPageLoaded();
    expect(await contactPage.getContactCardText()).to.equal('Edited Caroline\'s');
  });

  it('should edit district with contact_type', async () => {
    const district = placeFactory.place().build({
      _id: 'dist2',
      type: 'district_hospital',
      name: 'Tudor\'s district',
      contact: { _id: 'second_person' },
      contact_type: 'not a district_hospital',
    });

    const person1 = personFactory.build({
      _id: 'second_person',
      name: 'Tudor',
      parent: { _id: district._id }
    });

    const person2 = personFactory.build({
      _id: 'third_person',
      name: 'Ginny',
      parent: { _id: district._id }
    });

    await utils.saveDocs([ district, person1, person2 ]);
    await commonPage.goToPeople();
    await contactPage.editDistrict('Tudor\'s district', 'At Tudor\'s');
    await commonPage.waitForPageLoaded();

    expect(await (await contactPage.contactCard()).getText()).to.equal('At Tudor\'s');

    const updatedDistrict = await utils.getDoc(district._id);
    expect(updatedDistrict.contact_type).to.equal('not a district_hospital'); // editing didn't overwrite

    // expect to have a single children section
    expect(await (await contactPage.childrenCards()).length).to.equal(1);
    // expect to list two children
    expect(await contactPage.getAllRHSPeopleNames()).to.deep.equal(['Tudor', 'Ginny']);
  });
});
