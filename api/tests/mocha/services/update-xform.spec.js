const sinon = require('sinon');
const { expect } = require('chai');
const db = require('../../../src/db');
const service = require('../../../src/services/update-xform');
const generatexFormService = require('../../../src/services/generate-xform');

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
          'xform.xml': { data: Buffer.from(formXml) },
          'form.html': { data: Buffer.from(currentForm) },
          'model.xml': { data: Buffer.from(currentModel) }
        }
      });
      sinon.stub(generatexFormService, 'generate').resolves({ form: currentForm, model: currentModel });
      sinon.stub(db.medic, 'put');
      return service.update('form:exists').then(() => {
        expect(generatexFormService.generate.callCount).to.equal(1);
        expect(generatexFormService.generate.args[0][0]).to.equal(formXml);
        expect(db.medic.put.callCount).to.equal(0);
      });
    });

    it('should update doc when attachments do not exist', () => {
      const formXml = '<my-xml/>';
      const newForm = '<html><title>Hello</title></html>';
      const newModel = '<instance><multimedia/></instance>';
      sinon.stub(db.medic, 'get').resolves({
        _attachments: {
          xml: { data: Buffer.from(formXml) }
        }
      });
      sinon.stub(generatexFormService, 'generate').resolves({ form: newForm, model: newModel });
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
      sinon.stub(db.medic, 'get').resolves({
        _attachments: {
          'xform.xml': { data: Buffer.from(formXml) },
          'form.html': { data: Buffer.from(currentForm) },
          'model.xml': { data: Buffer.from(currentModel) }
        }
      });
      sinon.stub(generatexFormService, 'generate').resolves({ form: newForm, model: newModel });
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
      sinon.stub(db.medic, 'query').resolves({ rows: [JSON_FORM_ROW] });
      sinon.stub(db.medic, 'bulkDocs');
      return service.updateAll().then(() => {
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should ignore collect forms', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [COLLECT_FORM_ROW] });
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
      sinon.stub(db.medic, 'query').resolves({
        rows: [{
          doc: {
            _attachments: {
              'xform.xml': { data: Buffer.from(formXml) },
              'form.html': { data: Buffer.from(currentForm) },
              'model.xml': { data: Buffer.from(currentModel) }
            }
          }
        }]
      });
      sinon.stub(generatexFormService, 'generate').resolves({ form: currentForm, model: currentModel });
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
      sinon.stub(db.medic, 'query').resolves({
        rows: [
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
        ]
      });
      sinon.stub(generatexFormService, 'generate').resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'bulkDocs').resolves([{ error: 'some error' }]);
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
      sinon.stub(db.medic, 'query').resolves({
        rows: [
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
        ]
      });
      sinon.stub(generatexFormService, 'generate')
        .onCall(0).resolves({ form: currentForm, model: currentModel })
        .onCall(1).resolves({ form: newForm, model: newModel });
      sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }]);
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
