const { expect } = require('chai');
const path = require('path');
const attachmentFromFile = require('./../../src/lib/attachment-from-file');

const BASE_DIR = path.join(__dirname, '../data/attachment-from-file');

describe('attachment-from-file', () => {

  it('files are identified with the right MIME type', () => {
    let attachment = attachmentFromFile(`${BASE_DIR}/icon-people-woman-pregnant@2x.webp`);
    expect(attachment.content_type).to.eq('image/webp');
  });

  it('files with more than one extension are identified with the right MIME type', () => {
    let attachment = attachmentFromFile(`${BASE_DIR}/chloris.66a.mp3`);
    expect(attachment.content_type).to.eq('audio/mpeg');
  });

  it('common file types are identified with the right MIME type', () => {
    // This is a compatibility test, to ensure that
    // the latest changes made to the "attachment-from-file" module
    // are not breaking the way the same files were classified before
    let attachment;
    attachment = attachmentFromFile(`${BASE_DIR}/clinic-edit.xml`);
    expect(attachment.content_type).to.eq('application/xml');
    attachment = attachmentFromFile(`${BASE_DIR}/icon-follow-up.png`);
    expect(attachment.content_type).to.eq('image/png');
    attachment = attachmentFromFile(`${BASE_DIR}/medic-health-center.svg`);
    expect(attachment.content_type).to.eq('image/svg+xml');
    attachment = attachmentFromFile(`${BASE_DIR}/place-types.json`);
    expect(attachment.content_type).to.eq('application/json');
  });

  it('unknown MIME type yields exception', () => {
    expect(() => attachmentFromFile(`${BASE_DIR}/file.unknown`))
      .to.throw(/Unrecognised file extension/);
  });
});
