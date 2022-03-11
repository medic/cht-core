const deliveryReport = require('../../page-objects/forms/default-delivery-report.po');
const genericForm = require('../../page-objects/forms/generic-form.po');
const common = require('../../page-objects/common/common.po');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const _ = require('lodash');
const { assert } = require('chai');

describe('Submit Default Delivery Report', () => {
  const { userContactDoc, docs } = userData;

  beforeAll(async () => {
    await utils.saveDocs(docs);
    await deliveryReport.configureForm(userContactDoc);
  });


  afterEach(async () => {
    await utils.resetBrowser();
    await utils.revertDb();
  });

  it('open and submit default delivery form', async () => {
    await common.goToReportsNative();

    await genericForm.selectFormNative('DD');
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
    await deliveryReport.enterDeliveryDate(new Date());

    await deliveryReport.selectDeliveryPlaceButton();
    await deliveryReport.selectDeliveryMethod();
    await genericForm.nextPageNative();

    const noOfDeadBabies = 3;
    const noOfAliveBabies = 3;

    // Dead Babies Information
    // We need to loop through all dead babies and fill out information
    for (let i = 1; i <= noOfDeadBabies; i++) {
      await deliveryReport.populateDeadBabyInformation(i);
    }
    await genericForm.nextPageNative();

    // Alive Babies Information
    // We need to loop through all alive babies and fill out information
    for (let i = noOfDeadBabies + 1; i <= noOfDeadBabies + noOfAliveBabies; i++) {
      await deliveryReport.populateAliveBabyInformation(i);
    }
    await genericForm.nextPageNative();

    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await deliveryReport.pncCheckBox();
    await genericForm.nextPageNative();

    //submit
    await genericForm.submitReports();

    // Verify dead babies UUIDs are unique
    const deadBabyUUIds = [];
    for (let i = 0; i <= noOfDeadBabies - 1; i++) {
      deadBabyUUIds.push(await deliveryReport.getDeadBabyUUID(i));
    }

    // Verify alive babies UUIDs are unique
    const aliveBabyUUIds = [];
    for (let i = 0; i <= noOfAliveBabies - 1; i++) {
      aliveBabyUUIds.push(await deliveryReport.getAliveBabyUUID(i));
    }

    assert.equal(_.uniq(deadBabyUUIds).length, noOfDeadBabies);
    assert.equal(_.uniq(aliveBabyUUIds).length, noOfAliveBabies);
  });
});
