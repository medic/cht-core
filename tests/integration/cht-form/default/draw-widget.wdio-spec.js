const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const path = require('path');

describe('cht-form web component - Draw Widget', () => {
  it('supports attaching drawn images to report', async () => {
    await mockConfig.loadForm('default', 'test', 'draw-widget');

    await commonEnketoPage.drawShapeOnCanvas('Draw widget');
    await commonEnketoPage.drawShapeOnCanvas('Signature widget');
    const filePath = path.join(__dirname, '/../../../e2e/default/enketo/images/photo-for-upload-form.png');
    await commonEnketoPage.addFileInputValue('Annotate image widget', filePath);
    await commonEnketoPage.drawShapeOnCanvas('Annotate image widget');

    const [doc] = await mockConfig.submitForm();

    const drawName = doc.fields.media_widgets.draw;
    expect(drawName).to.match(/^drawing-\d\d?_\d\d?_\d\d?\.png$/);
    const drawAttachmentName = `user-file-${drawName}`;
    const signatureName = doc.fields.media_widgets.signature;
    expect(signatureName).to.match(/^signature-\d\d?_\d\d?_\d\d?\.png$/);
    const signatureAttachmentName = `user-file-${signatureName}`;
    const annotateName = doc.fields.media_widgets.annotate;
    expect(annotateName).to.match(/^annotation-\d\d?_\d\d?_\d\d?\.png$/);
    const annotateAttachmentName = `user-file-${annotateName}`;
    expect(doc._attachments).to.have.all.keys(drawAttachmentName, signatureAttachmentName, annotateAttachmentName);
    const contentTypes = Object.values(doc._attachments).map(({ content_type }) => content_type);
    expect(contentTypes).to.deep.equal(['image/png', 'image/png', 'image/png']);
    expect(doc._attachments[drawAttachmentName].data.size).to.be.closeTo(19600, 2000);
    expect(doc._attachments[signatureAttachmentName].data.size).to.be.closeTo(12800, 2000);
    expect(doc._attachments[annotateAttachmentName].data.size).to.be.closeTo(29000, 2000);
  });
});
