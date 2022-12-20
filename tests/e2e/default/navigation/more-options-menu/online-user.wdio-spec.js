const commonPage = require('../../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../../page-objects/default/login/login.wdio.page');
const contactPage = require('../../../../page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('../../../../page-objects/default/reports/reports.wdio.page');
const seeder = require('./seeder');

describe('Export tests', async () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

  describe('Export disabled when no items: messages, contacts, people', async () => {
    //empty db
    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'messages')).to.be.false;    
    });

    it(' - Contact tab', async () => {
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'contacts')).to.be.false;
      expect(await commonPage.isOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isOptionVisible('delete', 'contacts')).to.be.false;     
    });

    it('- Report tab', async () => {
      await commonPage.goToReports();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'reports')).to.be.false;
      expect(await commonPage.isOptionVisible('edit', 'reports')).to.be.false;
      expect(await commonPage.isOptionVisible('delete', 'reports')).to.be.false;     
    });
  });

  describe('Export enabled when there are items: messages, contacts, peope', async () => {
    before(async () => {
      await seeder.saveDocs();
      await seeder.sendMessage();
      await browser.pause(10000);     
    });

    it('- Message tab', async () => {
      await commonPage.goToMessages();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'messages')).to.be.true;    
    });

    it('- Contact tab: no contact selected', async () => {
      await commonPage.goToPeople();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'contacts')).to.be.true;
      expect(await commonPage.isOptionVisible('edit', 'contacts')).to.be.false;
      expect(await commonPage.isOptionVisible('delete', 'contacts')).to.be.false;
    });

    it(' - Contact Tab : contact selected', async () => {
      await commonPage.goToPeople();
      await contactPage.selectLHSRowByText(seeder.contact.name);
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'contacts')).to.be.true;
      expect(await commonPage.isOptionVisible('edit', 'contacts')).to.be.true;
      expect(await commonPage.isOptionVisible('delete', 'contacts')).to.be.true;
    });

    it('- options enabled when report selected', async () => {
      await commonPage.goToReports();
      (await reportPage.firstReport()).click();
      await commonPage.openMoreOptionsMenu();
      expect(await commonPage.isOptionEnabled('export', 'reports')).to.be.true;
      expect(await commonPage.isOptionVisible('edit', 'reports')).to.be.false; //not xml report
      expect(await commonPage.isOptionEnabled('delete', 'reports')).to.be.true;     
    });
  });
});


