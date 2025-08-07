const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const rewire = require('rewire');
const { join } = require('path');
const { assert, expect } = require('chai');
const sinon = require('sinon');
const childProcess = require('child_process');
const markdown = require('../../../src/enketo-transformer/markdown');
const db = require('../../../src/db');
const service = require('../../../src/services/generate-xform');
const htmlParser = require('node-html-parser');

const FILES = {
  xform: 'xform.xml',
  givenForm: 'form.html',
  givenModel: 'model.xml',
  expectedForm: 'form.expected.html',
  expectedModel: 'model.expected.xml',
};

const expectAttachments = (doc, form, model) => {
  const formAttachment = doc._attachments['form.html'];
  expect(formAttachment.data.toString()).to.equal(form);
  expect(formAttachment.content_type).to.equal('text/html');
  const modelAttachment = doc._attachments['model.xml'];
  expect(modelAttachment.data.toString()).to.equal(model);
  expect(modelAttachment.content_type).to.equal('text/xml');
};

const fakeGetAttachment = (id, name, opt) => {
  // Fail the test if the code tries to fetch any non-XML attachment
  const formXml = '<my-xml/>';
  const currentForm = '<html/>';
  const currentModel = '<xml/>';
  let attachment=null;
  switch (name){
    case 'xform.xml': attachment=Buffer.from(formXml); break;
    case 'xml': attachment=Buffer.from(formXml); break;
    case 'form.html': attachment=Buffer.from(currentForm); break;
    case 'model.xml': attachment=Buffer.from(currentModel); break;
    default: throw new Error(`Should only fetch xml or form.html attachment: ${name}`);
  }
  return opt.rev && Promise.resolve(attachment);
};

afterEach(() => sinon.restore());

