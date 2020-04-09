const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const rewire = require('rewire');
const { join } = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const childProcess = require('child_process');
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
      const spawned = {
        stdout: { on: sinon.stub() },
        stderr: { on: sinon.stub() },
        stdin: {
          setEncoding: sinon.stub(),
          write: sinon.stub(),
          end: sinon.stub()
        },
        on: sinon.stub()
      };
      sinon.stub(childProcess, 'spawn').returns(spawned);
      return setup(dirname).then(files => {
        const generate = service.__get__('generate')(files.xform);
        if (err) {
          spawned.stderr.on.args[0][1](err);
          spawned.on.args[0][1](100);
        } else {
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

    it('generates form and model', () => runTest('simple'));

    it('replaces multimedia src elements', () => runTest('multimedia'));

    it('correctly replaces models with nested "</root>" - #5971', () => runTest('nested-root'));

    it('replaces markdown elements', () => runTest('markdown'));

    it('errors if child process errors', done => {
      runTest('simple', 'some error')
        .then(() => done(new Error('expected error to be thrown')))
        .catch(err => {
          expect(err.message).to.equal(`Error transforming xml. xsltproc returned code "100", and signal "undefined"`);
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

  describe('replaceAllMarkdown', () => {

    let replaceMarkdown;
    let replaceAllMarkdown;
    let unset;

    beforeEach(() => {
      replaceMarkdown = sinon.stub();
      unset = service.__set__('replaceMarkdown', replaceMarkdown);
      replaceAllMarkdown = service.__get__('replaceAllMarkdown');
    });
    afterEach(() => unset());

    it('strips root node', () => {
      const actual = replaceAllMarkdown('<root><form></form></root>');
      expect(actual).to.equal('<form></form>');
    });

    it('leaves non-markdown labels alone', () => {
      const actual = replaceAllMarkdown('<root><form><span class="question-label">not markdown</span></form></root>');
      expect(actual).to.equal('<form><span class="question-label">not markdown</span></form>');
    });

    it('replaces questions', () => {
      replaceMarkdown.returns('def');
      const given = `
<root>
  <form>
    <span class="question-label">abc</span>
  </form>
</root>`;
      const expected = `<form>
    <span class="question-label">def</span>
  </form>`;
      expect(replaceAllMarkdown(given)).to.equal(expected);
      expect(replaceMarkdown.callCount).to.equal(1);
      expect(replaceMarkdown.args[0][0]).to.equal('abc');
    });

    it('replaces hints', () => {
      replaceMarkdown.returns('def');
      const given = `
<root>
  <form>
    <span class="or-hint">abc</span>
  </form>
</root>`;
      const expected = `<form>
    <span class="or-hint">def</span>
  </form>`;
      expect(replaceAllMarkdown(given)).to.equal(expected);
      expect(replaceMarkdown.callCount).to.equal(1);
      expect(replaceMarkdown.args[0][0]).to.equal('abc');
    });

    it('replaces all questions and hints', () => {
      replaceMarkdown.withArgs('1').returns('a');
      replaceMarkdown.withArgs('2').returns('b');
      replaceMarkdown.withArgs('3').returns('c');
      const given = `
<root>
  <form>
    <span class="question-label">1</span>
    <span class="or-hint">2</span>
    <span class="question-label">3</span>
  </form>
</root>`;
      const expected = `<form>
    <span class="question-label">a</span>
    <span class="or-hint">b</span>
    <span class="question-label">c</span>
  </form>`;
      expect(replaceAllMarkdown(given)).to.equal(expected);
      expect(replaceMarkdown.callCount).to.equal(3);
    });

  });

  describe('replaceMarkdown', () => {

    let replaceMarkdown;

    beforeEach(() => {
      replaceMarkdown = service.__get__('replaceMarkdown');
    });

    it('h1', () => {
      expect(replaceMarkdown('\n# HELLO\n')).to.equal('<h1>HELLO</h1>');
    });

    it('h2', () => {
      expect(replaceMarkdown('\n## HELLO\n')).to.equal('<h2>HELLO</h2>');
    });

    it('h3', () => {
      expect(replaceMarkdown('\n### HELLO\n')).to.equal('<h3>HELLO</h3>');
    });

    it('h4', () => {
      expect(replaceMarkdown('\n#### HELLO\n')).to.equal('<h4>HELLO</h4>');
    });

    it('h5', () => {
      expect(replaceMarkdown('\n##### HELLO\n')).to.equal('<h5>HELLO</h5>');
    });

    it('strong with underscore', () => {
      expect(replaceMarkdown('__HELLO__')).to.equal('<strong>HELLO</strong>');
    });

    it('strong with asterisk', () => {
      expect(replaceMarkdown('**HELLO**')).to.equal('<strong>HELLO</strong>');
    });

    it('em with underscore', () => {
      expect(replaceMarkdown(' _HELLO_')).to.equal(' <em>HELLO</em>');
    });

    it('em with asterisk', () => {
      expect(replaceMarkdown('*HELLO*')).to.equal('<em>HELLO</em>');
    });

    it('a', () => {
      expect(replaceMarkdown('click [here](http://google.com) to search'))
        .to.equal('click <a href="http://google.com" target="_blank" rel="noopener noreferrer">here</a> to search');
    });

    it('a with computed URL - #3349', () => {
      expect(replaceMarkdown('[Search for <output value="/notedata/name"/>](http://google.com?q=<output value="/notedata/name"/>)'))
        .to.equal('<a href="#" target="_blank" rel="noopener noreferrer" class="dynamic-url">Search for <output value="/notedata/name"/><span class="url hidden">http://google.com?q=<output value="/notedata/name"/></span></a>');
    });

    it('br', () => {
      expect(replaceMarkdown('hello\ncheck for new\nlines')).to.equal('hello<br />check for new<br />lines');
    });

    it('html tags', () => {
      expect(replaceMarkdown('hello&lt;blink&gt;<output value="name" />&lt;/blink&gt;'))
        .to.equal('hello<blink><output value="name" /></blink>');
    });

    it('ampersand', () => {
      expect(replaceMarkdown('mock &amp; test')).to.equal('mock & test');
    });

    it('double quote', () => {
      expect(replaceMarkdown('mock &quot;test&quot;')).to.equal('mock "test"');
    });

    it('single quote', () => {
      expect(replaceMarkdown('someone&#039;s test')).to.equal('someone\'s test');
    });

  });

});
