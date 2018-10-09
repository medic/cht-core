const helper = require('../../helper'),
  deliveryReport = require('../../page-objects/forms/delivery-report.po'),
  genericForm = require('../../page-objects/forms/generic-form.po'),
  common = require('../../page-objects/common/common.po'),
  utils = require('../../utils'),
  userData = require('../../page-objects/forms/data/user.po.data');

describe('Submit Delivery Report', () => {
  const contactId = userData.contactId;
  const docs = userData.docs;
  const noteToCHW =
    'Good news, Jack! Jack () has delivered at the health facility. We will alert you when it is time to refer them for PNC. Please monitor them for danger signs. Thank you!';

  beforeAll(done => {
    protractor.promise
      .all(docs.map(utils.saveDoc))
      .then(() => deliveryReport.configureForm(contactId, done))
      .catch(done.fail);
  });

  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('open delivery form', () => {
    common.goToReports();
    genericForm.selectForm();
    //select name
    deliveryReport.selectPatientName('jack');
    genericForm.nextPage();
    helper.waitElementToBeVisible(element(by.css('[value="healthy"]')));
    //Delivery info
    deliveryReport.selectLiveBirthButton();
    deliveryReport.selectFacilityButton();
    deliveryReport.enterDeliveryDate('');
    genericForm.nextPage();
    expect(deliveryReport.getNoteToCHW()).toBe(noteToCHW);
    genericForm.nextPage();
    //summary page
    expect(deliveryReport.getOutcomeText()).toBe('Live Birth');
    expect(deliveryReport.getDeliveryLocationSummaryText()).toBe('Facility');
    expect(deliveryReport.getFollowUpMessage()).toBe(noteToCHW);
    //submit
    genericForm.submit();
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
  });
});
