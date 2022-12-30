const commonPage = require('../../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../../page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('../../../../page-objects/default/reports/reports.wdio.page');
const utils = require('../../../../utils');
const placeFactory = require('../../../../factories/cht/contacts/place');
const reportFactory = require('../../../../factories/cht/reports/generic-report');
const personFactory = require('../../../../factories/cht/contacts/person');
const userFactory = require('../../../../factories/cht/users/users');
const loginPage = require('../../../../page-objects/default/login/login.wdio.page');
const uuid = require('uuid').v4;
const moment = require('moment');
const today = moment();

const places = placeFactory.generateHierarchy();
const clinic = places.get('clinic');
const health_center = places.get('health_center');
const district_hospital = places.get('district_hospital');

const contact = personFactory.build({
  _id: uuid(),
  name: 'OfflineContact',
  phone: '+12068881234',
  place: health_center._id,
  type: 'person',
  parent: {
    _id: health_center._id,
    parent: health_center.parent
  },
});

const offlineUser = userFactory.build({
  username: 'offlineuser',
  isOffline: true,
  roles:['chw'],
  place: health_center._id,
  contact: contact._id,
});


const patient = personFactory.build({
  _id: uuid(),
  parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
});

const reports = [
  reportFactory.build(
    {
      form: 'P',
      reported_date: moment([ today.year(), today.month() - 4, 1, 23, 30 ]).valueOf(),
      patient_id: patient._id,
    },
    {
      patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id},
    },
  ),
];

const sendMessage = async (message = 'Testing', phone = contact.phone) => {
  await utils.request({
    method: 'POST',
    path: '/api/v2/records',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded'
    },
    body:`message=${message}&from=${phone}`,
  });  
};

const updatePermissions = async (role, addPermissions, removePermissions = []) => {
  const settings = await utils.getSettings();
  addPermissions.map(permission => settings.permissions[permission].push(role));
  removePermissions.forEach(permission => {
    settings.permissions[permission] = [''];//settings.permissions[permission].filter(r => r !== role);
  });
  await utils.updateSettings({ roles: settings.roles, permissions: settings.permissions }, true);
};

describe('More Options Menu - Offline User', async () => {
  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient, ...reports ]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  describe('all permissions enabled', async () => {
    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await sendMessage();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
    });

    it('- Contact tab: no contact selected', async () => {
      await commonPage.goToPeople();
      //parent contact
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isOptionEnabled('delete', 'contacts')).to.be.false;
    });

    it(' - Contact Tab : contact selected', async () => {
      await commonPage.goToPeople();
      //contact selected
      await contactPage.selectLHSRowByText(contact.name);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isOptionEnabled('edit', 'contacts')).to.be.true;
      expect(await commonPage.isOptionEnabled('delete', 'contacts')).to.be.true;
    });

    it('- options enabled when report selected', async () => {
      await commonPage.goToReports();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
      (await reportPage.firstReport()).click();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isOptionVisible('edit', 'reports')).to.be.false; //not xml report
      expect(await commonPage.isOptionEnabled('delete', 'reports')).to.be.true;     
    });
  });

  //permissions disabled
  describe('all permissions disabled', async () => {
    const allPermissions = ['can_edit', 'can_delete_contacts', 'can_export_all', 
      'can_export_contacts', 'can_export_messages', 
      'can_delete_reports', 'can_update_reports'];

    before(async () => {
      await updatePermissions(offlineUser.roles, [], allPermissions);
      await commonPage.closeReloadModal();
    });
    after(async () => {
      await utils.revertSettings(true);
    });
  
    it(' - all tabs, kebab menu not available', async () => {
      await commonPage.goToMessages();
      await sendMessage();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;

      await commonPage.goToPeople();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
        
      await contactPage.selectLHSRowByText(contact.name);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;  
    
      await commonPage.goToReports();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
      (await reportPage.firstReport()).click();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;   
    });    
  });

  describe('- DELETE permissions disabled', async () => {
    before(async () => {
      await updatePermissions(offlineUser.roles, [], ['can_delete_contacts', 'can_delete_reports']);
      await commonPage.closeReloadModal();
    });

    after(async () => {
      await utils.revertSettings(true);
    });

    it(' - Contact Tab : contact selected', async () => {
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText(contact.name);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
    });
  
    it('- options enabled when report selected', async () => {
      await commonPage.goToReports();
      (await reportPage.firstReport()).click();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;     
    });  
  });

  describe('- EDIT permissions disabled', async () => {
    before(async () => {
      await updatePermissions(offlineUser.roles, [], ['can_edit']);
      await commonPage.closeReloadModal();
    });
    
    after(async () => {
      await utils.revertSettings(true);
    });
    
    it(' - Contact Tab : contact selected', async () => {
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText(contact.name);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
    });
  
    it('- options enabled when report selected', async () => {
      await commonPage.goToReports();
      (await reportPage.firstReport()).click();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
    });  
  });
});

