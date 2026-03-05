const sinon = require('sinon');
const chai = require('chai');
const { DOC_TYPES } = require('@medic/constants');

const db = require('../../../src/db');
const settingsService = require('../../../src/services/settings');
const translations = require('../../../src/translations');
const migration = require('../../../src/migrations/remove-enabled-from-translation-docs');

describe('remove-enabled-from-translation-docs migration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should have basic properties', () => {
    chai.expect(migration.name).to.equal('remove-enabled-from-translation-docs');
    // Compare date in a timezone-agnostic way
    const expectedCreationDate = new Date(2025, 8, 1).toDateString();
    chai.expect(migration.created).to.exist;
    chai.expect(migration.created.toDateString()).to.equal(expectedCreationDate);
    chai.expect(migration.run).to.be.a('function');
  });

  it('should only remove enabled labels when settings already define languages', async () => {
    sinon.stub(settingsService, 'get').resolves({ languages: [ { locale: 'en', enabled: true } ] });
    sinon.stub(settingsService, 'update');
    const docs = [
      { _id: 'messages-en', type: DOC_TYPES.TRANSLATIONS, code: 'en', name: 'English', enabled: true },
      { _id: 'messages-es', type: DOC_TYPES.TRANSLATIONS, code: 'es', name: 'Español', enabled: false },
      // undefined => treated as disabled
      { _id: 'messages-fr', type: DOC_TYPES.TRANSLATIONS, code: 'fr', name: 'Français' },
    ];
    sinon.stub(translations, 'getTranslationDocs').resolves(docs);
    sinon.stub(db.medic, 'bulkDocs');

    await migration.run();

    chai.expect(settingsService.get.callCount).to.equal(1);
    chai.expect(settingsService.update.callCount).to.equal(0);
    chai.expect(translations.getTranslationDocs.callCount).to.equal(1);
    chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
    chai.expect(db.medic.bulkDocs.firstCall.args[0]).to.deep.equal( [
      { _id: 'messages-en', type: DOC_TYPES.TRANSLATIONS, code: 'en', name: 'English' },
      { _id: 'messages-es', type: DOC_TYPES.TRANSLATIONS, code: 'es', name: 'Español' },
      // undefined => treated as disabled
      { _id: 'messages-fr', type: DOC_TYPES.TRANSLATIONS, code: 'fr', name: 'Français' },
    ]);
  });

  it('should move enabled flags from translation docs into settings and remove from docs', async () => {
    // Arrange settings with no languages configured
    sinon.stub(settingsService, 'get').resolves({});

    const docs = [
      { _id: 'messages-en', type: DOC_TYPES.TRANSLATIONS, code: 'en', name: 'English', enabled: true },
      { _id: 'messages-es', type: DOC_TYPES.TRANSLATIONS, code: 'es', name: 'Español', enabled: false },
      // undefined => treated as disabled
      { _id: 'messages-fr', type: DOC_TYPES.TRANSLATIONS, code: 'fr', name: 'Français' },
    ];

    // Stub modules used by migration
    sinon.stub(translations, 'getTranslationDocs').resolves(docs.map(d => ({ ...d })));

    sinon.stub(settingsService, 'update').resolves();
    sinon.stub(db.medic, 'bulkDocs').resolves();

    await migration.run();

    const expectedLanguages = [
      { locale: 'en', enabled: true },
      { locale: 'es', enabled: false },
      { locale: 'fr', enabled: false },
    ];
    chai.expect(settingsService.update.callCount).to.equal(1);
    chai.expect(settingsService.update.firstCall.args[0]).to.deep.equal({ languages: expectedLanguages });

    // Assert enabled removed from docs and bulk saved
    chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
    const savedDocs = db.medic.bulkDocs.firstCall.args[0];
    chai.expect(savedDocs).to.have.length(3);
    savedDocs.forEach((saved, idx) => {
      const original = docs[idx];
      chai.expect(saved._id).to.equal(original._id);
      chai.expect(saved.code).to.equal(original.code);
      chai.expect(saved).to.not.have.property('enabled');
    });
  });

  it('should propagate errors from settings update', async () => {
    sinon.stub(settingsService, 'get').resolves({});
    sinon.stub(translations, 'getTranslationDocs').resolves([
      { _id: 'messages-en', type: DOC_TYPES.TRANSLATIONS, code: 'en', name: 'English', enabled: true },
    ]);

    const updateError = new Error('update failed');
    sinon.stub(settingsService, 'update').rejects(updateError);

    try {
      await migration.run();
      chai.assert.fail('should have thrown');
    } catch (err) {
      chai.expect(err).to.equal(updateError);
    }
  });
});
