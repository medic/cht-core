const helper = require('../../helper');
const ZScoreForm = require('../../page-objects/forms/z-score.po');
const constants = require('../../constants');
const utils = require('../../utils');

const userContactDoc = {
  _id: constants.USER_CONTACT_ID,
  name: 'Jack',
  date_of_birth: '',
  phone: '+64274444444',
  alternate_phone: '',
  notes: '',
  type: 'person',
  reported_date: 1478469976421,
  parent: {
    _id: 'some_parent'
  }
};

describe('Submit Z-Score form', () => {
  beforeAll(done => {
    Promise.resolve()
      .then(() => ZScoreForm.configureForm(userContactDoc, done))
      .catch(done.fail);
  });

  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  it('Autofills zscore fields with correct values', () => {
    ZScoreForm.load();

    ZScoreForm.setPatient({ sex: 'female', height: 45, weight: 2, age: 0 });
    browser.sleep(100);

    expect(ZScoreForm.getHeightForAge()).toEqual('-2.226638023630504');
    expect(ZScoreForm.getWeightForAge()).toEqual('-3.091160220994475');
    expect(ZScoreForm.getWeightForHeight()).toEqual('-2.402439024390243');

    ZScoreForm.setPatient({ sex: 'male', height: 45, weight: 2, age: 0 });
    browser.sleep(100);

    expect(ZScoreForm.getHeightForAge()).toEqual('-2.5800316957210767');
    expect(ZScoreForm.getWeightForAge()).toEqual('-3.211081794195251');
    expect(ZScoreForm.getWeightForHeight()).toEqual('-2.259036144578314');

    ZScoreForm.setPatient({ sex: 'female', height: 45.2, weight: 5, age: 1 });
    browser.sleep(100);

    expect(ZScoreForm.getHeightForAge()).toEqual('-2.206434316353886');
    expect(ZScoreForm.getWeightForAge()).toEqual('3.323129251700681');
    expect(ZScoreForm.getWeightForHeight()).toEqual('4');

    ZScoreForm.setPatient({ sex: 'male', height: 45.2, weight: 5, age: 1 });
    browser.sleep(100);

    expect(ZScoreForm.getHeightForAge()).toEqual('-2.5651715039577816');
    expect(ZScoreForm.getWeightForAge()).toEqual('2.9789983844911148');
    expect(ZScoreForm.getWeightForHeight()).toEqual('4');
  });

  it('saves z-score values', async () => {
    await ZScoreForm.load();

    await ZScoreForm.setPatient({ sex: 'female', height: 45.1, weight: 3, age: 2 });
    await browser.sleep(100);

    expect(await ZScoreForm.getHeightForAge()).toEqual('-2.346895074946466');
    expect(await ZScoreForm.getWeightForAge()).toEqual('-0.4708520179372194');
    expect(await ZScoreForm.getWeightForHeight()).toEqual('2.0387096774193547');

    await ZScoreForm.submit();

    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(1) p')))).toEqual('45.1');
    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(2) p')))).toEqual('3');
    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(3) p')))).toEqual('female');
    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(4) p')))).toEqual('2');

    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(5) p'))))
      .toEqual('2.0387096774193547');
    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(6) p'))))
      .toEqual('-0.4708520179372194');
    expect(await helper.getTextFromElement(element(by.css('#reports-content .details li:nth-child(7) p'))))
      .toEqual('-2.346895074946466');
  });
});
