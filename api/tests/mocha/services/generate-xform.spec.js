const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const rewire = require('rewire');
const { join } = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const service = rewire('../../../src/services/generate-xform');

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
    let unset;

    afterEach(() => {
      if(unset) {
        unset();
      }
    });

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

    const runTest = (dirname, err) => {
      return setup(dirname).then(files => {
        if (err) {
          const transformer = { transform: () => {}};
          sinon.stub(transformer, 'transform').returns(Promise.reject(err));
          unset = service.__set__('transformer', transformer);
        }
        const generate = service.generate(files.xform);

        return generate.then(actual => {
          expect(actual.form).to.equal(files.expectedForm.trim());
          expect(actual.model).to.equal(files.expectedModel.trim());
        });
      });
    };

    it('generates form and model', () => runTest('simple'));

    it('replaces multimedia src elements', () => runTest('multimedia'));

    it('correctly handles models with nested "</root>" - #5971', () => runTest('nested-root'));

    it('replaces markdown elements', () => runTest('markdown'));

    it('errors if child process errors', done => {
      const message = 'some error';
      runTest('simple', message)
        .then(() => done(new Error('expected error to be thrown')))
        .catch(err => {
          expect(err.message).to.equal(`Error attempting to transform xml: ${message}`);
          done();
        });
    });
  });

  describe('update', () => {
    let generate;
    let unset;

    beforeEach(() => {
      generate = sinon.stub();
      unset = service.__set__('generate', generate);
    });
    afterEach(() => unset());

    it('errors if no form found', done => {
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

    it('does nothing if doc does not have form attachment', () => {
      sinon.stub(db.medic, 'get').resolves({ _attachments: { image: {} } });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.get.callCount).to.equal(1);
        expect(db.medic.put.callCount).to.equal(0);
      });
    });

    it('does nothing if the attachments are up to date', () => {
      const formXml = '<my-xml/>';
      const currentForm = '<html/>';
      const currentModel = '<xml/>';
      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        'xform.xml': { data: Buffer.from(formXml) },
        'form.html': { data: Buffer.from(currentForm) },
        'model.xml': { data: Buffer.from(currentModel) }
      } });
      generate.resolves({ form: currentForm, model: currentModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(generate.callCount).to.equal(1);
        expect(generate.args[0][0]).to.equal(formXml);
        expect(db.medic.put.callCount).to.equal(0);
      });
    });

    it('updates doc if attachments do not exist', () => {
      const formXml = '<my-xml/>';
      const newForm = '<html><title>Hello</title></html>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'get').resolves({ _attachments: {
        xml: { data: Buffer.from(formXml) }
      } });
      generate.resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
    });

    it('updates doc if attachments have changed', () => {
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
      generate.resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
    });

  });

  describe('updateAll', () => {

    let generate;
    let unset;

    beforeEach(() => {
      generate = sinon.stub();
      unset = service.__set__('generate', generate);
    });
    afterEach(() => unset());

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

    it('handles no forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('ignores json forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [ JSON_FORM_ROW ] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('ignores collect forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [ COLLECT_FORM_ROW ] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('does nothing if no forms have changed', () => {
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
      generate.resolves({ form: currentForm, model: currentModel });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('throws if not all updated successfully', done => {
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
      generate.resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'bulkDocs').resolves([ { error: 'some error' } ]);
      service.updateAll()
        .then(() => done(new Error('expected error to be thrown')))
        .catch(err => {
          expect(err.message).to.equal('Failed to save updated xforms to the database');
          done();
        });
    });

    it('saves all updated forms', () => {
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
      generate
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
