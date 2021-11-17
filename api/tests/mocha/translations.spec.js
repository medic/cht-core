const chai = require('chai');
const sinon = require('sinon');
const properties = require('properties');
const fs = require('fs');
const rewire = require('rewire');

const db = require('../../src/db');
const environment = require('../../src/environment');

let translations;

describe('translations', () => {
  beforeEach(() => {
    sinon.stub(fs, 'readdir');
    sinon.stub(fs, 'readFile');
    sinon.stub(properties, 'parse');
    sinon.stub(environment, 'resourcesPath').value('/path/to/resources/');
    translations = rewire('../../src/translations');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('run returns errors from reading files', () => {
    fs.readdir.callsArgWith(1, { some: 'error' });
    return translations.run().catch(err => {
      chai.expect(err).to.deep.equal({ some: 'error' });
    });
  });

  it('run does nothing if no files', () => {
    fs.readdir.callsArgWith(1, null, []);

    return translations.run().then(() => {
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(0);
    });
  });

  it('run does nothing if no translation files', () => {
    fs.readdir.callsArgWith(1, null, ['logo.png']);
    return translations.run().then(() => {
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(0);
    });
  });

  it('run returns errors from reading file', () => {
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, { error: 'omg' });
    return translations.run().catch(err => {
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readdir.args[0][0]).to.equal('/path/to/resources/translations');
      chai.expect(fs.readFile.callCount).to.equal(1);
      chai.expect(fs.readFile.args[0][0]).to.equal('/path/to/resources/translations/messages-en.properties');
      chai.expect(fs.readFile.args[0][1]).to.equal('utf8');
      chai.expect(err).to.deep.equal({ error: 'omg' });
    });
  });

  it('run returns errors from properties parse', () => {
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');
    properties.parse.callsArgWith(1, 'boom');
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(properties.parse.args[0][0]).to.equal('some buffer');
    });
  });

  it('run returns errors from getting translation docs', () => {
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');
    properties.parse.callsArgWith(1, null, { first: '1st' });
    sinon.stub(db.medic, 'allDocs').rejects('boom');
    return translations.run().catch(err => {
      chai.expect(err.name).to.equal('boom');
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
      chai.expect(properties.parse.callCount).to.equal(1);
      chai.expect(db.medic.allDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
    });
  });

  it('overwrites updated translations where not modified by configuration', () => {
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
    fs.readdir.callsArgWith(1, null, ['messages-fr.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
    fs.readdir.callsArgWith(1, null, ['messages-fr.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties', 'messages-fr.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(2);
      chai.expect(fs.readFile.args[0][0]).to.equal('/path/to/resources/translations/messages-en.properties');
      chai.expect(fs.readFile.args[1][0]).to.equal('/path/to/resources/translations/messages-fr.properties');
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties', 'messages-ne.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(2);
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
    fs.readdir.callsArgWith(1, null, ['messages-en.properties']);
    fs.readFile.callsArgWith(2, null, 'some buffer');

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
      chai.expect(fs.readdir.callCount).to.equal(1);
      chai.expect(fs.readFile.callCount).to.equal(1);
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
});
