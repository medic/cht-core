const helper = require('../../helper'),
  deliveryReport = require('../../page-objects/forms/delivery-report.po.js');

describe('Submit Delivery Report', () => {

  beforeEach(done => {
    browser.ignoreSynchronization = true;
    deliveryReport.configureForm(done);
  });

  afterEach(done => {
    deliveryReport.teardown(done);
  });

  it('open delivery form', () => {
    element(by.id('reports-tab')).click();

    // refresh - live list only updates on changes but changes are disabled for e2e
    browser.driver.navigate().refresh();
    browser.wait(() => {
      return element(by.css('.action-container .general-actions .fa-plus')).isPresent();
    }, 10000);

    // select form
    element(by.css('.action-container .general-actions .fa-plus')).click();
    element(by.css('.action-container .general-actions .dropup.open .dropdown-menu li:first-child a')).click();
    browser.wait(() => {
      return element(by.css('#report-form')).isPresent();
    }, 10000);

    expect(helper.isTextDisplayed('Delivery'));
  });
});
