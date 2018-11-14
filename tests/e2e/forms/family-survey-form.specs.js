const familyForm = require('../../page-objects/forms/family-survey-form.po'),
  genericForm = require('../../page-objects/forms/generic-form.po'),
  common = require('../../page-objects/common/common.po.js'),
  utils = require('../../utils'),
  userData = require('../../page-objects/forms/data/user.po.data');

describe('Family Survey form', () => {
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

  it('Submit Family Survey form', () => {
    common.goToReports();
    genericForm.selectForm();
    genericForm.nextPage();
    familyForm.fillFamilySurvey();
    genericForm.nextPage();
    familyForm.familyConditions();
    genericForm.submit();
    familyForm.reportCheck('yes', 2, 'yes');
    genericForm.editForm();
    genericForm.nextPage();
    familyForm.fillFamilySurvey(1, 3);
    genericForm.nextPage();
    familyForm.familyConditions(1);
    genericForm.submit();
    familyForm.reportCheck('no', 3, 'no');
    genericForm.reportApprove();
    genericForm.invalidateReport();
    genericForm.validateReport();
  });
});