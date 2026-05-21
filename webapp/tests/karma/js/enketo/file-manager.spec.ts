import { expect } from 'chai';
import sinon from 'sinon';
import enketoConstants from '../../../../src/js/enketo/constants';

const fileManager = require('../../../../src/js/enketo/file-manager.js');
const windowLib = require('../../../../src/js/enketo/lib/window.js');

describe('file-manager', () => {
  afterEach(() => sinon.restore());

  describe('isTooLarge', () => {
    it('evaluates a file that is too large', () => {
      const file = { size: enketoConstants.maxAttachmentSize + 1 };
      expect(fileManager.isTooLarge(file)).to.be.true;
    });

    it('evaluates a file that is not too large', () => {
      const file = { size: enketoConstants.maxAttachmentSize };
      expect(fileManager.isTooLarge(file)).to.be.false;
    });

    it('evaluates a null file', () => {
      expect(fileManager.isTooLarge(null)).to.be.null;
    });
  });

  it('getMaxSizeReadable', () => {
    expect(fileManager.getMaxSizeReadable()).to.equal(enketoConstants.maxAttachmentSizeReadable);
  });

  describe('getCurrentFiles', () => {
    let form;

    const addFileInput = (filename, postfix) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (postfix !== undefined) {
        input.dataset.filenamePostfix = postfix;
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File([ 'content' ], filename, { type: 'image/png' }));
      input.files = dataTransfer.files;
      form.appendChild(input);
      return input;
    };

    beforeEach(() => {
      form = document.createElement('form');
      form.className = 'or';
      document.body.appendChild(form);
    });

    afterEach(() => form.remove());

    it('uniquifies the same file uploaded to two inputs via the timestamp postfix', () => {
      addFileInput('photo.png', '-10_30_01');
      addFileInput('photo.png', '-10_30_02');

      const files = fileManager.getCurrentFiles();

      expect(files.length).to.equal(2);
      expect(files[0].name).to.equal('photo-10_30_01.png');
      expect(files[1].name).to.equal('photo-10_30_02.png');
      expect(files[0].name).to.not.equal(files[1].name);
    });
  });

  describe('getObjectUrl', () => {
    const fakeUrl = 'fake-url';
    let originalCHTCore;
    let createObjectURL;
    let getCurrentHref;
    let dbGet;
    let fakeDbService;

    before(() => originalCHTCore = window.CHTCore);

    beforeEach(() => {
      createObjectURL = sinon.stub(URL, 'createObjectURL');
      getCurrentHref = sinon
        .stub(windowLib, 'getCurrentHref')
        .returns('');
      fakeDbService = { getAttachment: sinon.stub() };
      dbGet = sinon
        .stub()
        .returns(fakeDbService);
      window.CHTCore = { DB: { get: dbGet } };
    });

    after(() => window.CHTCore = originalCHTCore);

    it('resolves an object URL for a given file object', async () => {
      const file = { hello: 'world' };
      createObjectURL.returns(fakeUrl);

      const objectURL = await fileManager.getObjectUrl(file);

      expect(objectURL).to.equal(fakeUrl);
      expect(createObjectURL.calledOnceWithExactly(file)).to.be.true;
      expect(getCurrentHref.notCalled).to.be.true;
      expect(dbGet.notCalled).to.be.true;
    });

    it('resolves an object URL for a given URL string', async () => {
      const url = 'https://example.com';
      createObjectURL.returns(fakeUrl);

      const objectURL = await fileManager.getObjectUrl(url);

      expect(objectURL).to.equal(fakeUrl);
      expect(createObjectURL.calledOnceWithExactly(url)).to.be.true;
      expect(getCurrentHref.notCalled).to.be.true;
      expect(dbGet.notCalled).to.be.true;
    });

    [
      ['report', 'https://example.com/edit/report-id', 'report-id'],
      ['contact', 'https://example.com/contact-id/edit', 'contact-id']
    ].forEach(([type, href, id]) => {
      it(`resolves an object URL for an attachment name when editing a ${type}`, async () => {
        const attachmentName = 'attachment-name.png';
        createObjectURL.returns(fakeUrl);
        getCurrentHref.returns(href);
        const blob = { hello: 'world' };
        fakeDbService.getAttachment.resolves(blob);

        const objectURL = await fileManager.getObjectUrl(attachmentName);

        expect(objectURL).to.equal(fakeUrl);
        expect(createObjectURL.calledOnceWithExactly(blob)).to.be.true;
        expect(getCurrentHref.calledOnceWithExactly()).to.be.true;
        expect(dbGet.calledOnceWithExactly()).to.be.true;
        expect(fakeDbService.getAttachment.calledOnceWithExactly(id, `user-file-${attachmentName}`)).to.be.true;
      });
    });

    it('resolves null when a null subject is provided', async () => {
      getCurrentHref.returns('https://example.com/edit/report-id');

      const objectURL = await fileManager.getObjectUrl(null);

      expect(objectURL).to.be.null;
      expect(createObjectURL.notCalled).to.be.true;
      expect(getCurrentHref.calledOnceWithExactly()).to.be.true;
      expect(dbGet.notCalled).to.be.true;
    });

    it('resolves null for an attachment name when not editing a document', async () => {
      const attachmentName = 'attachment-name.png';
      getCurrentHref.returns('https://example.com/add/pnc');

      const objectURL = await fileManager.getObjectUrl(attachmentName);

      expect(objectURL).to.be.null;
      expect(createObjectURL.notCalled).to.be.true;
      expect(getCurrentHref.calledOnceWithExactly()).to.be.true;
      expect(dbGet.notCalled).to.be.true;
    });

    it(`resolves null for an attachment name when no attachment found in the DB`, async () => {
      const attachmentName = 'attachment-name.png';
      const reportId = 'report-id';
      getCurrentHref.returns(`https://example.com/edit/${reportId}`);
      fakeDbService.getAttachment.rejects({ status: 404 });

      const objectURL = await fileManager.getObjectUrl(attachmentName);

      expect(objectURL).to.be.null;
      expect(createObjectURL.notCalled).to.be.true;
      expect(getCurrentHref.calledOnceWithExactly()).to.be.true;
      expect(dbGet.calledOnceWithExactly()).to.be.true;
      expect(fakeDbService.getAttachment.calledOnceWithExactly(reportId, `user-file-${attachmentName}`)).to.be.true;
    });

    it(`rejects when an error is thrown getting the attachment from the DB`, async () => {
      const attachmentName = 'attachment-name.png';
      const reportId = 'report-id';
      getCurrentHref.returns(`https://example.com/edit/${reportId}`);
      const expectedError = new Error('DB error');
      fakeDbService.getAttachment.rejects(expectedError);

      await expect(fileManager.getObjectUrl(attachmentName)).to.be.rejectedWith(expectedError);

      expect(createObjectURL.notCalled).to.be.true;
      expect(getCurrentHref.calledOnceWithExactly()).to.be.true;
      expect(dbGet.calledOnceWithExactly()).to.be.true;
      expect(fakeDbService.getAttachment.calledOnceWithExactly(reportId, `user-file-${attachmentName}`)).to.be.true;
    });
  });
});
