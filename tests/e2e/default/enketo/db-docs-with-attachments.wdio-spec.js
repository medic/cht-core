const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const path = require('path');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('db-docs with attachments', () => {
  // Manually entering binary data to simulate input from external source like 3rd-party android app.
  const BINARY_IMAGE_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADve' +
    'WkH6oAAAAAElFTkSuQmCC';
  const FORM_ID = 'db-docs-with-attachments';
  const photoPath0 = path.join(__dirname, '/images/photo-for-upload-form.png');
  const photoPath1 = path.join(__dirname, '/images/photo-for-upload-form1.png');
  const photoPath2 = path.join(__dirname, '/images/photo-for-upload-form2.png');
  let reportId;

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/${FORM_ID}`));
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('writes report with attachments at various levels including in db-docs', async () => {
    await commonPage.openFastActionReport(FORM_ID, false);

    await commonEnketoPage.setInputValue('Report Text', 'report');
    await commonEnketoPage.addFileInputValue('Report Photo', photoPath0);
    await (await enketoWidgetsPage.imagePreview('Report Photo')).waitForDisplayed();
    await commonEnketoPage.setInputValue('Report Badge', BINARY_IMAGE_DATA);

    await commonEnketoPage.addRepeatSection('Repeated Attachments');
    await commonEnketoPage.setInputValue('Repeated Text', 'repeated0');
    await commonEnketoPage.addFileInputValue('Repeated Photo', photoPath1);
    await (await enketoWidgetsPage.imagePreview('Repeated Photo')).waitForDisplayed();
    await commonEnketoPage.setInputValue('Repeated Badge', BINARY_IMAGE_DATA);

    await commonEnketoPage.addRepeatSection('Repeated Attachments');
    await commonEnketoPage.setInputValue('Repeated Text', 'repeated1', { repeatIndex: 1 });
    await commonEnketoPage.addFileInputValue('Repeated Photo', photoPath2, { repeatIndex: 1 });
    await (await enketoWidgetsPage.imagePreview('Repeated Photo', { repeatIndex: 1 })).waitForDisplayed();
    await commonEnketoPage.setInputValue('Repeated Badge', BINARY_IMAGE_DATA, { repeatIndex: 1 });

    await commonEnketoPage.setInputValue('Child Text', 'child');
    await commonEnketoPage.addFileInputValue('Child Photo', photoPath0);
    await (await enketoWidgetsPage.imagePreview('Child Photo')).waitForDisplayed();
    await commonEnketoPage.setInputValue('Child Badge', BINARY_IMAGE_DATA);

    await commonEnketoPage.setInputValue('Grandchild Text', 'grandchild');
    await commonEnketoPage.addFileInputValue('Grandchild Photo', photoPath0);
    await (await enketoWidgetsPage.imagePreview('Grandchild Photo')).waitForDisplayed();
    await commonEnketoPage.setInputValue('Grandchild Badge', BINARY_IMAGE_DATA);

    await commonEnketoPage.addRepeatSection('Repeated db-doc');
    await commonEnketoPage.setInputValue('Repeated db-doc Text', 'repeated db-doc0');
    await commonEnketoPage.addFileInputValue('Repeated db-doc Photo', photoPath0);
    await (await enketoWidgetsPage.imagePreview('Repeated db-doc Photo')).waitForDisplayed();
    await commonEnketoPage.setInputValue('Repeated db-doc Badge', BINARY_IMAGE_DATA);

    await commonEnketoPage.addRepeatSection('Repeated db-doc');
    await commonEnketoPage.setInputValue('Repeated db-doc Text', 'repeated db-doc1', { repeatIndex: 1 });
    await commonEnketoPage.addFileInputValue('Repeated db-doc Photo', photoPath0, { repeatIndex: 1 });
    await (await enketoWidgetsPage.imagePreview('Repeated db-doc Photo', { repeatIndex: 1 })).waitForDisplayed();
    await commonEnketoPage.setInputValue('Repeated db-doc Badge', BINARY_IMAGE_DATA, { repeatIndex: 1 });

    await genericForm.submitForm();

    reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);
    expect(report.fields).to.deep.include({ text: 'report', badge: '' });
    expect(report.fields.photo).to.match(/^photo-for-upload-form-/);
    expect(report.fields.repeated_attachments).to.have.length(2);
    expect(report.fields.repeated_attachments[0]).to.deep.include({ text: 'repeated0', badge: '' });
    expect(report.fields.repeated_attachments[0].photo).to.match(/^photo-for-upload-form1-/);
    expect(report.fields.repeated_attachments[1]).to.deep.include({ text: 'repeated1', badge: '' });
    expect(report.fields.repeated_attachments[1].photo).to.match(/^photo-for-upload-form2-/);
    expect(Object.keys(report._attachments)).to.deep.equal([
      `user-file-${report.fields.photo}`,
      `user-file-${report.fields.repeated_attachments[0].photo}`,
      `user-file-${report.fields.repeated_attachments[1].photo}`,
      'user-file/fields/badge',
      'user-file/fields/repeated_attachments[1]/badge',
      'user-file/fields/repeated_attachments[2]/badge',
    ]);

    const {
      child_doc_id,
      child_doc: { grandchild_doc_id },
      repeat: [rep0, rep1, ...additional]
    } = report.fields;
    expect(additional).to.be.empty;
    const [childDoc, grandchildDoc, repeatDoc0, repeatDoc1] = await utils.getDocs([
      child_doc_id,
      grandchild_doc_id,
      rep0.repeated_doc_id,
      rep1.repeated_doc_id
    ]);

    expect(childDoc.fields).to.deep.include({ text: 'child', badge: '' });
    expect(childDoc.fields.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(childDoc._attachments)).to.deep.equal([
      `user-file-${childDoc.fields.photo}`,
      'user-file/fields/badge'
    ]);

    expect(grandchildDoc.fields).to.deep.include({ text: 'grandchild', badge: '' });
    expect(grandchildDoc.fields.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(grandchildDoc._attachments)).to.deep.equal([
      `user-file-${grandchildDoc.fields.photo}`,
      'user-file/fields/badge'
    ]);

    expect(repeatDoc0.fields).to.deep.include({ text: 'repeated db-doc0', badge: '' });
    expect(repeatDoc0.fields.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(repeatDoc0._attachments)).to.deep.equal([
      `user-file-${repeatDoc0.fields.photo}`,
      'user-file/fields/badge'
    ]);

    expect(repeatDoc1.fields).to.deep.include({ text: 'repeated db-doc1', badge: '' });
    expect(repeatDoc1.fields.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(repeatDoc1._attachments)).to.deep.equal([
      `user-file-${repeatDoc1.fields.photo}`,
      'user-file/fields/badge'
    ]);

    await reportsPage.rightPanelSelectors
      .reportImage('report.db-docs-with-attachments.photo')
      .waitForDisplayed();
    await reportsPage.rightPanelSelectors
      .reportImage('report.db-docs-with-attachments.repeated_attachments.0.photo')
      .waitForDisplayed();
    await reportsPage.rightPanelSelectors
      .reportImage('report.db-docs-with-attachments.repeated_attachments.0.badge')
      .waitForDisplayed();
    await reportsPage.rightPanelSelectors
      .reportImage('report.db-docs-with-attachments.repeated_attachments.1.photo')
      .waitForDisplayed();
    await reportsPage.rightPanelSelectors
      .reportImage('report.db-docs-with-attachments.repeated_attachments.1.badge')
      .waitForDisplayed();

    await reportsPage.goToReportById(childDoc._id);
    await reportsPage.rightPanelSelectors.reportImage('report.child_doc.photo').waitForDisplayed();
    await reportsPage.rightPanelSelectors.reportImage('report.child_doc.badge').waitForDisplayed();

    await reportsPage.goToReportById(grandchildDoc._id);
    await reportsPage.rightPanelSelectors.reportImage('report.grandchild_doc.photo').waitForDisplayed();
    await reportsPage.rightPanelSelectors.reportImage('report.grandchild_doc.badge').waitForDisplayed();

    await reportsPage.goToReportById(repeatDoc0._id);
    await reportsPage.rightPanelSelectors.reportImage('report.repeated_doc.photo').waitForDisplayed();
    await reportsPage.rightPanelSelectors.reportImage('report.repeated_doc.badge').waitForDisplayed();

    await reportsPage.goToReportById(repeatDoc1._id);
    await reportsPage.rightPanelSelectors.reportImage('report.repeated_doc.photo').waitForDisplayed();
    await reportsPage.rightPanelSelectors.reportImage('report.repeated_doc.badge').waitForDisplayed();
  });

  it('updates attachments on the report and the db-docs when editing the report', async () => {
    const originalReport = await utils.getDoc(reportId);
    const [originalGrandchildDoc, originalRepeatDoc0, originalRepeatDoc1] = await utils.getDocs([
      originalReport.fields.child_doc.grandchild_doc_id,
      originalReport.fields.repeat[0].repeated_doc_id,
      originalReport.fields.repeat[1].repeated_doc_id
    ]);

    await reportsPage.goToReportById(reportId);
    await reportsPage.rightPanelSelectors.reportBodyDetails().waitForDisplayed();
    await commonPage.waitForPageLoaded();
    await commonPage.accessEditOption();
    await genericForm.formTitle().waitForDisplayed();

    // Update the report itself, replacing the photo, but leave the repeated attachments untouched
    await commonEnketoPage.setInputValue('Report Text', 'report edited');
    await commonEnketoPage.addFileInputValue('Report Photo', photoPath1);

    // Update the child db-doc, including a new photo and badge
    await commonEnketoPage.setInputValue('Child Text', 'child edited');
    await commonEnketoPage.addFileInputValue('Child Photo', photoPath2);
    await commonEnketoPage.setInputValue('Child Badge', BINARY_IMAGE_DATA);

    // Leave the grandchild db-doc completely untouched

    // Update the text of the first repeated db-doc, but do not give it a new photo
    await commonEnketoPage.setInputValue('Repeated db-doc Text', 'repeated db-doc0 edited');

    // Give the second repeated db-doc a new photo, but leave its other values untouched
    await commonEnketoPage.addFileInputValue('Repeated db-doc Photo', photoPath0, { repeatIndex: 1 });

    await genericForm.submitForm();

    const report = await utils.getDoc(reportId);
    expect(report.fields).to.deep.include({ text: 'report edited', badge: '' });
    expect(report.fields.photo).to.match(/^photo-for-upload-form1-/);
    expect(report.fields.repeated_attachments).to.deep.equal(originalReport.fields.repeated_attachments);
    // The new photo is attached, while the binary badge attachments and the files for the untouched repeated
    // attachments are all left as they were.
    expect(Object.keys(report._attachments)).to.have.members([
      `user-file-${report.fields.photo}`,
      `user-file-${report.fields.repeated_attachments[0].photo}`,
      `user-file-${report.fields.repeated_attachments[1].photo}`,
      'user-file/fields/badge',
      'user-file/fields/repeated_attachments[1]/badge',
      'user-file/fields/repeated_attachments[2]/badge',
    ]);
    // The attachment for the replaced photo is no longer referenced by the report, so it is removed
    expect(report._attachments).to.not.have.property(`user-file-${originalReport.fields.photo}`);

    const {
      child_doc_id,
      child_doc: { grandchild_doc_id },
      repeat: [rep0, rep1, ...additional]
    } = report.fields;
    expect(additional).to.be.empty;
    const [childDoc, grandchildDoc, repeatDoc0, repeatDoc1] = await utils.getDocs([
      child_doc_id,
      grandchild_doc_id,
      rep0.repeated_doc_id,
      rep1.repeated_doc_id
    ]);

    // Editing the report writes new db-docs instead of updating the original ones
    const originalDbDocIds = [
      originalReport.fields.child_doc_id,
      originalReport.fields.child_doc.grandchild_doc_id,
      originalReport.fields.repeat[0].repeated_doc_id,
      originalReport.fields.repeat[1].repeated_doc_id
    ];
    [childDoc, grandchildDoc, repeatDoc0, repeatDoc1]
      .forEach(({ _id }) => expect(originalDbDocIds).to.not.include(_id));

    // The new values are written to the child db-doc along with the new files
    expect(childDoc.fields).to.deep.include({ text: 'child edited', badge: '' });
    expect(childDoc.fields.photo).to.match(/^photo-for-upload-form2-/);
    expect(Object.keys(childDoc._attachments)).to.have.members([
      `user-file-${childDoc.fields.photo}`,
      'user-file/fields/badge'
    ]);

    // The grandchild db-doc keeps the original values, but no new files were given, so it has no attachments
    expect(grandchildDoc.fields).to.deep.equal(originalGrandchildDoc.fields);
    expect(grandchildDoc._attachments).to.be.undefined;

    // The first repeated db-doc has the new text, but no new files, so it has no attachments
    expect(repeatDoc0.fields).to.deep.include({ text: 'repeated db-doc0 edited', badge: '' });
    expect(repeatDoc0.fields.photo).to.equal(originalRepeatDoc0.fields.photo);
    expect(repeatDoc0._attachments).to.be.undefined;

    // The second repeated db-doc keeps the original text, but the new photo is attached
    expect(repeatDoc1.fields).to.deep.include({ text: 'repeated db-doc1', badge: '' });
    expect(repeatDoc1.fields.photo).to.match(/^photo-for-upload-form-/);
    expect(repeatDoc1.fields.photo).to.not.equal(originalRepeatDoc1.fields.photo);
    expect(Object.keys(repeatDoc1._attachments)).to.deep.equal([`user-file-${repeatDoc1.fields.photo}`]);
  });
});
