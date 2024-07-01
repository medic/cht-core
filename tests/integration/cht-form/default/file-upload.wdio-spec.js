const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const path = require('path');

describe('cht-form web component - File upload', () => {
  const imagePath0 = path.join(__dirname, '../../../e2e/default/enketo/images/photo-for-upload-form.png');
  const imagePath1 = path.join(__dirname, '../../../../webapp/src/img/layers.png');

  it('attaches multiple images selected in a repeat', async () => {
    await mockConfig.loadForm('default', 'test', 'file-upload');

    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.addFileInputValue('Upload image', imagePath0, { repeatIndex: 0 });
    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.addFileInputValue('Upload image', imagePath1, { repeatIndex: 1 });

    const [doc] = await mockConfig.submitForm();

    const attachmentNames = Object.keys(doc._attachments);
    expect(attachmentNames).to.have.lengthOf(2);
    expect(attachmentNames[1]).to.match(/^user-file-photo-for-upload-form-\d\d?_\d\d?_\d\d?\.png$/);
    expect(attachmentNames[0]).to.match(/^user-file-layers-\d\d?_\d\d?_\d\d?\.png$/);

    expect(doc.fields.files.images).to.have.lengthOf(2);
    const [{ image: image0 }, { image: image1 }] = doc.fields.files.images;
    expect(image0).to.equal(attachmentNames[1].substring(10));
    expect(image1).to.equal(attachmentNames[0].substring(10));
  });
});
