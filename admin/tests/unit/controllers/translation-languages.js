describe('Translation Languages controller', function() {

  'use strict';

  let createController;
  let scope;
  let rootScope;
  let settings;
  let db;

  beforeEach(module('adminApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    settings = sinon.stub();
    db = {
      query: sinon.stub()
    };
    createController = function() {
      return $controller('TranslationLanguagesCtrl', {
        '$scope': scope,
        'Settings': settings,
        'DB': () => db,
        'Changes': sinon.stub().returns({ unsubscribe: sinon.stub() }),
        'Modal': sinon.stub(),
        'TranslationLoader': { test: sinon.stub() },
        'UpdateSettings': sinon.stub()
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
});
