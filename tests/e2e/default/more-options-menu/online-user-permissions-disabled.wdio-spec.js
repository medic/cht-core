const uuid = require('uuid').v4;
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const reportPage = require('../../../page-objects/default/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const utils = require('../../../utils');
const reportFactory = require('../../../factories/cht/reports/generic-report');
const personFactory = require('../../../factories/cht/contacts/person');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const sms = require('../../../utils/sms');

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const health_center = places.get('health_center');
const district_hospital = places.get('district_hospital');
const contact = personFactory.build({
  _id: uuid(),
  name: 'contact',
  phone: '+12068881234',
  place: health_center._id,
  type: 'person',
  parent: {
    _id: health_center._id,
    parent: health_center.parent
  },
});

const onlineUser = userFactory.build({
  username: 'onlineuser',
  roles: [ 'program_officer' ],
  place: district_hospital._id,
  contact: contact._id,
});

const patient = personFactory.build({
  _id: uuid(),
  parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
});

const reports = [
  reportFactory.build({ form: 'home_visit', content_type: 'xml' }, { patient, submitter: contact })
];  

describe('- permissions disabled', async () => {
  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient, ...reports ]);
    await sms.sendSms('testing', contact.phone);
    await utils.createUsers([onlineUser]);
    await loginPage.login(onlineUser);
    await commonPage.waitForLoaderToDisappear();
    expect(await commonPage.isMessagesListPresent()).to.be.true;
  });

  describe('- export permissions disabled', async () => {
    before(async () => {
      const exportPermissions = ['can_export_all', 'can_export_contacts', 'can_export_messages'];
      await utils.updatePermissions(onlineUser.roles, [], exportPermissions);
      await commonPage.closeReloadModal();
    });

    after(async () => await utils.revertSettings(true));
  
    it(' - Contact Tab - contact selected', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.true;
    });
  
    it('- Contact Tab- options enabled when report selected', async () => {
      await commonPage.goToReports();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
      (await reportPage.firstReport()).click();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;     
    }); 

    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await commonPage.waitForLoaderToDisappear();
      expect(await commonPage.isMessagesListPresent()).to.be.true;
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
    }); 
  });

  describe('- DELETE permissions disabled', async () => {
    before(async () => {
      await utils.updatePermissions(onlineUser.roles, [], ['can_delete_contacts', 'can_delete_reports']);
      await commonPage.closeReloadModal();
    });

    after(async () => await utils.revertSettings(true));

    it(' - Contact Tab - contact selected', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('delete', 'contacts')).to.be.false;
    });
  
    it('- Report Tab - options enabled when report selected', async () => {
      await commonPage.goToReports();
      (await reportPage.firstReport()).click();
      await commonPage.openMoreOptionsMenu(); 
      expect(await commonPage.isMenuOptionVisible('delete', 'reports')).to.be.false;     
    });  
  });

  describe('- EDIT permissions disabled', async () => {
    before(async () => {
      await utils.updatePermissions(onlineUser.roles, [], ['can_edit']);
      await commonPage.closeReloadModal();
    });
    
    after(async () => await utils.revertSettings(true));
    
    it(' - Contact Tab - contact selected', async () => {
      await commonPage.goToPeople(contact._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
    });
  
    it('- Report Tab - options enabled when report selected', async () => {
      await commonPage.goToReports();
      (await reportPage.firstReport()).click();
      await commonPage.openMoreOptionsMenu(); 
      expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;     
    });  
  });
});