describe('generate-xform service', () => {

  describe('generate', () => {

    let spawned;

    beforeEach(() => {
      // The base for a successful spawned process
      spawned = {
        stdout: { on: sinon.stub() },
        stderr: { on: sinon.stub() },
        stdin: {
          setEncoding: sinon.stub(),
          write: sinon.stub(),
          end: sinon.stub(),
          on: sinon.stub(),
        },
        on: sinon.stub()
      };
    });

    afterEach(sinon.restore);

    const read = (dirname, filename) => {
      return readFile(join(__dirname, 'xforms', dirname, filename), 'utf8');
    };

    const setup = dirname => {
      const promises = Object.values(FILES).map(filename => read(dirname, filename));
      return Promise.all(promises).then(contents => {
        const results = {};
        Object.keys(FILES).forEach((prop, i) => {
          results[prop] = contents[i];
        });
        return results;
      });
    };

    const runTest = (dirname, spawned, stdErr, errIn, errOn, successClose = true) => {
      sinon.stub(childProcess, 'spawn').returns(spawned);
      return setup(dirname).then(files => {
        const generate = service.generate(files.xform);
        if (stdErr) {
          spawned.stderr.on.args[0][1](stdErr);
          spawned.on.args[0][1](100);
        } else if (errIn) {
          spawned.stdin.on.args[0][1](errIn);
          spawned.on.args[0][1](100);
        } else if (errOn) {
          spawned.on.args[1][1](errOn);
        } else if (successClose) {
          // child process outputs then closes with code 0
          spawned.stdout.on.args[0][1](files.givenForm);
          spawned.on.args[0][1](0);
          spawned.stdout.on.args[1][1](files.givenModel);
          spawned.on.args[2][1](0);
        }
        return generate.then(actual => {
          expect(actual.form).to.equal(files.expectedForm.trim());
          expect(actual.model).to.equal(files.expectedModel);
        });
      });
    };

    it('should generate form and model', () => runTest('simple', spawned));

    it('should replace multimedia src elements', () => runTest('multimedia', spawned));

    it('should correctly replace models with nested "</root>" - #5971', () => runTest('nested-root', spawned));

    it('should replace markdown syntax', () => runTest('markdown', spawned));

    it('should set custom CHT attributes', () => runTest('custom-attributes', spawned));

    it('should fail when child process errors', async () => {
      try {
        await runTest('simple', spawned, 'some error');
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Error transforming xml. xsltproc returned code "100", and signal "undefined". ' +
          'xsltproc stderr output:\nsome error'
        );
      }
    });

    it('should fail when xsltproc command not found in Node v8 and v16+', async () => {
      try {
        const errOn = new Error('Error: ENOENT');
        errOn.code = 'ENOENT';
        errOn.syscall = 'spawn xsltproc';
        const spawnedEpipe = {
          stdout: { on: sinon.stub() },
          stderr: { on: sinon.stub() },
          stdin: {
            setEncoding: sinon.stub(),
            write: sinon.stub(),
            end: sinon.stub(),
            on: sinon.stub()
          },
          on: sinon.stub()
        };
        await runTest('simple', spawnedEpipe, null, null, errOn, false);
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Unable to continue execution, check that \'xsltproc\' command is available.'
        );
      }
    });

    it('should fail when xsltproc command not found in Node v10', async () => {
      try {
        const writeErr = new Error('Error: write EPIPE');
        writeErr.code = 'EPIPE';
        const spawnedErr = {
          stdout: { on: sinon.stub() },
          stderr: { on: sinon.stub() },
          stdin: {
            setEncoding: sinon.stub(),
            write: sinon.stub().throws(writeErr),
            end: sinon.stub(),
            on: sinon.stub(),
          },
          on: sinon.stub()
        };
        await runTest('simple', spawnedErr, null, null, null, false);
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Unable to continue execution, check that \'xsltproc\' command is available.'
        );
      }
    });

    it('should fail when xsltproc command not found in Node v12', async () => {
      try {
        const writeErr = new Error('Error: write EPIPE');
        writeErr.code = 'EPIPE';
        const spawnedEpipe = {
          stdout: { on: sinon.stub() },
          stderr: { on: sinon.stub() },
          stdin: {
            setEncoding: sinon.stub(),
            write: sinon.stub().throws(writeErr),
            end: sinon.stub(),
            on: sinon.stub(),
          },
          on: sinon.stub()
        };
        await runTest('simple', spawnedEpipe, null, null, null, false);
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Unable to continue execution, check that \'xsltproc\' command is available.'
        );
      }
    });

    it('should fail when xsltproc command not found in Node v14', async () => {
      try {
        const errOn = new Error('Error: some EPIPE');
        errOn.code = 'EPIPE';
        const spawnedEpipe = {
          stdout: { on: sinon.stub() },
          stderr: { on: sinon.stub() },
          stdin: {
            setEncoding: sinon.stub(),
            write: sinon.stub(),
            end: sinon.stub(),
            on: sinon.stub()
          },
          on: sinon.stub()
        };
        await runTest('simple', spawnedEpipe, null, null, errOn, false);
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Unable to continue execution, check that \'xsltproc\' command is available.'
        );
      }
    });

    it('should fail when xsltproc raises unknown write error', async () => {
      try {
        const writeErr = new Error('Error: unknown');
        const spawnedEpipe = {
          stdout: { on: sinon.stub() },
          stderr: { on: sinon.stub() },
          stdin: {
            setEncoding: sinon.stub(),
            write: sinon.stub(),
            end: sinon.stub(),
            on: sinon.stub()
          },
          on: sinon.stub()
        };
        await runTest('simple', spawnedEpipe, null, writeErr, null, false);
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Unknown Error: An error occurred when executing \'xsltproc\' command'
        );
      }
    });

    it('should fail when xsltproc raises unknown exception', async () => {
      try {
        const spawnedUnknownWriteErr = {
          stdout: { on: sinon.stub() },
          stderr: { on: sinon.stub() },
          stdin: {
            setEncoding: sinon.stub(),
            write: sinon.stub().throws('mystery error'),
            end: sinon.stub(),
            on: sinon.stub(),
          },
          on: sinon.stub()
        };
        await runTest('simple', spawnedUnknownWriteErr, null, null, null, false);
        assert.fail('expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal(
          'Unknown Error: An error occurred when executing \'xsltproc\' command'
        );
      }
    });

  });

  describe('update', () => {

    it('should fail when no form found', done => {
      sinon.stub(db.medic, 'get').rejects('boom');
      service.update('form:missing')
        .then(() => done(new Error('expected error to be thrown')))
        .catch(err => {
          expect(err.name).to.equal('boom');
          expect(db.medic.get.callCount).to.equal(1);
          expect(db.medic.get.args[0][0]).to.equal('form:missing');
          done();
        });
    });

    it('should do nothing when doc does not have form attachment', () => {
      sinon.stub(db.medic, 'get').resolves({ _attachments: { image: {} } });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.get.callCount).to.equal(1);
        expect(db.medic.put.callCount).to.equal(0);
      });
    });

    it('should do nothing when the attachments are up to date', () => {
      const formXml = '<my-xml/>';
      const currentForm = '<html/>';
      const currentModel = '<xml/>';
      sinon.stub(db.medic, 'get').resolves({
        _attachments: {
          'xform.xml': { stub: true },
          'form.html': { stub: true },
          'model.xml': { stub: true },
        },
        _rev: '1-rev'
      });
      // sinon.stub(db.medic, 'getAttachment').resolves(Buffer.from(formXml));
      sinon.stub(db.medic, 'getAttachment').callsFake(fakeGetAttachment);
      sinon.stub(service, 'generate').resolves({ form: currentForm, model: currentModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(service.generate.callCount).to.equal(1);
        expect(service.generate.args[0][0]).to.equal(formXml);
        expect(db.medic.put.callCount).to.equal(0);
      });
    });

    it('should update doc when attachments do not exist', () => {
      const formXml = '<my-xml/>';
      const newForm = '<html><title>Hello</title></html>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        xml: { data: Buffer.from(formXml) }
      } });
      sinon.stub(db.medic, 'getAttachment').resolves(Buffer.from(formXml));
      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
    });

    it('should update doc when attachments have changed', () => {
      const formXml = '<my-xml/>';
      const newForm = '<html><title>Hello</title></html>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        'xform.xml': { stub: true },
        'form.html': { stub: true },
        'model.xml': { stub: true }
      } });

      sinon.stub(db.medic, 'getAttachment').resolves(Buffer.from(formXml));

      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
    });

    it('should not update doc if attachment is not xml/html', async () => {
      const newForm = '<html><title>Hello</title></html>';
      const newModel = '<instance><multimedia/></instance>';
      
      sinon.stub(db.medic, 'getAttachment').resolves({ _attachments: {}});

      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        'xform.xml': {stub: true},
        'form.html': { stub: true },
        'model.xml': { stub: true }
      } });
      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');

      await service.update('form:exists');
      expect(db.medic.put.callCount).to.equal(1);
      expectAttachments(db.medic.put.args[0][0], newForm, newModel);
    });

    it('updates only form.html and model.xml; preserves audio/image/videos attachments unchanged', async () => {
      const crypto = require('crypto');
      const computeDigest = data => {
        return 'md5-' + crypto.createHash('md5').update(data).digest('base64');
      };

      const docId = 'form:test';
      const originalFormXml = '<form>original xml</form>';
      const originalFormHtml = '<html>old html</html>';
      const originalModelXml = '<model>old model</model>';
      const newFormHtml = '<html>new html</html>';
      const newModelXml = '<model>new model</model>';
      const audioContent = 'audio content';
      const imageContent = 'image content';

      const audioBuffer = Buffer.from(audioContent);
      const imageBuffer = Buffer.from(imageContent);
      const originalFormXmlBuffer = Buffer.from(originalFormXml);
      const originalFormHtmlBuffer = Buffer.from(originalFormHtml);
      const originalModelXmlBuffer = Buffer.from(originalModelXml);

      const originalDoc = {
        _id: docId,
        _rev: '1-rev',
        _attachments: {
          'xml': {
            content_type: 'application/xml',
            digest: computeDigest(originalFormXmlBuffer),
            length: originalFormXmlBuffer.length,
            stub: true
          },
          'form.html': {
            content_type: 'text/html',
            digest: computeDigest(originalFormHtmlBuffer),
            length: originalFormHtmlBuffer.length,
            stub: true
          },
          'model.xml': {
            content_type: 'text/xml',
            digest: computeDigest(originalModelXmlBuffer),
            length: originalModelXmlBuffer.length,
            stub: true
          },
          'audio.mp3': {
            content_type: 'audio/mp3',
            digest: computeDigest(audioBuffer),
            length: audioBuffer.length,
            stub: true
          },
          'image.jpg': {
            content_type: 'image/jpeg',
            digest: computeDigest(imageBuffer),
            length: imageBuffer.length,
            stub: true
          }
        },
        context: {
          person: false,
          place: false
        }
      };

      sinon.stub(db.medic, 'get').withArgs(docId).resolves(originalDoc);
      sinon.stub(db.medic, 'getAttachment').callsFake(fakeGetAttachment);
      sinon.stub(db.medic, 'put').resolves({ ok: true });
      sinon.stub(service, 'generate').resolves({
        form: newFormHtml,
        model: newModelXml
      });

      await service.update(docId);

      expect(db.medic.get.calledOnce).to.be.true;
      expect(db.medic.getAttachment.callCount).to.equal(3);
      expect(db.medic.getAttachment.calledWith(docId, 'xml', { rev: '1-rev' })).to.be.true;
      expect(service.generate.calledOnce).to.be.true;
      expect(db.medic.put.calledOnce).to.be.true;

      const updatedDoc = db.medic.put.args[0][0];

      // Check updated attachments have data
      expect(updatedDoc._attachments['form.html'].data.toString()).to.equal(newFormHtml);
      expect(updatedDoc._attachments['form.html'].content_type).to.equal('text/html');
      expect('stub' in updatedDoc._attachments['form.html']).to.be.false;
      expect('data' in updatedDoc._attachments['form.html']).to.be.true;

      expect(updatedDoc._attachments['model.xml'].data.toString()).to.equal(newModelXml);
      expect(updatedDoc._attachments['model.xml'].content_type).to.equal('text/xml');
      expect('stub' in updatedDoc._attachments['model.xml']).to.be.false;
      expect('data' in updatedDoc._attachments['model.xml']).to.be.true;

      // Check preserved attachments remain as stubs and unchanged
      expect(updatedDoc._attachments['audio.mp3']).to.deep.equal(originalDoc._attachments['audio.mp3']);
      expect(updatedDoc._attachments['audio.mp3'].stub).to.be.true;
      expect('data' in updatedDoc._attachments['audio.mp3']).to.be.false;

      expect(updatedDoc._attachments['image.jpg']).to.deep.equal(originalDoc._attachments['image.jpg']);
      expect(updatedDoc._attachments['image.jpg'].stub).to.be.true;
      expect('data' in updatedDoc._attachments['image.jpg']).to.be.false;

      // Check xml attachment remains as stub and unchanged
      expect(updatedDoc._attachments['xml']).to.deep.equal(originalDoc._attachments['xml']);
      expect(updatedDoc._attachments['xml'].stub).to.be.true;
      expect('data' in updatedDoc._attachments['xml']).to.be.false;
    });

  });


  
  describe('updateAll', () => {

    const JSON_FORM_ROW = {
      doc: {
        _id: 'a',
        _attachments: { lmx: {} }
      }
    };
    const COLLECT_FORM_ROW = {
      doc: {
        _id: 'b',
        _attachments: { xml: {} },
        context: { collect: true },
        type: 'form',
      }
    };

    it('should handle no forms', () => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      sinon.stub(db, 'saveDocs');
      return service.updateAll().then(() => {
        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.saveDocs.callCount).to.equal(0);
      });
    });

    it('should ignore json forms', () => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [ JSON_FORM_ROW ] });
      sinon.stub(db, 'saveDocs');
      return service.updateAll().then(() => {
        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.saveDocs.callCount).to.equal(0);
      });
    });

    it('should ignore collect forms', () => {
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [ COLLECT_FORM_ROW ] });
      sinon.stub(db, 'saveDocs');
      return service.updateAll().then(() => {
        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.saveDocs.callCount).to.equal(0);
      });
    });

    it('should do nothing when no forms have changed', async() => {
      const currentForm = '<html/>';
      const currentModel = '<xml/>';
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [ {
        doc: {
          type: 'form',
          _rev: '1-rev',
          _attachments: {
            'xform.xml': { stub: true },
            'form.html': { stub: true },
            'model.xml': { stub: true }
          }
        }
      } ] });
      sinon.stub(db.medic, 'getAttachment').callsFake(fakeGetAttachment);
      sinon.stub(service, 'generate').resolves({ form: currentForm, model: currentModel });
      sinon.stub(db, 'saveDocs').resolves([]);
      await service.updateAll();
      expect(db.medic.allDocs.callCount).to.equal(1);
      expect(db.saveDocs.callCount).to.equal(0);
    });

    it('should throw when not all updated successfully', () => {
      const formXml = '<my-xml/>';
      const newForm = '<html><title>Hello</title></html>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        {
          doc: {
            _id: 'd',
            type: 'form',
            _attachments: {
              'xform.xml': { stub: true },
              'form.html': { stub: true },
              'model.xml': { stub: true }
            }
          }
        }
      ] });
      sinon.stub(db.medic, 'getAttachment').resolves(Buffer.from(formXml));
      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db, 'saveDocs').resolves([ { error: 'some error' } ]);
      return service
        .updateAll()
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Failed to save updated xforms to the database');
        });
    });

    it('should save all updated forms', () => {
      const currentForm = '<html/>';
      const newForm = '<html><title>Hello</title></html>';
      const currentModel = '<xml/>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        JSON_FORM_ROW,
        COLLECT_FORM_ROW,
        {
          doc: {
            _id: 'c',
            _rev: '1-rev2',
            type: 'form',
            _attachments: {
              'xform.xml': { stub: true },
              'form.html': { stub: true },
              'model.xml': { stub: true }
            }
          }
        },
        {
          doc: {
            _id: 'd',
            _rev: '1-rev3',
            type: 'form',
            _attachments: {
              'xform.xml': { stub: true },
              'form.html': { stub: true },
              'model.xml': { stub: true }
            }
          }
        }
      ] });
      sinon.stub(db.medic, 'getAttachment').callsFake(fakeGetAttachment);
      sinon.stub(service, 'generate')
        .onCall(0).resolves({ form: currentForm, model: currentModel })
        .onCall(1).resolves({ form: newForm, model: newModel });
      sinon.stub(db, 'saveDocs').resolves([ { ok: true } ]);
      return service.updateAll().then(() => {
        expect(db.medic.allDocs.callCount).to.equal(1);
        expect(db.saveDocs.callCount).to.equal(1);
        expect(db.saveDocs.args[0][0]).to.equal(db.medic);
        expect(db.saveDocs.args[0][1].length).to.equal(1);
        expect(db.saveDocs.args[0][1][0]._id).to.equal('d');
        expectAttachments(db.saveDocs.args[0][1][0], newForm, newModel);
      });
    });

  });

  describe('replaceAllMarkdown', () => {
    let replaceAllMarkdown;

    const wrapInQuestionLabel = (contents) => `
      <form>
        <span class="question-label">${contents}</span>
      </form>`.trim();

    beforeEach(() => {
      const generate = rewire('../../../src/services/generate-xform');
      replaceAllMarkdown = (formString) => {
        const formElement = htmlParser.parse(formString).querySelector('form');
        return generate.__get__('replaceAllMarkdown')(formElement);
      };
    });

    it('strips root node', () => {
      const actual = replaceAllMarkdown('<root><form></form></root>');
      expect(actual).to.equal('<form></form>');
    });

    it('replaces questions', () => {
      sinon.stub(markdown, 'toHtml').returns('def');
      const given = `
<root>
  <form>
    <span class="question-label">abc</span>
  </form>
</root>`;
      const expected = `
  <form>
    <span class="question-label">def</span>
  </form>`;
      expect(replaceAllMarkdown(given)).to.equal(expected.trim());
      expect(markdown.toHtml.callCount).to.equal(1);
      expect(markdown.toHtml.args[0][0]).to.equal('abc');
    });

    it('replaces hints', () => {
      sinon.stub(markdown, 'toHtml').returns('def');
      const given = `
<root>
  <form>
    <span class="or-hint">abc</span>
  </form>
</root>`;
      const expected = `
  <form>
    <span class="or-hint">def</span>
  </form>`;
      expect(replaceAllMarkdown(given)).to.equal(expected.trim());
      expect(markdown.toHtml.callCount).to.equal(1);
      expect(markdown.toHtml.args[0][0]).to.equal('abc');
    });

    it('replaces all questions and hints', () => {
      sinon.stub(markdown, 'toHtml')
        .withArgs('1').returns('a')
        .withArgs('2').returns('b')
        .withArgs('3').returns('c');
      const given = `
<root>
  <form>
    <span class="question-label">1</span>
    <span class="or-hint">2</span>
    <span class="question-label">3</span>
  </form>
</root>`;
      const expected = `
  <form>
    <span class="question-label">a</span>
    <span class="or-hint">b</span>
    <span class="question-label">c</span>
  </form>`;
      expect(replaceAllMarkdown(given)).to.equal(expected.trim());
      expect(markdown.toHtml.callCount).to.equal(3);
      expect(markdown.toHtml.args).to.deep.equal([['1'], ['3'], ['2']]);
    });

    it('does not convert content outside of questions and hints', () => {
      sinon.spy(markdown, 'toHtml');
      const given = `
  <form>
    <span class="question-label">not markdown##</span>
    <span class="question-label">##markdown</span>
    <span class="or-hint">not markdown_</span>
    <span class="or-hint">_markdown_</span>
    <div>
        ##Content with markdown formatting
        _but does not get converted_
    </div>
  </form>`;
      const expected = `
  <form>
    <span class="question-label">not markdown##</span>
    <span class="question-label"><h2>markdown</h2></span>
    <span class="or-hint">not markdown_</span>
    <span class="or-hint"><em>markdown</em></span>
    <div>
        ##Content with markdown formatting
        _but does not get converted_
    </div>
  </form>`;

      expect(replaceAllMarkdown(given)).to.equal(expected.trim());
      expect(markdown.toHtml.callCount).to.equal(4);
      expect(markdown.toHtml.args)
        .to.deep.equal([['not markdown##'], ['##markdown'], ['not markdown_'], ['_markdown_']]);
    });

    it('h1', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('\n# HELLO\n')))
        .to.equal(wrapInQuestionLabel('<h1>HELLO</h1>'));
    });

    it('h2', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('\n## HELLO\n')))
        .to.equal(wrapInQuestionLabel('<h2>HELLO</h2>'));
    });

    it('h3', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('\n### HELLO\n')))
        .to.equal(wrapInQuestionLabel('<h3>HELLO</h3>'));
    });

    it('h4', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('\n#### HELLO\n')))
        .to.equal(wrapInQuestionLabel('<h4>HELLO</h4>'));
    });

    it('h5', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('\n##### HELLO\n')))
        .to.equal(wrapInQuestionLabel('<h5>HELLO</h5>'));
    });

    it('strong with underscore', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('__HELLO__')))
        .to.equal(wrapInQuestionLabel('<strong>HELLO</strong>'));
    });

    it('strong with asterisk', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('**HELLO**')))
        .to.equal(wrapInQuestionLabel('<strong>HELLO</strong>'));
    });

    it('em with underscore', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel(' _HELLO_')))
        .to.equal(wrapInQuestionLabel(' <em>HELLO</em>'));
    });

    it('em with asterisk', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('*HELLO*')))
        .to.equal(wrapInQuestionLabel('<em>HELLO</em>'));
    });

    it('a', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('click [here](http://google.com) to search')))
        .to.equal(wrapInQuestionLabel('click <a href="http://google.com" rel="noopener" target="_blank">here</a> to search'));
    });

    it('br', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('hello\ncheck for new\nlines')))
        .to.equal(wrapInQuestionLabel('hello<br>check for new<br>lines'));
    });

    it('converts a computed URL - #3349', () => {
      const given = wrapInQuestionLabel('[Search for<span class="or-output" data-value=" /notedata/name "> </span>](http://google.com?q=<span class="or-output" data-value=" /notedata/name "> </span>)');
      const expected = wrapInQuestionLabel('<a href="#" target="_blank" rel="noopener" class="dynamic-url">Search for<span class="or-output" data-value=" /notedata/name "> </span><span class="url hidden">http://google.com?q=<span class="or-output" data-value=" /notedata/name "> </span></span></a>');
      expect(replaceAllMarkdown(given)).to.equal(expected);
    });

    it('converts html tags', () => {
      const given = wrapInQuestionLabel('hello&lt;blink&gt;<output value="name"/>&lt;/blink&gt;');
      const expected = wrapInQuestionLabel('hello<blink><output value="name"></output></blink>');
      expect(replaceAllMarkdown(given)).to.equal(expected.trim());
    });

    it('converts ampersand', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('mock &amp; test')))
        .to.equal(wrapInQuestionLabel('mock & test'));
    });

    it('converts double quote', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('mock &quot;test&quot;')))
        .to.equal(wrapInQuestionLabel('mock "test"'));
    });

    it('converts single quote', () => {
      expect(replaceAllMarkdown(wrapInQuestionLabel('someone&#039;s test')))
        .to.equal(wrapInQuestionLabel('someone\'s test'));
    });
  });
});
