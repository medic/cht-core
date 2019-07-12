const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const { join } = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const service = require('../../../src/services/generate-xform');
const FILES = {
  xform: 'xform.xml',
  form: 'form.html',
  model: 'model.xml'
};

afterEach(() => sinon.restore());

describe('generate-xform service', () => {

  describe('generate', () => {
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

    const runTest = dirname => {
      return setup(dirname).then(given => {
        return service._generate(given.xform).then(actual => {
          expect(actual.form).to.equal(given.form);
          expect(actual.model).to.equal(given.model);
        });
      });
    };

    it('generates form and model', () => runTest('simple'));
    it('replaces multimedia src elements', () => runTest('multimedia'));
  });

  describe('update', () => {

    const expectAttachments = (doc, form, model) => {
      const formAttachment = doc._attachments['form.html'];
      expect(formAttachment.data.toString()).to.equal(form);
      expect(formAttachment.content_type).to.equal('text/html');
      const modelAttachment = doc._attachments['model.xml'];
      expect(modelAttachment.data.toString()).to.equal(model);
      expect(modelAttachment.content_type).to.equal('text/xml');
    };

    it('errors if no form found', done => {
      sinon.stub(db.medic, 'get').rejects('boom');
      service.update('form:missing')
        .then(() => done(new Error('expected error to be thrown')))
        .catch(() => {
          expect(db.medic.get.callCount).to.equal(1);
          expect(db.medic.get.args[0][0]).to.equal('form:missing');
          done();
        });
    });

    it('errors if doc does not have form attachment', done => {
      sinon.stub(db.medic, 'get').resolves({ _attachments: { image: {} } });
      service.update('form:exists')
        .then(() => done(new Error('expected error to be thrown')))
        .catch(() => {
          expect(db.medic.get.callCount).to.equal(1);
          done();
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
      sinon.stub(service, '_generate').resolves({ form: currentForm, model: currentModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(service._generate.callCount).to.equal(1);
        expect(service._generate.args[0][0]).to.equal(formXml);
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
      sinon.stub(service, '_generate').resolves({ form: newForm, model: newModel });
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
      sinon.stub(service, '_generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(db.medic.put.callCount).to.equal(1);
        expectAttachments(db.medic.put.args[0][0], newForm, newModel);
      });
    });

  });

});
