const helper = require('../../helper');
const deliveryReport = require('../../page-objects/forms/default-delivery-report.po');
const genericForm = require('../../page-objects/forms/generic-form.po');
const common = require('../../page-objects/common/common.po');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const _ = require('lodash');
_.uniq = require('lodash/uniq');
const { assert } = require('chai');

describe('Submit Delivery Report', () => {
  const { userContactDoc, docs } = userData;

  beforeAll(async () => {
    await utils.saveDocs(docs);
    await deliveryReport.configureForm(userContactDoc);
  });

  afterEach(utils.resetBrowser);
  afterAll(utils.afterEach);

  it('open delivery form', async () => {
    await common.goToReportsNative();
    
    await genericForm.selectFormNative('D');
    //select name
    await deliveryReport.selectPatientName('jack');
    await genericForm.nextPageNative();
    await deliveryReport.selectAliveAndWell();
    await genericForm.nextPageNative();
    //check Dangersign
    await deliveryReport.selectFeverButton();
    await deliveryReport.selectSevereHeadacheButton();
    await deliveryReport.selectVaginalbleedingButton();
    await deliveryReport.selectVaginalDischargeButton();
    await deliveryReport.selectConvulsionsButton();
    await genericForm.nextPageNative();
    
    // Delivery Outcome
    await deliveryReport.selectBabiesDeliveredButton();
    await deliveryReport.enterNoOfBabiesDelivered(6);
    await deliveryReport.selectBabiesAliveButton(3);

    await deliveryReport.enterDeliveryDate('');
    
    await deliveryReport.selectDeliveryPlaceButton();
    await deliveryReport.selectDeliveryMethod();
    await genericForm.nextPageNative();

    // Dead Babies Information
    // We need to loop through all dead babies and fill out information
    for (let i = 1; i <= 3; i++) {
      deliveryReport.populateDeadBabyInformation(i);
    }
    await genericForm.nextPageNative();

    // Alive Babies Information
    // We need to loop through all alive babies and fill out information
    for (let i = 4; i <= 6; i++) {
      deliveryReport.populateAliveBabyInformation(i);
    }

    await helper.waitMillis(2000);
    
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await deliveryReport.pncCheckBox();
    await genericForm.nextPageNative();

    //submit
    await genericForm.submitReports();

    // Verify dead babies UUIDs are unique
    const deadBabyUUIds = [];
    for (let i = 0; i <= 2; i++) {
      deadBabyUUIds.push(await deliveryReport.getDeadBabyUUID(i));
    }
    console.log(`Dead UUIDS: ${deadBabyUUIds}`);

    // Verify alive babies UUIDs are unique
    const aliveBabyUUIds = [];
    for (let i = 0; i <= 2; i++) {
      aliveBabyUUIds.push(await deliveryReport.getAliveBabyUUID(i));
    }
    console.log(`Alive UUIDS: ${aliveBabyUUIds}`);

    assert.equal(_.uniq(deadBabyUUIds).length,3);
    assert.equal(_.uniq(aliveBabyUUIds).length,3);
 
  });
});
