const helper = require('../../helper');
const deliveryReport = require('../../page-objects/forms/delivery-report.po');
const genericForm = require('../../page-objects/forms/generic-form.po');
const common = require('../../page-objects/common/common.po');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');

describe('Submit Delivery Report', () => {
  const { userContactDoc, docs } = userData;
  const noteToCHW = 'Good news, Jack! Jack () has delivered at the health facility. We will alert you when it is ' +
  'time to refer them for PNC. Please monitor them for danger signs. Thank you!';

  beforeAll(async () => {
    await docs.map(utils.saveDoc);
    await deliveryReport.configureForm(userContactDoc);
  });

  afterEach(async () => { await utils.resetBrowser(); });

  afterAll(async () => { await utils.afterEach(); });

  it('open delivery form', async () => {
    await common.goToReports();
    await genericForm.selectForm();
    //select name
    await deliveryReport.selectPatientName('jack');
    await genericForm.nextPage();
    await helper.waitElementToBeVisible(element(by.css('[value="healthy"]')));
    //Delivery info
    await deliveryReport.selectLiveBirthButton();
    await deliveryReport.selectFacilityButton();
    await deliveryReport.enterDeliveryDate('');
    await genericForm.nextPage();
    expect(await deliveryReport.getNoteToCHW()).toBe(noteToCHW);
    await genericForm.nextPage();
    //summary page
    expect(await deliveryReport.getOutcomeText()).toBe('Live Birth');
    expect(await deliveryReport.getDeliveryLocationSummaryText()).toBe('Facility');
    expect(await deliveryReport.getFollowUpMessage()).toBe(noteToCHW);
    //submit
    await genericForm.submit();
    expect(await element(by.css('div.details')).isPresent()).toBeTruthy();
  });
});
