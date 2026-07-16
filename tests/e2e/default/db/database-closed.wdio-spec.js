/* global window, PromiseRejectionEvent */
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

const DB_CLOSED_MESSAGE = 'Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.';

const triggerDatabaseConnectionClosed = () => browser.execute((message) => {
  window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
    promise: Promise.resolve(),
    reason: { message },
  }));
}, DB_CLOSED_MESSAGE);

describe('Database closed modal', () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

  afterEach(async () => {
    await commonPage.refresh();
  });

  it('should force a reload as the only option when the database connection closes', async () => {
    await commonPage.goToReports();

    await triggerDatabaseConnectionClosed();
    await modalPage.checkModalIsOpen();

    const { header, body } = await modalPage.getModalDetails();
    expect(header).to.equal('Unexpected error');
    expect(body).to.contain('must be reloaded');

    expect(await modalPage.cancelButton().isExisting()).to.be.false;
    expect(await modalPage.submitButton().getText()).to.equal('Reload');
  });

  it('should not close when pressing Escape', async () => {
    await commonPage.goToReports();

    await triggerDatabaseConnectionClosed();
    await modalPage.checkModalIsOpen();

    await browser.keys(['Escape']);

    expect(await modalPage.isDisplayed()).to.be.true;
  });

  it('should reload the application when clicking Reload', async () => {
    await commonPage.goToReports();

    await triggerDatabaseConnectionClosed();
    await modalPage.checkModalIsOpen();

    // A real page reload wipes this flag off the window.
    await browser.execute(() => {
      window.notReloaded = true;
    });
    await modalPage.submitButton().click();

    await browser.waitUntil(async () => !(await browser.execute(() => window.notReloaded)));
  });

  it('should keep the modal open across navigation', async () => {
    await commonPage.goToReports();

    await triggerDatabaseConnectionClosed();
    await modalPage.checkModalIsOpen();

    await browser.execute(() => {
      window.location.hash = '#/messages';
    });
    await browser.waitUntil(async () => (await browser.getUrl()).includes('/messages'));

    expect(await modalPage.isDisplayed()).to.be.true;
  });
});
