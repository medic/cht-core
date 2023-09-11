describe('Display Languages controller', function() {

  'use strict';

  let createController;
  let scope;
  let rootScope;
  let settings;
  let updateSettings;
  let db;
  let stubLanguages;

  beforeEach(module('adminApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    settings = sinon.stub();
    updateSettings = sinon.stub();
    db = {
      query: sinon.stub()
    };
    stubLanguages = sinon.stub();
    stubLanguages.returns(Promise.resolve([
      { code: 'en', name: 'English' },
      { code: 'sw', name: 'Swahili' }
    ]));

    createController = function() {
      return $controller('DisplayLanguagesCtrl', {
        '$log': { error: sinon.stub() },
        '$scope': scope,
        '$timeout': sinon.stub(),
        '$translate': sinon.stub(),
        'Settings': settings,
        'DB': () => db,
        'Changes': sinon.stub().returns({ unsubscribe: sinon.stub() }),
        'Languages': stubLanguages,
        'Modal': sinon.stub(),
        'TranslationLoader': { test: sinon.stub() },
        'UpdateSettings': updateSettings
      });
    };
  }));

  afterEach(() => sinon.restore());

  it('should not mutate the language object', async () => {
    settings.resolves({ locale: 'en', locale_outgoing: 'sw' });
    db.query.withArgs('medic-client/doc_by_type').resolves({
      rows: [
        {
          id: 'messages-en',
          doc: {
            _id: 'messages-en',
            code: 'en',
            type: 'translations',
            enabled: true,
            generic: { 'a': 'a v1', 'b': 'b v1', 'c': 'c v1' },
            custom: { 'a': 'a v2', 'c': 'c v2', 'd': 'd v1' }
          }
        },
        {
          id: 'messages-sw',
          doc: {
            _id: 'messages-sw',
            code: 'sw',
            type: 'translations',
            enabled: true,
            generic: {},
            custom: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1', 'e': 'e v1'}
          }
        },
        {
          id: 'messages-sw',
          doc: {
            _id: 'messages-sw',
            code: 'sw',
            type: 'translations',
            enabled: true,
            generic: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1' }
          }
        }
      ]
    });

    await createController();
    rootScope.$digest();
    chai.expect(scope.languagesModel.totalTranslations).to.equal(5);
    chai.expect(scope.languagesModel.locales.length).to.equal(3);
    chai.expect(scope.languagesModel.locales[0].doc).to.deep.equal({
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      enabled: true,
      generic: { 'a': 'a v1', 'b': 'b v1', 'c': 'c v1' },
      custom: { 'a': 'a v2', 'c': 'c v2', 'd': 'd v1' }
    });
    chai.expect(scope.languagesModel.locales[0].missing).to.equal(1);
    chai.expect(scope.languagesModel.locales[1].doc).to.deep.equal({
      _id: 'messages-sw',
      code: 'sw',
      type: 'translations',
      enabled: true,
      generic: {},
      custom: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1', 'e': 'e v1'}
    });
    chai.expect(scope.languagesModel.locales[1].missing).to.equal(1);
    chai.expect(scope.languagesModel.locales[2].doc).to.deep.equal({
      _id: 'messages-sw',
      code: 'sw',
      type: 'translations',
      enabled: true,
      generic: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1' }
    });
    chai.expect(scope.languagesModel.locales[2].missing).to.equal(2);
  });

  it('should disable a language', async () => {
    settings.resolves({
      locale: 'en',
      locale_outgoing: 'sw',
      languages: [
        { locale: 'en', enabled: true },
        { locale: 'sw', enabled: true },
      ],
    });
    db.query.withArgs('medic-client/doc_by_type').resolves({
      rows: [
        {
          id: 'messages-en',
          doc: {
            _id: 'messages-en',
            code: 'en',
            type: 'translations',
            enabled: true,
            generic: { 'a': 'a v1', 'b': 'b v1', 'c': 'c v1' },
            custom: { 'a': 'a v2', 'c': 'c v2', 'd': 'd v1' }
          }
        },
        {
          id: 'messages-sw',
          doc: {
            _id: 'messages-sw',
            code: 'sw',
            type: 'translations',
            enabled: true,
            generic: {},
            custom: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1', 'e': 'e v1'}
          }
        },
      ]
    });

    await createController();
    rootScope.$digest();
    const englishLanguage = scope.languagesModel.locales.find(locale => locale.doc.code === 'en');
    chai.expect(englishLanguage.doc.code).to.equal('en');
    chai.expect(englishLanguage.enabled).to.eq(true);
    await scope.disableLanguage(englishLanguage.doc);

    chai.expect(updateSettings.called).to.be.true;
    chai.expect(updateSettings.getCall(0).args[0].languages).to.deep.include({ locale: 'en', enabled: false });
  });

  it('should enable languages', async () => {
    settings.resolves({
      locale: 'en',
      locale_outgoing: 'sw',
      languages: [
        { locale: 'en', enabled: true },
        { locale: 'sw', enabled: false },
      ],
    });
    db.query.withArgs('medic-client/doc_by_type').resolves({
      rows: [
        {
          id: 'messages-en',
          doc: {
            _id: 'messages-en',
            code: 'en',
            type: 'translations',
            enabled: true,
            generic: { 'a': 'a v1', 'b': 'b v1', 'c': 'c v1' },
            custom: { 'a': 'a v2', 'c': 'c v2', 'd': 'd v1' }
          }
        },
        {
          id: 'messages-sw',
          doc: {
            _id: 'messages-sw',
            code: 'sw',
            type: 'translations',
            enabled: true,
            generic: {},
            custom: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1', 'e': 'e v1'}
          }
        },
        {
          id: 'messages-ne',
          doc: {
            _id: 'messages-ne',
            code: 'ne',
            type: 'translations',
            enabled: true,
            generic: {},
            custom: { 'a': 'a v1', 'c': 'c v1', 'b': 'b v1', 'e': 'e v1'}
          }
        },
      ]
    });

    await createController();
    // enable swahili
    rootScope.$digest();
    const swahiliLanguage = scope.languagesModel.locales.find(locale => locale.doc.code === 'sw');
    chai.expect(swahiliLanguage.doc.code).to.equal('sw');
    chai.expect(swahiliLanguage.enabled).to.equal(false);
    await scope.enableLanguage(swahiliLanguage.doc);

    chai.expect(updateSettings.called).to.be.true;
    chai.expect(updateSettings.getCall(0).args[0].languages).to.deep.include({ locale: 'sw', enabled: true });

    // enable nepali
    rootScope.$digest();
    const nepaliLanguage = scope.languagesModel.locales.find(locale => locale.doc.code === 'ne');
    chai.expect(nepaliLanguage.doc.code).to.equal('ne');
    chai.expect(nepaliLanguage.enabled).to.equal(false);
    await scope.enableLanguage(nepaliLanguage.doc);

    chai.expect(updateSettings.called).to.be.true;
    chai.expect(updateSettings.getCall(0).args[0].languages).to.deep.include({ locale: 'ne', enabled: true });
  });
});
