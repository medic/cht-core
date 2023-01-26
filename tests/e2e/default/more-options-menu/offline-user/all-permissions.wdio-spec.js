const uuid = require('uuid').v4;
const commonPage = require('../../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../../page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('../../../../page-objects/default/reports/reports.wdio.page');
const utils = require('../../../../utils');
const placeFactory = require('../../../../factories/cht/contacts/place');
const reportFactory = require('../../../../factories/cht/reports/generic-report');
const personFactory = require('../../../../factories/cht/contacts/person');
const userFactory = require('../../../../factories/cht/users/users');
const loginPage = require('../../../../page-objects/default/login/login.wdio.page');
const sms = require('../../../../utils/sms');

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
const xmlReport = reportFactory.build({ form: 'home_visit', content_type: 'xml' }, { patient, submitter: contact });

const smsReport = reportFactory.build(
  {
    form: 'P',
    patient_id: patient._id,
  },
  {
    patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: patient._id},
  },
);

describe('More Options Menu - Offline User', async () => {
  let xmlReportId;
  let smsReportId;
  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient]);
    let result = await utils.saveDoc(xmlReport);
    xmlReportId = result.id;
    result = await utils.saveDoc(smsReport);
    smsReportId = result.id;
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });
  
  after(async () => await utils.revertSettings(true));

  describe('all permissions enabled', async () => {
    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await sms.sendSms('testing', contact.phone);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
    });

    it('- Contact tab - no contact selected', async () => {
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.false;
    });

    it(' - Contact Tab - contact selected', async () => {
      await commonPage.goToPeople(patient._id);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit', 'contacts')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.true;
    });

    it(' - Contact Tab - with same facility_id', async () => {
      await commonPage.goToPeople(offlineUser.place);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'contacts')).to.be.false;
    });

    it('Report tab - options enabled when sms report selected', async () => {
      await commonPage.goToReports();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
      await reportPage.goToReportById(smsReportId);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionVisible('edit', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;     
    });

    it('Report tab - options enabled when xml report selected', async () => {  
      await reportPage.goToReportById(xmlReportId);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isMenuOptionVisible('export', 'reports')).to.be.false;
      expect(await commonPage.isMenuOptionEnabled('edit', 'reports')).to.be.true;
      expect(await commonPage.isMenuOptionEnabled('delete', 'reports')).to.be.true;     
    });
  });

  describe('all permissions disabled', async () => {
    before(async () => {
      const allPermissions = ['can_edit', 'can_delete_contacts', 'can_export_all', 
        'can_export_contacts', 'can_export_messages', 
        'can_delete_reports', 'can_update_reports'];
      await utils.updatePermissions(offlineUser.roles, [], allPermissions);
      await commonPage.closeReloadModal();
    });

    after(async () => await utils.revertSettings(true));
  
    it(' - all tabs, kebab menu not available', async () => {
      await commonPage.goToMessages();
      await sms.sendSms('testing', contact.phone);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;

      await commonPage.goToPeople();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
        
      await contactPage.selectLHSRowByText(contact.name);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;  
    
      await commonPage.goToReports();
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
      await reportPage.goToReportById(smsReportId);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;
      await reportPage.goToReportById(xmlReportId);
      expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;   
    });    
  });
});

