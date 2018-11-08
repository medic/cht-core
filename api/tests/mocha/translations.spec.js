const chai = require('chai'),
      sinon = require('sinon'),
      properties = require('properties'),
      db = require('../../src/db-pouch'),
      translations = require('../../src/translations');

describe('translations', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('run returns errors from get ddoc', () => {
    const dbGet = sinon.stub(db.medic, 'get').returns(Promise.reject('boom'));
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.args[0][0]).to.equal('_design/medic');
    });
  });

  it('run does nothing if no attachments', () => {
    const dbGet = sinon.stub(db.medic, 'get').resolves({});
    const dbAttachment = sinon.stub(db.medic, 'getAttachment');
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(0);
    });
  });

  it('run does nothing if no translation attachments', () => {
    const ddoc = { _attachments: [ { 'logo.png': {} } ] };
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment');
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(0);
    });
  });

  it('run returns errors from getting attachment', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').returns(Promise.reject('boom'));
    return translations.run().catch(err => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(dbAttachment.args[0][0]).to.equal('_design/medic');
      chai.expect(dbAttachment.args[0][1]).to.equal('translations/messages-en.properties');
      chai.expect(err).to.equal('boom');
    });
  });

  it('run returns errors from properties parse', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, 'boom');
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(parse.args[0][0]).to.equal('some buffer');
    });
  });

  it('run returns errors from getting backup files', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
    const dbView = sinon.stub(db.medic, 'query').returns(Promise.reject('boom'));
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
    });
  });

  it('run returns errors from getting translations files', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: { _id: 'messages-en-backup', default: { hello: 'Hello' } } } ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).returns(Promise.reject('boom'));
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbView.args[1][0]).to.equal('medic-client/doc_by_type');
      chai.expect(dbView.args[1][1].startkey[0]).to.equal('translations');
      chai.expect(dbView.args[1][1].startkey[1]).to.equal(false);
      chai.expect(dbView.args[1][1].endkey[0]).to.equal('translations');
      chai.expect(dbView.args[1][1].endkey[1]).to.equal(true);
      chai.expect(dbView.args[1][1].include_docs).to.equal(true);
    });
  });

  it('overwrites translations that have changed', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      default: { hello: 'Hello' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      default: { hello: 'Gidday' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        { // merged translations doc
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          default: { hello: 'Hello' }
        }
      ]);
    });
  });

  it('returns errors from db bulk', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      default: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      default: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').returns(Promise.reject('boom'));
    return translations.run().catch(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
    });
  });

  it('overwrites updated translations where not modified by configuration', () => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      default: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      default: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        { // merged translations doc
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          default: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        },
        { // updated backup doc
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          default: {
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
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      default: { empty: '' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      default: { empty: '' }
    } } ];
    sinon.stub(db.medic, 'get').resolves(ddoc);
    sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    sinon.stub(properties, 'parse').callsArgWith(1, null, { empty: '' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbBulk.callCount).to.equal(0);
    });
  });

  it('creates new language', () => {
    const ddoc = { _attachments: { 'translations/messages-fr.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      default: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      default: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        { // new
          _id: 'messages-fr',
          type: 'translations',
          code: 'fr',
          name: 'Français (French)',
          enabled: true,
          default: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        },
        { // updated backup doc
          _id: 'messages-fr-backup',
          type: 'translations-backup',
          code: 'fr',
          default: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ]);
    });
  });

  it('does not recreate deleted language', () => {
    const ddoc = { _attachments: {
      'translations/messages-fr.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        type: 'translations-backup',
        code: 'en',
        default: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-fr-backup',
        type: 'translations-backup',
        code: 'fr',
        default: { hello: 'Hello', bye: 'Goodbye' }
      } }
    ];
    const docs = [ { doc: {
      _id: 'messages-en',
      type: 'translations',
      code: 'en',
      default: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        { // updated backup doc
          _id: 'messages-fr-backup',
          type: 'translations-backup',
          code: 'fr',
          default: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ]);
    });
  });

  it('overwrites multiple translation files', () => {
    const ddoc = { _attachments: {
      'translations/messages-en.properties': {},
      'translations/messages-fr.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        default: { hello: 'Hello EN', bye: 'Goodbye EN' }
      } },
      { doc: {
        _id: 'messages-fr-backup',
        code: 'fr',
        type: 'translations-backup',
        default: { hello: 'Hello FR', bye: 'Goodbye FR' }
      } }
    ];
    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        default: { hello: 'Hello EN', bye: 'Goodbye EN CUSTOMISED' }
      } },
      { doc: {
        _id: 'messages-fr',
        code: 'fr',
        type: 'translations',
        default: { hello: 'Hello FR', bye: 'Goodbye FR CUSTOMISED' }
      } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: 'Hello EN UPDATED', bye: 'Goodbye EN UPDATED', added: 'EN ADDED' });
    parse.onCall(1).callsArgWith(1, null, { hello: 'Hello FR UPDATED', bye: 'Goodbye FR UPDATED', added: 'FR ADDED' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves(1);
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(2);
      chai.expect(parse.callCount).to.equal(2);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          default: {
            hello: 'Hello EN UPDATED',
            bye: 'Goodbye EN UPDATED',
            added: 'EN ADDED'
          }
        },
        {
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          default: {
            hello: 'Hello EN UPDATED',
            bye: 'Goodbye EN UPDATED',
            added: 'EN ADDED'
          }
        },
        {
          _id: 'messages-fr',
          code: 'fr',
          type: 'translations',
          default: {
            hello: 'Hello FR UPDATED',
            bye: 'Goodbye FR UPDATED',
            added: 'FR ADDED'
          }
        },
        {
          _id: 'messages-fr-backup',
          code: 'fr',
          type: 'translations-backup',
          default: {
            hello: 'Hello FR UPDATED',
            bye: 'Goodbye FR UPDATED',
            added: 'FR ADDED'
          }
        }
      ]);
    });
  });

  it('defaults null translation values to the key - #3753', () => {
    const ddoc = { _attachments: {
      'translations/messages-en.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        default: { hello: null, bye: 'Goodbye' }
      } }
    ];
    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        default: { hello: null, bye: 'Goodbye' }
      } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: null, bye: 'Goodbye' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          default: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        },
        {
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          default: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        }
      ]);
    });
  });

  it('defaults undefined translation values to the key - #3753', () => {
    const ddoc = { _attachments: {
      'translations/messages-en.properties': {},
      'translations/messages-ne.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        default: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-ne-backup',
        code: 'ne',
        type: 'translations-backup',
        default: { bye: 'Goodbye' }
      } }
    ];
    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        default: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-ne',
        code: 'ne',
        type: 'translations',
        default: { bye: 'Goodbye' }
      } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: 'Hello', bye: 'Goodbye' });
    parse.onCall(1).callsArgWith(1, null, { bye: 'Goodbye' });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(2);
      chai.expect(parse.callCount).to.equal(2);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        {
          _id: 'messages-ne',
          code: 'ne',
          type: 'translations',
          default: {
            hello: 'hello', // defaults to the translation key
            bye: 'Goodbye'
          }
        },
        {
          _id: 'messages-ne-backup',
          code: 'ne',
          type: 'translations-backup',
          default: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        }
      ]);
    });
  });

  it('converts all non-string values to string', () => {
    const ddoc = { _attachments: {
        'translations/messages-en.properties': {}
      } };
    const backups = [
      { doc: {
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          default: { hello: null, bye: 0, ciao: false, adios: 23, salut: true }
        } }
    ];
    const docs = [
      { doc: {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          default: { hello: null, bye: 0, ciao: false, adios: 23, salut: true }
        } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').resolves(ddoc);
    const dbAttachment = sinon.stub(db.medic, 'getAttachment').resolves('some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: null, bye: 0, ciao: false, adios: 23, salut: true });
    const dbView = sinon.stub(db.medic, 'query');
    dbView.onCall(0).resolves({ rows: backups });
    dbView.onCall(1).resolves({ rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
    return translations.run().then(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          default: {
            hello: 'hello',
            bye: '0',
            ciao: 'false',
            adios: '23',
            salut: 'true'
          }
        },
        {
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          default: {
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
