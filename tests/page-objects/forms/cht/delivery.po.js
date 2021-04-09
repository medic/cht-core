const helper = require('../../../helper');
const genericForm = require('../generic-form.po');
const moment = require('moment');

const inputBase = 'input[name="/delivery/';

const condition = `${inputBase}condition/woman_outcome"]`;
const womanAliveAndWell = element(by.css(`${condition}[value=alive_well]`));

const fever = `${inputBase}pnc_danger_sign_check/fever"]`;
const noFever = element(by.css(`${fever}[value=no]`));


const headache = `${inputBase}pnc_danger_sign_check/severe_headache"]`;
const noHeadache = element(by.css(`${headache}[value=no]`));

const vaginalBleeding = `${inputBase}pnc_danger_sign_check/vaginal_bleeding"]`;
const noBleeding = element(by.css(`${vaginalBleeding}[value=no]`));


const smellOrDischarge = `${inputBase}pnc_danger_sign_check/vaginal_discharge"]`;
const noSmellOrDischarge = element(by.css(`${smellOrDischarge}[value=no]`));


const convulsion = `${inputBase}pnc_danger_sign_check/convulsion"]`;
const noConvulsion = element(by.css(`${convulsion}[value=no]`));

const numbOfBabiesDelivered = `${inputBase}delivery_outcome/babies_delivered"]`;
const oneBaby = element(by.css(`${numbOfBabiesDelivered}[value="1"]`));

const numbOfBabiesAlive = `${inputBase}delivery_outcome/babies_alive"]`;
const oneBabyAlive = element(by.css(`${numbOfBabiesAlive}[value="1"]`));

// const dateOfDelivery =  element(by.css(`${inputBase}delivery_outcome/delivery_date"]`));
const dateOfDelivery =  element(by.css(`.question .widget.date:not(.readonly) .ignore`));

const whereWasDelivery = `${inputBase}delivery_outcome/delivery_place"]`;
const healthFacility = element(by.css(`${whereWasDelivery}[value=health_facility]`));
 
const howDidSheDeliver = `${inputBase}delivery_outcome/delivery_mode"]`;
const vaginalDelivery = element(by.css(`${howDidSheDeliver}[value=vaginal]`));

const babyRepeat = 'input[data-name="/delivery/babys_condition/baby_repeat/baby_details';
const conditionOfBaby = `input[data-name="/delivery/babys_condition/baby_repeat/baby_details/baby_condition"]`;
const babyAliveAndWell = element(by.css(`${conditionOfBaby}[value=alive_well]`));

const babyName = element(by.css(`${inputBase}babys_condition/baby_repeat/baby_details/baby_name"]`));

const babySex = `${babyRepeat}/baby_sex"]`;
const female = element(by.css(`${babySex}[value=female]`));


const babyWeightKnown = `${babyRepeat}/birth_weight_know"]`;
const noKnownWeight = element(by.css(`${babyWeightKnown}[value=no]`));

const babyLengthKnown = `${babyRepeat}/birth_length_know"]`;
const noKnownLength = element(by.css(`${babyLengthKnown}[value=no]`));

const vaccinesReceived = `${babyRepeat}/vaccines_received"]`;
const noVaccinesReceived = element(by.css(`${vaccinesReceived}[value=none]`));

const breastfeeding = `${babyRepeat}/breatfeeding"]`;
const yesBreastFeeding = element(by.css(`${breastfeeding}[value=yes]`));

const breastfeeding1Hour = `${babyRepeat}/breastfed_within_1_hour"]`;
const yesBreastFeeding1Hour = element(by.css(`${breastfeeding1Hour}[value=yes]`));

const infectedUmbilicalCord = `${babyRepeat}/infected_umbilical_cord"]`;
const noInfectedUmbilicalCord = element(by.css(`${infectedUmbilicalCord}[value=no]`));

const babyConvulsions = `${babyRepeat}/convulsion"]`;
const noBabyConvulsion = element(by.css(`${babyConvulsions}[value=no]`));

const difficultyFeeding = `${babyRepeat}/difficulty_feeding"]`;
const noDifficultyFeeding = element(by.css(`${difficultyFeeding}[value=no]`));

const vomiting = `${babyRepeat}/vomit"]`;
const noVomiting = element(by.css(`${vomiting}[value=no]`));

const drowsy = `${babyRepeat}/drowsy"]`;
const noDrowsy = element(by.css(`${drowsy}[value=no]`));

const stiffness = `${babyRepeat}/stiff"]`;
const noStiffness = element(by.css(`${stiffness}[value=no]`));

const yellowSkin = `${babyRepeat}/yellow_skin"]`;
const noYellowSkin = element(by.css(`${yellowSkin}[value=no]`));

const babyFever = `${babyRepeat}/fever"]`;
const noBabyFever = element(by.css(`${babyFever}[value=no]`));

const blueSkin = `${babyRepeat}/blue_skin"]`;
const noBlueSkin = element(by.css(`${blueSkin}[value=no]`));

const pncVisits = `${inputBase}pnc_visits/pnc_visits_attended"]`;
const noPncVisits = element(by.css(`${pncVisits}[value=none]`));


module.exports = {
  fillForm: async () => {
    await helper.waitUntilReadyNative(genericForm.formTitle);
    await helper.clickElementNative(womanAliveAndWell);
    await genericForm.nextPageNative();
    await helper.clickElementNative(noFever);
    await helper.clickElementNative(noHeadache);
    await helper.clickElementNative(noBleeding);
    await helper.clickElementNative(noSmellOrDischarge);
    await helper.clickElementNative(noConvulsion);
    await genericForm.nextPageNative();
    await helper.clickElementNative(oneBaby);
    await helper.clickElementNative(oneBabyAlive);
    const deliveryDate = moment().format('YYYY-MM-DD');
    await dateOfDelivery.sendKeys(deliveryDate, protractor.Key.TAB);
    await helper.clickElementNative(healthFacility);
    await helper.clickElementNative(vaginalDelivery);
    await genericForm.nextPageNative();
    await helper.clickElementNative(babyAliveAndWell);
    await babyName.sendKeys('Timmy Smith');
    await helper.clickElementNative(female);
    await helper.clickElementNative(noKnownWeight);
    await helper.clickElementNative(noKnownLength);
    await helper.clickElementNative(noVaccinesReceived);
    await helper.clickElementNative(yesBreastFeeding);
    await helper.clickElementNative(yesBreastFeeding1Hour);
    await helper.clickElementNative(noInfectedUmbilicalCord);
    await helper.clickElementNative(noBabyConvulsion);
    await helper.clickElementNative(noDifficultyFeeding);
    await helper.clickElementNative(noVomiting);
    await helper.clickElementNative(noDrowsy);
    await helper.clickElementNative(noStiffness);
    await helper.clickElementNative(noYellowSkin);
    await helper.clickElementNative(noBabyFever);
    await helper.clickElementNative(noBlueSkin);
    await genericForm.nextPageNative();
    await genericForm.nextPageNative();
    await helper.clickElementNative(noPncVisits);
    await genericForm.nextPageNative();
    await genericForm.submitNative();
  }
};
