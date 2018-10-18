const familyForm = require('../../page-objects/forms/add-family-form.po'),
  genericForm = require('../../page-objects/forms/generic-form.po'),
  common = require('../../page-objects/common/common.po.js'),
  utils = require('../../utils'),
  userData = require('../../page-objects/forms/data/user.po.data');

describe('Family form', () => {
  const contactId = userData.contactId;
  const docs = userData.docs;

  beforeAll(done => {
    protractor.promise
      .all(docs.map(utils.saveDoc))
      .then(() => familyForm.configureForm(contactId, done))
      .catch(done.fail);
  });

  afterEach(done => {
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

/* DISABLED: https://github.com/medic/medic-webapp/issues/4908
  it('Submit Add Family form', () => {
    common.goToReports();
    genericForm.selectForm();
    familyForm.fillPrimaryCaregiver('test');
    genericForm.nextPage();
    familyForm.fillPrimaryTel();
    genericForm.nextPage();
    familyForm.fillSexAndAge();
    genericForm.nextPage();
    familyForm.fillChildren();
    genericForm.nextPage();
    familyForm.registerChildrenOption();
    genericForm.nextPage();
    familyForm.womenBetween();
    genericForm.nextPage();
    familyForm.registerWomenOption();
    genericForm.nextPage();
    familyForm.finalSurvey(0, 0, 0, 0);
    genericForm.submit();
    familyForm.reportCheck('test Family', 'boreholes', 'true', 'true', 'ucid');
    genericForm.editForm();
    familyForm.fillPrimaryCaregiver('modified');
    genericForm.nextPage(8);
    familyForm.finalSurvey(1, 1, 1, 1);
    genericForm.submit();
    familyForm.reportCheck(
      'modified Family',
      'boreholes spring',
      'false',
      'false',
      'ucid condoms'
    );
    genericForm.reportApprove();
    genericForm.invalidateReport();
    genericForm.validateReport();
  });
*/
});
