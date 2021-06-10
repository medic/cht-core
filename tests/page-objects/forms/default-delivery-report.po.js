const utils = require('../../utils');
const helper = require('../../helper');
const fs = require('fs');
const { element, by } = require('protractor');

const xml = fs.readFileSync(`${__dirname}/../../../config/default/forms/app/delivery.xml`, 'utf8');

const docs = [
  {
    _id: 'form:delivery',
    internalId: 'D',
    title: 'Delivery',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64'),
      },
    },
  },
];

const selectRadioButtonByValue = async value => {
  await element(by.css(`[value=${value}]`)).click();
};

const selectRadioButtonByNameAndValue = async (name, value) => {
  await element(by.css(`[name="${name}"][value="${value}"]`)).click();
};

module.exports = {
  configureForm: (userContactDoc) => {
    return utils.seedTestData(userContactDoc, docs);
  },

  //patient page
  getPatientPageTitle: () => {
    return element(by.css('span[data-itext-id=/delivery/inputs:label]'));
  },

  selectPatientName: async name => {
    const select = element(by.css('.selection'));
    await helper.waitUntilReadyNative(select);
    await select.click();
    const search = await element(by.css('.select2-search__field'));
    await search.click();
    await search.sendKeys(name);
    await helper.waitElementToBeVisibleNative(element(by.css('.name')));
    await element(by.css('.name')).click();
  },

  //outcome for women
  selectAliveAndWell: async () => {
    await selectRadioButtonByValue('alive_well');
  },

  //danger sign check- Fever*
  selectFeverButton: async () => {
    await selectRadioButtonByNameAndValue(`/delivery/pnc_danger_sign_check/fever`, 'no');
  },

  //Severe headache
  selectSevereHeadacheButton : async () => {
    await selectRadioButtonByNameAndValue(`/delivery/pnc_danger_sign_check/severe_headache`, 'no');
  },
  
  //Vaginal bleeding
  selectVaginalbleedingButton: async () => {
    await selectRadioButtonByNameAndValue(`/delivery/pnc_danger_sign_check/vaginal_bleeding`, 'no');
  },

  //Foul smelling vaginal discharge
  selectVaginalDischargeButton: async () => {
    await selectRadioButtonByNameAndValue(`/delivery/pnc_danger_sign_check/vaginal_discharge`, 'no');
  },

  //Convulsions
  selectConvulsionsButton: async () => {
    await selectRadioButtonByNameAndValue(`/delivery/pnc_danger_sign_check/convulsion`, 'no');
  },

  //DeliveryOutcomes- Babies delivered
  selectBabiesDeliveredButton: async () => {
    await selectRadioButtonByNameAndValue(`/delivery/delivery_outcome/babies_delivered`, 'other');
  },

  enterNoOfBabiesDelivered : async (noOfBabies) => {
    await helper.waitElementToBeVisibleNative(element(by.name('/delivery/delivery_outcome/babies_delivered_other')));
    const noOfBabyTextBox= await element(by.name('/delivery/delivery_outcome/babies_delivered_other'));
    await noOfBabyTextBox.sendKeys(noOfBabies).sendKeys(protractor.Key.ENTER);
  },

  //Babies alive
  selectBabiesAliveButton: async (noOfBabiesAlive) => {
    await helper.waitElementToBeVisibleNative(element(
      by.css(`[name="/delivery/delivery_outcome/babies_alive"][value="3"]`)));
    selectRadioButtonByNameAndValue('/delivery/delivery_outcome/babies_alive', noOfBabiesAlive);
  },

  //Delivery date
  enterDeliveryDate: async deliveryDate => {
    const datePicker = await element(by.xpath(
      `//*[@data-itext-id="/delivery/delivery_outcome/delivery_date:label"]/..//*[@placeholder="yyyy-mm-dd"]`));
    await datePicker.click();
    await datePicker.sendKeys(deliveryDate).sendKeys(protractor.Key.ENTER);
  },

  //Delivery Place
  selectDeliveryPlaceButton: async () => {
    await selectRadioButtonByNameAndValue(`/delivery/delivery_outcome/delivery_place`, 'health_facility');
  },

  //Delivery Method
  selectDeliveryMethod: async () => {
    await helper.waitElementToBeVisibleNative(element(by.name('/delivery/delivery_outcome/delivery_mode')));
    selectRadioButtonByValue('vaginal');
  },

  populateDeadBabyInformation: async (deadBabyIndex) => {
    const basePath = `(//*[@class="repeat-number"])[${deadBabyIndex}]/..//`;
    const dateOfDeathPicker = await element(by.xpath(`${basePath}*[@placeholder="yyyy-mm-dd"]`));
    await dateOfDeathPicker.click();
    await dateOfDeathPicker.sendKeys('').sendKeys(protractor.Key.ENTER);

    const placeOfDeathRadio = await element(by.xpath(`${basePath}*[@value="health_facility"]`));
    await placeOfDeathRadio.click();

    const wasStillBirthRadio = await element(by.xpath(`${basePath}*[@value="yes"]`));
    await wasStillBirthRadio.click();
  },

  populateAliveBabyInformation: async (aliveBabyIndex) => {
    const basePath = `(//*[@class="repeat-number"])[${aliveBabyIndex}]/..//`;

    const babyConditionRadio = await element(by.xpath(`${basePath}*[@value="alive_well"]`));
    await babyConditionRadio.click();

    const babyNameTextBox = await element(by.xpath(`${basePath}*
    [@name="/delivery/babys_condition/baby_repeat/baby_details/baby_name"]`));
    babyNameTextBox.sendKeys(`AliveBaby-${aliveBabyIndex}`);

    const sexRadio = await element(by.xpath(`${basePath}*[@value="male"]`));
    await sexRadio.click();
    
    const birthWeightradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_weight_know"]`));
    await birthWeightradio.click();

    const birthLengthradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/birth_length_know"]`));
    await birthLengthradio.click();

    const vaccineradio = await element(by.xpath(`${basePath}*[@value="bcg_only"]`));
    await vaccineradio.click();

    const breastfeedingradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/breatfeeding"]`));
    await breastfeedingradio.click();

    const initiatedBreastfeedingradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/breastfed_within_1_hour"]`));
    await initiatedBreastfeedingradio.click();

    const umbilicalcordradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/infected_umbilical_cord"]`));
    await umbilicalcordradio.click();

    const convulsionsradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/convulsion"]`));
    await convulsionsradio.click();

    const feedingDifficultyradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/difficulty_feeding"]`));
    await feedingDifficultyradio.click();

    const vomitradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/vomit"]`));
    await vomitradio.click();

    const drowsyradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/drowsy"]`));
    await drowsyradio.click();

    const stiffnessradio = await element(by.xpath(`${basePath}*[@value="no"][
      @data-name="/delivery/babys_condition/baby_repeat/baby_details/stiff"]`));
    await stiffnessradio.click();

    const yellowSkinColorradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/yellow_skin"]`));
    await yellowSkinColorradio.click();

    const feverradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/fever"]`));
    await feverradio.click();

    const blueSkinColorradio = await element(by.xpath(`${basePath}*[@value="no"]
    [@data-name="/delivery/babys_condition/baby_repeat/baby_details/blue_skin"]`));
    await blueSkinColorradio.click();
     
  },

  //PNC visits
  pncCheckBox: async () => {
    await helper.waitElementToBeVisibleNative(element(by.xpath('//*[@value="within_24_hrs"]')));
    await element(by.xpath('//*[@value="within_24_hrs"]')).click();
  },
  
  getDeadBabyUUID: async (deadBabyIndex) => {
    const uuidElement = await element(by.xpath(
      `//*[text()="report.D.baby_death.baby_death_repeat.${deadBabyIndex}.baby_death_profile_doc"]/../../p`));
    return uuidElement.getText();
  },  

  getAliveBabyUUID: async (aliveBabyIndex) => {
    const uuidaliveElement = await element(by.xpath(
      `//*[text()="report.D.babys_condition.baby_repeat.${aliveBabyIndex}.baby_details.child_doc"]/../../p`));
    return uuidaliveElement.getText();
  }
};
