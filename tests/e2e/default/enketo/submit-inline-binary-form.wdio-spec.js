const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const uuid = require('uuid').v7;

const BADGE_ATTACHMENT = 'user-file-inline-binary-report/badge';
const BADGE_REFERENCE = 'inline-binary-report/badge';
const BADGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

const seedReport = () => {
  const id = uuid();
  return {
    _id: id,
    form: 'inline-binary-report',
    type: 'data_record',
    content_type: 'xml',
    reported_date: Date.now(),
    hidden_fields: ['meta'],
    fields: {
      patient_name: 'Ada',
      badge: BADGE_REFERENCE,
      meta: { instanceID: `uuid:${id}` },
    },
    _attachments: {
      [BADGE_ATTACHMENT]: {
        content_type: 'image/png',
        data: BADGE_BASE64,
      },
    },
  };
};

describe('Submit inline-binary report form', () => {

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/inline-binary-report`));
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('preserves an untouched inline-binary field and its attachment on edit', async () => {
    // Seed report directly rather than creating one through the form
    // so the edit starts from a node that is empty in the form but
    // whose reference + attachment already exist on the doc.
    const report = seedReport();
    await utils.saveDoc(report);
    const seeded = await utils.getDoc(report._id);
    const seededBadge = seeded._attachments[BADGE_ATTACHMENT];
    expect(seededBadge, 'seed should have the badge attachment').to.exist;

    await commonPage.goToReports();
    await reportsPage.openReport(report._id);
    await commonPage.accessEditOption();
    await commonEnketoPage.setInputValue('Patient Name', 'Ada Lovelace');
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    const updated = await utils.getDoc(report._id, '', '?attachments=true');
    // The visible field changed...
    expect(updated.fields.patient_name).to.equal('Ada Lovelace');
    // ...but the untouched inline-binary field keeps its reference value...
    expect(updated.fields.badge).to.equal(BADGE_REFERENCE);

    const updatedBadge = updated._attachments[BADGE_ATTACHMENT];
    // ...and the attachment is still there, byte-for-byte.
    expect(updatedBadge, 'badge attachment should survive the edit').to.exist;
    expect(updatedBadge.content_type).to.equal('image/png');
    expect(updatedBadge.data).to.equal(BADGE_BASE64);
    expect(updatedBadge.digest).to.equal(seededBadge.digest);
    expect(updatedBadge.revpos).to.equal(seededBadge.revpos);
  });
});
