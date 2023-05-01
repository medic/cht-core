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

  it('should not mutate the language object', (done) => {
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

    createController();
    setTimeout(() => {
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
      done();
    });
  });

  it('should disable a language', (done) => {
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

    createController();
    setTimeout(() => {
      rootScope.$digest();
      const englishLanguageDoc = scope.languagesModel.locales[0].doc;
      chai.expect(scope.languagesModel.locales[0].doc).to.deep.include({ code: 'en', enabled: true });
      scope.disableLanguage(englishLanguageDoc);

      setTimeout(() => {
        chai.expect(updateSettings.called).to.be.true;
        chai.expect(updateSettings.getCall(0).args[0].languages).to.deep.include({ locale: 'en', enabled: false });
        done();
      });
    });
  });
});
