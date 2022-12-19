const commonPage = require('../../../../page-objects/default/common/common.wdio.page');
const contactPage = require('../../../../page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('../../../../page-objects/default/reports/reports.wdio.page');
const utils = require('../../../../utils');
const seeder = require('./seeder');

describe('Export enabled when there are items: messages, contacts, peope', async () => {
  before(async () => {
    await seeder.saveDocs();
    await utils.createUsers([seeder.offlineUser]);
    await seeder.newLogin(seeder.offlineUser);
  });

  it('- Message tab', async () => {
    await commonPage.goToMessages();
    await seeder.sendMessage();
    await browser.pause(60000);
    expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
  });

  it('- Contact tab: no contact selected', async () => {
    await commonPage.goToPeople();
    //parent contact
    await commonPage.openKebabMenu();
    expect(await commonPage.isOptionVisible('export', 'contacts')).to.be.false;
    expect(await commonPage.isOptionVisible('edit', 'contacts')).to.be.false;
    expect(await commonPage.isOptionEnabled('delete', 'contacts')).to.be.false;
  });

  it(' - Contact Tab : contact selected', async () => {
    await commonPage.goToPeople();
    //contact selected
    await contactPage.selectLHSRowByText(seeder.contact.name);
    await commonPage.openKebabMenu();
    expect(await commonPage.isOptionVisible('export', 'contacts')).to.be.false;
    expect(await commonPage.isOptionEnabled('edit', 'contacts')).to.be.true;
    expect(await commonPage.isOptionEnabled('delete', 'contacts')).to.be.true;
  });

  it('- options enabled when report selected', async () => {
    await commonPage.goToReports();
    expect(await (await commonPage.moreOptionsMenu()).isExisting()).to.be.false;    
    (await reportPage.firstReport()).click();
    await commonPage.openKebabMenu();
    expect(await commonPage.isOptionVisible('export', 'reports')).to.be.false;
    expect(await commonPage.isOptionVisible('edit', 'reports')).to.be.false; //not xml report
    expect(await commonPage.isOptionEnabled('delete', 'reports')).to.be.true;     
  });
});

