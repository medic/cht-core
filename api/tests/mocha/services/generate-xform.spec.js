const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const { join } = require('path');
const { assert, expect } = require('chai');
const sinon = require('sinon');
const childProcess = require('child_process');
const db = require('../../../src/db');
const service = require('../../../src/services/generate-xform');

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
          expect(actual.form).to.equal(files.expectedForm);
          expect(actual.model).to.equal(files.expectedModel);
        });
      });
    };

    it('should generate form and model', () => runTest('simple', spawned));

    it('should replace multimedia src elements', () => runTest('multimedia', spawned));

    it('should correctly replaces models with nested "</root>" - #5971', () => runTest('nested-root', spawned));

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
        const errOn = new Error('Error: unknown');
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
          'Unable to continue execution, check that \'xsltproc\' command is available.');
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
          'Unable to continue execution, check that \'xsltproc\' command is available.');
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
          'Unable to continue execution, check that \'xsltproc\' command is available.');
      }
    });

    it('should fail when xsltproc command not found in Node v14', async () => {
      try {
        const errOn = new Error('Error: unknown');
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
          'Unable to continue execution, check that \'xsltproc\' command is available.');
      }
    });

    it('should fail when xsltproc raises write error', async () => {
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
          'Unknown Error: An error occurred when executing \'xsltproc\' command');
      }
    });

    it('should fail when xsltproc raises stdin write exception', async () => {
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
          'Unknown Error: An error occurred when executing \'xsltproc\' command');
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
      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        'xform.xml': { data: Buffer.from(formXml) },
        'form.html': { data: Buffer.from(currentForm) },
        'model.xml': { data: Buffer.from(currentModel) }
      } });
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
      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
    });

    it('should update doc when attachments have changed', () => {
      const formXml = '<my-xml/>';
      const currentForm = '<html/>';
      const newForm = '<html><title>Hello</title></html>';
      const currentModel = '<xml/>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        'xform.xml': { data: Buffer.from(formXml) },
        'form.html': { data: Buffer.from(currentForm) },
        'model.xml': { data: Buffer.from(currentModel) }
      } });
      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
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
        context: { collect: true }
      }
    };

    it('should handle no forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should ignore json forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [ JSON_FORM_ROW ] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should ignore collect forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [ COLLECT_FORM_ROW ] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should do nothing when no forms have changed', () => {
      const formXml = '<my-xml/>';
      const currentForm = '<html/>';
      const currentModel = '<xml/>';
      sinon.stub(db.medic, 'query').resolves({ rows: [ {
        doc: { _attachments: {
          'xform.xml': { data: Buffer.from(formXml) },
          'form.html': { data: Buffer.from(currentForm) },
          'model.xml': { data: Buffer.from(currentModel) }
        } }
      } ] });
      sinon.stub(service, 'generate').resolves({ form: currentForm, model: currentModel });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should throw when not all updated successfully', done => {
      const formXml = '<my-xml/>';
      const currentForm = '<html/>';
      const newForm = '<html><title>Hello</title></html>';
      const currentModel = '<xml/>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'query').resolves({ rows: [
        {
          doc: {
            _id: 'd',
            _attachments: {
              'xform.xml': { data: Buffer.from(formXml) },
              'form.html': { data: Buffer.from(currentForm) },
              'model.xml': { data: Buffer.from(currentModel) }
            }
          }
        }
      ] });
      sinon.stub(service, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'bulkDocs').resolves([ { error: 'some error' } ]);
      service.updateAll()
        .then(() => done(new Error('expected error to be thrown')))
        .catch(err => {
          expect(err.message).to.equal('Failed to save updated xforms to the database');
          done();
        });
    });

    it('should save all updated forms', () => {
      const formXml = '<my-xml/>';
      const currentForm = '<html/>';
      const newForm = '<html><title>Hello</title></html>';
      const currentModel = '<xml/>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'query').resolves({ rows: [
        JSON_FORM_ROW,
        COLLECT_FORM_ROW,
        {
          doc: {
            _id: 'c',
            _attachments: {
              'xform.xml': { data: Buffer.from(formXml) },
              'form.html': { data: Buffer.from(currentForm) },
              'model.xml': { data: Buffer.from(currentModel) }
            }
          }
        },
        {
          doc: {
            _id: 'd',
            _attachments: {
              'xform.xml': { data: Buffer.from(formXml) },
              'form.html': { data: Buffer.from(currentForm) },
              'model.xml': { data: Buffer.from(currentModel) }
            }
          }
        }
      ] });
      sinon.stub(service, 'generate')
        .onCall(0).resolves({ form: currentForm, model: currentModel })
        .onCall(1).resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'bulkDocs').resolves([ { ok: true } ]);
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(1);
        expect(db.medic.bulkDocs.args[0][0].length).to.equal(1);
        expect(db.medic.bulkDocs.args[0][0][0]._id).to.equal('d');
        expectAttachments(db.medic.bulkDocs.args[0][0][0], newForm, newModel);
      });
    });

  });

});
