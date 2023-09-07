describe('EditTranslationCtrl controller', function() {

  'use strict';

  let createController;
  let rootScope;
  let scope;
  let uibModalInstance;
  let bulkDocs;
  let model;

  beforeEach(module('adminApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    uibModalInstance = sinon.stub();
    bulkDocs = sinon.stub();
    model = {};
    createController = function() {
      scope.model = model;
      scope.setProcessing = sinon.stub();
      scope.setFinished = sinon.stub();
      scope.setError = sinon.stub();
      return $controller('EditTranslationCtrl', {
        '$scope': scope,
        '$uibModalInstance': uibModalInstance,
        'DB': sinon.stub().returns({ bulkDocs }),
      });
    };
  }));

  it('render', function() {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', generic: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', generic: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } }
      ]
    };
    createController();
    chai.expect(scope.model.key).to.equal('title.key');
    chai.expect(scope.editing).to.equal(true);
    chai.expect(scope.model.locales).to.deep.equal([
      { code: 'en', generic: { 'title.key': 'Welcome', 'bye': 'Goodbye' } },
      { code: 'fr', generic: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } }
    ]);
    chai.expect(scope.model.values).to.deep.equal({ en: 'Welcome', fr: 'Bonjour' });
  });

  it('render new', function() {
    model = {
      locales: [
        { doc: { code: 'en', generic: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', generic: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } }
      ]
    };
    createController();
    chai.expect(scope.model.key).to.equal(undefined);
    chai.expect(scope.editing).to.equal(false);
    chai.expect(scope.model.locales).to.deep.equal([
      { code: 'en', generic: { 'title.key': 'Welcome', 'bye': 'Goodbye' } },
      { code: 'fr', generic: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } }
    ]);
    chai.expect(scope.model.values).to.deep.equal({ en: null, fr: null });
  });

  it('save', function(done) {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', generic: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', generic: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } },
        { doc: { code: 'es', generic: { 'title.key': 'Hola', 'bye': 'Hasta luego' } } }
      ]
    };
    bulkDocs.returns(Promise.resolve());
    createController();
    scope.model.values.en = 'Hello';
    scope.model.values.fr = 'Bienvenue';
    scope.model.values.es = 'Hola';
    scope.submit();
    setTimeout(function() {
      rootScope.$digest();
      const updated = bulkDocs.args[0][0];
      chai.expect(updated.length).to.equal(2); // spanish not saved as not updated
      chai.expect(updated[0].code).to.equal('en');
      chai.expect(updated[0].custom['title.key']).to.equal('Hello');
      chai.expect(updated[1].code).to.equal('fr');
      chai.expect(updated[1].custom['title.key']).to.equal('Bienvenue');
      done();
    });
  });

  it('save custom', function(done) {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', custom: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', custom: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } },
        { doc: { code: 'es', custom: { 'title.key': '', 'bye': 'Hasta luego' } } }
      ]
    };
    bulkDocs.returns(Promise.resolve());
    createController();
    scope.model.values.en = 'Hello';
    scope.model.values.fr = 'Bienvenue';
    scope.model.values.es = 'Hola';
    scope.submit();
    setTimeout(function() {
      rootScope.$digest();
      const updated = bulkDocs.args[0][0];
      chai.expect(updated.length).to.equal(3);
      chai.expect(updated[0].code).to.equal('en');
      chai.expect(updated[0].custom['title.key']).to.equal('Hello');
      chai.expect(updated[1].code).to.equal('fr');
      chai.expect(updated[1].custom['title.key']).to.equal('Bienvenue');
      chai.expect(updated[2].code).to.equal('es');
      chai.expect(updated[2].custom['title.key']).to.equal('Hola');
      done();
    });
  });

  it('save new', function(done) {
    model = {
      locales: [
        { doc: { code: 'en', newValue: 'a', generic: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', newValue: 'b', generic: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } },
        { doc: { code: 'es', newValue: '', generic: { 'title.key': 'Hola', 'bye': 'Hasta luego' } } }
      ]
    };
    bulkDocs.returns(Promise.resolve());
    createController();
    scope.model.key = 'somethingelse';
    scope.model.values.en = 'a';
    scope.model.values.fr = 'b';
    scope.submit();
    setTimeout(function() {
      rootScope.$digest();
      const updated = bulkDocs.args[0][0];
      chai.expect(updated.length).to.equal(3);
      chai.expect(updated[0].code).to.equal('en');
      chai.expect(updated[0].custom.somethingelse).to.equal('a');
      chai.expect(updated[1].code).to.equal('fr');
      chai.expect(updated[1].custom.somethingelse).to.equal('b');
      chai.expect(updated[2].code).to.equal('es');
      chai.expect(updated[2].custom.somethingelse).to.equal(null);
      done();
    });
  });
});
