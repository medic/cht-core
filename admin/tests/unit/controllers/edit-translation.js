describe('EditTranslationCtrl controller', function() {

  'use strict';

  var createController,
      rootScope,
      scope,
      translateFilter,
      Settings,
      uibModalInstance,
      UpdateSettings,
      bulkDocs,
      model;

  beforeEach(module('adminApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    translateFilter = sinon.stub();
    uibModalInstance = sinon.stub();
    Settings = sinon.stub();
    UpdateSettings = sinon.stub();
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
        'DB': function() { return { bulkDocs: bulkDocs }; }
      });
    };
  }));

  it('render', function() {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } }
      ]
    };
    createController();
    chai.expect(scope.model.key).to.equal('title.key');
    chai.expect(scope.editing).to.equal(true);
    chai.expect(scope.model.locales).to.deep.equal([
      { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } },
      { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } }
    ]);
    chai.expect(scope.model.values).to.deep.equal({ en: 'Welcome', fr: 'Bonjour' });
  });

  it('render new', function() {
    model = {
      locales: [
        { doc: { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } }
      ]
    };
    createController();
    chai.expect(scope.model.key).to.equal(undefined);
    chai.expect(scope.editing).to.equal(false);
    chai.expect(scope.model.locales).to.deep.equal([
      { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } },
      { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } }
    ]);
    chai.expect(scope.model.values).to.deep.equal({ en: null, fr: null });
  });

  it('save', function(done) {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } },
        { doc: { code: 'es', values: { 'title.key': 'Hola', 'bye': 'Hasta luego' } } }
      ]
    };
    bulkDocs.returns(Promise.resolve());
    createController();
    scope.model.values.en = 'Hello';
    scope.model.values.fr = 'Bienvenue';
    scope.submit();
    setTimeout(function() {
      rootScope.$digest();
      var updated = bulkDocs.args[0][0];
      chai.expect(updated.length).to.equal(2); // spanish not saved as not updated
      chai.expect(updated[0].code).to.equal('en');
      chai.expect(updated[0].values['title.key']).to.equal('Hello');
      chai.expect(updated[0].values.bye).to.equal('Goodbye');
      chai.expect(updated[1].code).to.equal('fr');
      chai.expect(updated[1].values['title.key']).to.equal('Bienvenue');
      chai.expect(updated[1].values.bye).to.equal('Au revoir');
      done();
    });
  });

  it('save new', function(done) {
    model = {
      locales: [
        { doc: { code: 'en', newValue: 'a', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', newValue: 'b', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } },
        { doc: { code: 'es', newValue: '', values: { 'title.key': 'Hola', 'bye': 'Hasta luego' } } }
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
      var updated = bulkDocs.args[0][0];
      chai.expect(updated.length).to.equal(3);
      chai.expect(updated[0].code).to.equal('en');
      chai.expect(updated[0].values.somethingelse).to.equal('a');
      chai.expect(updated[1].code).to.equal('fr');
      chai.expect(updated[1].values.somethingelse).to.equal('b');
      chai.expect(updated[2].code).to.equal('es');
      chai.expect(updated[2].values.somethingelse).to.equal(null);
      done();
    });
  });
});
