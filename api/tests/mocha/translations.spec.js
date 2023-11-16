const chai = require('chai');
const sinon = require('sinon');
const properties = require('properties');
const fs = require('fs');
const rewire = require('rewire');

const db = require('../../src/db');
const settings = require('../../src/services/settings');
const environment = require('../../src/environment');

let translations;

describe('translations', () => {
  beforeEach(() => {
    sinon.stub(fs.promises, 'readdir');
    sinon.stub(fs.promises, 'readFile');
    sinon.stub(properties, 'parse');
    sinon.stub(environment, 'resourcesPath').value('/path/to/resources/');
    translations = rewire('../../src/translations');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('run returns errors from reading files', () => {
    fs.promises.readdir.rejects({ some: 'error' });
    return translations.run().catch(err => {
      chai.expect(err).to.deep.equal({ some: 'error' });
    });
  });

  it('run does nothing if no files', () => {
    fs.promises.readdir.resolves([]);

    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(0);
    });
  });

  it('run does nothing if no translation files', () => {
    fs.promises.readdir.resolves(['logo.png']);
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(0);
    });
  });

  it('run returns errors from reading file', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.rejects({ error: 'omg' });
    return translations.run().catch(err => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readdir.args[0][0]).to.equal('/path/to/resources/translations');
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.args[0][0]).to.equal('/path/to/resources/translations/messages-en.properties');
      chai.expect(fs.promises.readFile.args[0][1]).to.equal('utf8');
      chai.expect(err).to.deep.equal({ error: 'omg' });
    });
  });

  it('run returns errors from properties parse', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');
    properties.parse.callsArgWith(1, 'boom');
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(properties.parse.args[0][0]).to.equal('some buffer');
    });
  });

  it('run returns errors from getting translation docs', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');
    properties.parse.callsArgWith(1, null, { first: '1st' });
    sinon.stub(db.medic, 'allDocs').rejects('boom');
    return translations.run().catch(err => {
      chai.expect(err.name).to.equal('boom');
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
        startkey: 'messages-',
        endkey: 'messages-\ufff0',
        include_docs: true,
      }]);
    });
  });

  it('overwrites translations that have changed', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      generic: { hello: 'Gidday' }
    } } ];

    properties.parse.callsArgWith(1, null, { hello: 'Hello' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        { // merged translations doc
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: { hello: 'Hello' }
        }
      ]);
    });
  });

  it('returns errors from db bulk', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      generic: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    properties.parse.callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').rejects('boom');
    return translations.run().catch(err => {
      chai.expect(err.name).to.equal('boom');
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
    });
  });

  it('overwrites updated translations where not modified by configuration', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      generic: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];

    properties.parse.callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        { // merged translations doc
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ]);
    });
  });

  it('do not update if existing and attached translation is empty', () => {
    // this is a special case broken by checking falsey
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      generic: { empty: '' }
    } } ];
    properties.parse.callsArgWith(1, null, { empty: '' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
    });
  });

  it('creates new language', () => {
    fs.promises.readdir.resolves(['messages-fr.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      generic: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];

    properties.parse.callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        { // new
          _id: 'messages-fr',
          type: 'translations',
          code: 'fr',
          name: 'Français (French)',
          enabled: true,
          generic: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ]);
    });
  });

  it('does not recreate deleted language', () => {
    fs.promises.readdir.resolves(['messages-fr.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [ { doc: {
      _id: 'messages-en',
      type: 'translations',
      code: 'en',
      generic: { hello: 'Hello', bye: 'Goodbye' }
    } } ];

    properties.parse.callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        {
          _id: 'messages-fr',
          code: 'fr',
          type: 'translations',
          generic: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          },
          name: 'Français (French)',
          enabled: true
        }
      ]);
    });
  });

  it('overwrites multiple translation files', () => {
    fs.promises.readdir.resolves(['messages-en.properties', 'messages-fr.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        generic: { hello: 'Hello EN', bye: 'Goodbye EN CUSTOMISED' }
      } },
      { doc: {
        _id: 'messages-fr',
        code: 'fr',
        type: 'translations',
        generic: { hello: 'Hello FR', bye: 'Goodbye FR CUSTOMISED' }
      } }
    ];

    properties.parse
      .onCall(0)
      .callsArgWith(1, null, { hello: 'Hello EN UPDATED', bye: 'Goodbye EN UPDATED', added: 'EN ADDED' });
    properties.parse
      .onCall(1)
      .callsArgWith(1, null, { hello: 'Hello FR UPDATED', bye: 'Goodbye FR UPDATED', added: 'FR ADDED' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves(1);
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(2);
      chai.expect(fs.promises.readFile.args[0][0]).to.equal('/path/to/resources/translations/messages-en.properties');
      chai.expect(fs.promises.readFile.args[1][0]).to.equal('/path/to/resources/translations/messages-fr.properties');
      chai.expect(properties.parse.callCount).to.equal(2);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: {
            hello: 'Hello EN UPDATED',
            bye: 'Goodbye EN UPDATED',
            added: 'EN ADDED'
          }
        },
        {
          _id: 'messages-fr',
          code: 'fr',
          type: 'translations',
          generic: {
            hello: 'Hello FR UPDATED',
            bye: 'Goodbye FR UPDATED',
            added: 'FR ADDED'
          }
        }
      ]);
    });
  });

  it('defaults null translation values to the key - #3753', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        generic: { hello: null, bye: 'Goodbye' }
      } }
    ];

    properties.parse.callsArgWith(1, null, { hello: null, bye: 'Goodbye' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        }
      ]);
    });
  });

  it('defaults undefined translation values to the key - #3753', () => {
    fs.promises.readdir.resolves(['messages-en.properties', 'messages-ne.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        generic: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-ne',
        code: 'ne',
        type: 'translations',
        generic: { bye: 'Goodbye' }
      } }
    ];

    properties.parse.onCall(0).callsArgWith(1, null, { hello: 'Hello', bye: 'Goodbye' });
    properties.parse.onCall(1).callsArgWith(1, null, { bye: 'Goodbye' });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(2);
      chai.expect(properties.parse.callCount).to.equal(2);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        {
          _id: 'messages-ne',
          code: 'ne',
          type: 'translations',
          generic: {
            hello: 'hello', // defaults to the translation key
            bye: 'Goodbye'
          }
        }
      ]);
    });
  });

  it('converts all non-string values to string', () => {
    fs.promises.readdir.resolves(['messages-en.properties']);
    fs.promises.readFile.resolves('some buffer');

    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        generic: { hello: null, bye: 0, ciao: false, adios: 23, salut: true }
      } }
    ];

    properties.parse.callsArgWith(1, null, { hello: null, bye: 0, ciao: false, adios: 23, salut: true });
    sinon.stub(db.medic, 'allDocs').resolves({ rows: docs });
    sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(fs.promises.readdir.callCount).to.equal(1);
      chai.expect(fs.promises.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: {
            hello: 'hello',
            bye: '0',
            ciao: 'false',
            adios: '23',
            salut: 'true'
          }
        }
      ]);
    });
  });

  describe('getEnabledLocales', () => {
    it('should only return enabled translation docs', () => {
      it('should return all translation docs', () => {
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [
            { doc: { _id: 'messages-en', enabled: true } },
            { doc: { _id: 'messages-fr', enabled: false } },
            { doc: { _id: 'messages-es', enabled: true } },
          ],
        });
        return translations.getTranslationDocs().then(results => {
          chai.expect(results).to.deep.equal([
            { _id: 'messages-en', enabled: true },
            { _id: 'messages-es', enabled: true }
          ]);

          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([
            { startkey: 'messages-', endkey: `messages-\ufff0`, include_docs: true }
          ]);
        });
      });
    });

    describe('with new "languages" setting', () => {
      it('should only return translation docs enabled in "languages" setting', async () => {
        sinon.stub(settings, 'get').resolves({
          languages: [
            { locale: 'en', enabled: true },
            { locale: 'fr', enabled: true },
            { locale: 'es', enabled: false },
          ],
        });
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [
            { doc: { _id: 'messages-en', type: 'translations', code: 'en', generic: {}, enabled: true } },
            { doc: { _id: 'messages-fr', type: 'translations', code: 'fr', generic: {}, enabled: false } },
            { doc: { _id: 'messages-es', type: 'translations', code: 'es', generic: {}, enabled: true } },
          ],
        });
        const enabledLocales = await translations.getEnabledLocales();
        chai.expect(enabledLocales).to.deep.equal([
          { _id: 'messages-en', type: 'translations', code: 'en', generic: {}, enabled: true },
          { _id: 'messages-fr', type: 'translations', code: 'fr', generic: {}, enabled: false },
        ]);
      });
    });

    describe('without new "languages" setting', () => {
      it('should only return translation docs enabled in translation doc', async () => {
        sinon.stub(settings, 'get').resolves({});
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [
            { doc: { _id: 'messages-en', type: 'translations', code: 'en', generic: {}, enabled: true } },
            { doc: { _id: 'messages-fr', type: 'translations', code: 'fr', generic: {}, enabled: false } },
            { doc: { _id: 'messages-es', type: 'translations', code: 'es', generic: {}, enabled: true } },
          ],
        });
        const enabledLocales = await translations.getEnabledLocales();
        chai.expect(enabledLocales).to.deep.equal([
          { _id: 'messages-en', type: 'translations', code: 'en', generic: {}, enabled: true },
          { _id: 'messages-es', type: 'translations', code: 'es', generic: {}, enabled: true },
        ]);
      });
    });
  });
});
